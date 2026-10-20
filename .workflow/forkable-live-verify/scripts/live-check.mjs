import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { loadOwner } from "../../../scripts/owner.mjs";
import { countPdfPages } from "../../../scripts/cv-pdf.mjs";
import { normalizeComparisonRequest, validateComparisonResult } from "../../../site/assets/comparison-contract.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function readSseTypes(text) {
  const types = [];
  let answer = "";
  for (const block of text.replace(/\r\n/g, "\n").split("\n\n").filter((part) => part.trim())) {
    const lines = block.split("\n");
    const type = lines.find((line) => line.startsWith("event: "))?.slice(7);
    assert.ok(["response.output_text.delta", "response.completed"].includes(type), `Unexpected SSE type: ${type}`);
    const data = JSON.parse(lines.filter((line) => line.startsWith("data: ")).map((line) => line.slice(6)).join("\n"));
    assert.equal(data.type, type, "SSE event/data type mismatch");
    const delta = type === "response.output_text.delta";
    assert.deepEqual(Object.keys(data).sort(), delta ? ["delta", "type"] : ["type"], "Unexpected SSE fields");
    if (delta) { assert.equal(typeof data.delta, "string"); answer += data.delta; }
    types.push(type);
  }
  assert.equal(types.at(-1), "response.completed", "Final SSE completion is required");
  assert.equal(types.filter((type) => type === "response.completed").length, 1, "Exactly one completion is required");
  assert.ok(answer.trim(), "Non-empty SSE answer is required");
  return { types, answerLength: answer.trim().length };
}

async function main() {
  const { values } = parseArgs({ options: { "get-only": { type: "boolean" }, out: { type: "string" } } });
  assert.ok(values.out, "--out <receipt> is required");
  const { owner } = await loadOwner({ deploy: true });
  const origin = owner.site.origin;
  const base = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const lines = [`Command: live-check ${values["get-only"] ? "--get-only" : "full"}`, `Created: ${new Date().toISOString()}`, `Base: ${base}`, "Inputs: local build/site and live HTTP responses", "Status: complete", "", `Target: ${origin}`, ""];
  const requests = [];
  const request = async (path, body) => {
    const method = body ? "POST" : "GET";
    requests.push(`${method} ${path}`);
    const response = await fetch(new URL(path, origin), {
      method, redirect: "error", signal: AbortSignal.timeout(180_000),
      headers: body ? { "content-type": "application/json", Origin: origin } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    lines.push(`${method} ${path}: ${response.status}`);
    return response;
  };
  try {
    for (const path of ["llms.txt", "cv.md", "sitemap.xml", "AGENTS.md"]) {
      const response = await request(`/${path}`);
      assert.equal(response.status, 200, path);
      const live = sha(Buffer.from(await response.arrayBuffer()));
      const local = sha(await readFile(resolve(root, "build/site", path)));
      lines.push(`/${path}: live sha256 ${live} == build/site sha256 ${local}`);
      assert.equal(live, local, `${path} checksum`);
    }
    const pdfPath = `${owner.slug}-cv.pdf`;
    const pdf = await request(`/${pdfPath}`);
    assert.equal(pdf.status, 200, "PDF status");
    assert.match(pdf.headers.get("content-type") || "", /^application\/pdf(?:;|$)/i);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    const pages = countPdfPages(bytes);
    lines.push(`PDF: application/pdf; ${pages} pages; sha256 ${sha(bytes)}`);
    assert.ok(pages >= 1 && pages <= 2, "PDF must contain 1–2 pages");
    if (!values["get-only"]) {
      const local = sha(await readFile(resolve(root, "build/site", pdfPath)));
      assert.equal(sha(bytes), local, "PDF checksum");
      lines.push(`PDF: live sha256 == build/site sha256 ${local}`);
    }
    const health = await request("/api/health");
    assert.equal(health.status, 200);
    assert.equal(await health.text(), '{"ok":true,"configured":true}');
    lines.push('Health: {"ok":true,"configured":true}');
    for (const path of ["/api/admin/conversations", "/api/admin/stats"]) {
      assert.equal((await request(path)).status, 401, `${path} without token`);
    }
    if (!values["get-only"]) {
      const catalogResponse = await request("/evidence.json");
      assert.equal(catalogResponse.status, 200);
      const catalog = await catalogResponse.json();
      const roles = [
        { title: "Transformation lead", description: "Must have experience leading organizational transformation programmes." },
        { title: "AI product lead", description: "Must have experience building applied AI products." },
      ];
      normalizeComparisonRequest({ roles }, catalog.digest);
      const ask = await request("/api/ask", { messages: [{ role: "user", content: "Summarize your professional background in one sentence." }], source: "live-verify" });
      assert.equal(ask.status, 200, "ask status");
      assert.match(ask.headers.get("content-type") || "", /^text\/event-stream(?:;|$)/i);
      const { types, answerLength } = readSseTypes(await ask.text());
      lines.push(`Ask: text/event-stream; types ${[...new Set(types)].join(", ")}; last ${types.at(-1)}; answer ${answerLength} characters`);
      const compare = await request("/api/compare", { roles });
      assert.equal(compare.status, 200, "compare status");
      const result = await compare.json();
      validateComparisonResult(result, {
        catalogDigest: catalog.digest, evidenceIds: new Set(catalog.items.map((item) => item.id)),
      });
      assert.equal(result.roles.length, 2, "comparison role count");
      lines.push(`Compare: validateComparisonResult passed; ${result.roles.length} roles; digest ${catalog.digest}`);
    }
    lines.push("Result: PASS");
  } catch (error) {
    lines[4] = "Status: drafting";
    lines.push(`Result: FAIL; ${error.message}`);
    process.exitCode = 1;
  } finally {
    lines.push("", `Requests: ${requests.filter((r) => r.startsWith("GET")).length} GETs, ${requests.filter((r) => r.startsWith("POST")).length} POSTs`, ...requests);
    await mkdir(dirname(resolve(values.out)), { recursive: true });
    await writeFile(values.out, `${lines.join("\n")}\n`);
    console.log(`${lines.find((line) => line.startsWith("Result:"))}; receipt ${values.out}`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
