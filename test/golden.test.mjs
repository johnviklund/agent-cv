import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { collectOutputs, diffGolden, writeGolden } from "../scripts/golden.mjs";
import { buildComparisonInstructions } from "../src/comparison-core.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-golden-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

function golden(...args) {
  return run(process.execPath, [resolve(root, "scripts/golden.mjs"), ...args], { cwd: root })
    .then(({ stdout, stderr }) => ({ code: 0, stdout, stderr }))
    .catch((error) => ({ code: error.code, stdout: error.stdout, stderr: error.stderr }));
}

test("golden outputs cover the site, both prompts and the Worker config", async () => {
  const outputs = await collectOutputs({ root });
  const keys = Object.keys(outputs);

  for (const key of ["site/index.html", "site/llms.txt", "site/AGENTS.md", "site/sitemap.xml",
    "prompts/system.txt", "prompts/comparison.txt", "wrangler.jsonc"]) {
    assert.ok(keys.includes(key), key);
  }
  assert.equal(keys.some((key) => key.endsWith(".pdf")), false);

  const system = outputs["prompts/system.txt"].toString("utf8");
  for (const file of ["cv.md", "faq.md"]) {
    assert.ok(system.includes(await readFile(resolve(root, "src/data", file), "utf8")), file);
  }
  assert.equal(outputs["prompts/comparison.txt"].toString("utf8"), buildComparisonInstructions());
});

test("golden diff names changed, added and removed paths", async (context) => {
  const dir = await tempDir(context);
  const outputs = { "site/a.txt": Buffer.from("a"), "site/b.txt": Buffer.from("b") };

  await writeGolden(dir, outputs);
  assert.deepEqual(await diffGolden(dir, outputs), { changed: [], added: [], removed: [] });

  const drifted = { "site/a.txt": Buffer.from("A"), "site/new.txt": Buffer.from("n") };
  assert.deepEqual(await diffGolden(dir, drifted), {
    changed: ["site/a.txt"],
    added: ["site/new.txt"],
    removed: ["site/b.txt"],
  });
});

test("golden CLI reports a missing snapshot, drift and an empty diff", async (context) => {
  const missing = resolve(await tempDir(context), "missing");
  const absent = await golden("diff", "--golden", missing);
  assert.equal(absent.code, 1);
  assert.equal(absent.stderr.trim(), `No golden snapshot at ${missing}; run npm run golden:capture`);

  const dir = await tempDir(context);
  assert.equal((await golden("capture", "--golden", dir)).code, 0);

  const clean = await golden("diff", "--golden", dir);
  assert.equal(clean.code, 0);
  assert.match(clean.stdout, /Golden diff: empty/);

  await writeFile(resolve(dir, "site/llms.txt"), "drift\n");
  const drift = await golden("diff", "--golden", dir);
  assert.equal(drift.code, 1);
  assert.match(drift.stdout, /site\/llms\.txt/);
});
