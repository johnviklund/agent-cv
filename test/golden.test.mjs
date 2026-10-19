import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { collectOutputs, diffGolden, reviewGolden, writeGolden } from "../scripts/golden.mjs";
import { buildComparisonInstructions } from "../src/comparison-core.js";
import { resolveOwnerRoot } from "../scripts/owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-golden-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

function golden(...args) {
  return goldenAt(root, {}, ...args);
}

// Runs the CLI of the engine at `engine` from `cwd`, with an owner root kept out of John's checkout.
function goldenAt(engine, { cwd = root, ownerRoot }, ...args) {
  const env = ownerRoot ? { ...process.env, AGENT_CV_OWNER_ROOT: ownerRoot } : process.env;
  return run(process.execPath, [resolve(engine, "scripts/golden.mjs"), ...args], { cwd, env })
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
  // Buffer.equals, not deepEqual: a failing deepEqual diffs every byte and exhausts memory.
  assert.ok(outputs["site/og-image.png"].equals(await readFile(resolve(resolveOwnerRoot(), "assets/og-image.png"))), "site/og-image.png");

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

async function sentinelIn(dir) {
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "sentinel.txt"), "keep\n");
  return async () => (await stat(resolve(dir, "sentinel.txt")).catch(() => null))?.isFile() ?? false;
}

test("golden CLI rejects a missing, empty or unknown argument and leaves the working directory", async (context) => {
  const workspace = await tempDir(context);
  const ownerRoot = resolve(workspace, "owner");
  const cwd = resolve(workspace, "cwd");
  const kept = await sentinelIn(cwd);
  await mkdir(ownerRoot);

  for (const [args, message] of [
    [["capture", "--golden"], "--golden requires a path."],
    [["capture", "--golden", ""], "--golden requires a path."],
    [["capture", "--bogus"], "Unknown argument: --bogus"],
  ]) {
    const result = await goldenAt(root, { cwd, ownerRoot }, ...args);
    assert.equal(result.code, 1, args.join(" "));
    assert.equal(result.stderr.trim(), message);
    assert.equal(await kept(), true, args.join(" "));
  }
});

test("golden capture refuses the engine root, the owner root and their ancestors", async (context) => {
  const workspace = await tempDir(context);
  const ownerRoot = resolve(workspace, "owner");
  // A copy of the CLI stands in for the engine, so a refusal that fails cannot touch this checkout.
  const engine = resolve(workspace, "engine");
  await mkdir(resolve(engine, "scripts"), { recursive: true });
  for (const file of ["golden.mjs", "owner.mjs"]) {
    await copyFile(resolve(root, "scripts", file), resolve(engine, "scripts", file));
  }
  const ownerKept = await sentinelIn(ownerRoot);
  const engineKept = await sentinelIn(engine);
  await symlink(ownerRoot, resolve(workspace, "owner-link"));
  await symlink(engine, resolve(workspace, "engine-link"));

  for (const target of [ownerRoot, `${ownerRoot}/.`, resolve(workspace, "owner-link"),
    engine, resolve(workspace, "engine-link"), workspace]) {
    const result = await goldenAt(engine, { ownerRoot }, "capture", "--golden", target);
    assert.equal(result.code, 1, target);
    assert.match(result.stderr, /^Refusing to replace /, target);
    assert.equal(await ownerKept(), true, target);
    assert.equal(await engineKept(), true, target);
  }
});

const digest = (content) => `sha256:${createHash("sha256").update(content).digest("hex")}`;

// A snapshot whose llms.txt and sitemap.xml differ from the current outputs, and an owner root for its manifest.
async function driftedSnapshot(context) {
  const workspace = await tempDir(context);
  const dir = resolve(workspace, "golden");
  const ownerRoot = resolve(workspace, "owner");
  await mkdir(ownerRoot);
  // The diff builds the site again, so its owner root carries the same owner configuration.
  await mkdir(resolve(ownerRoot, "assets"));
  for (const file of ["owner.json", "site.json", "assets/og-image.png"]) await copyFile(resolve(resolveOwnerRoot(), file), resolve(ownerRoot, file));
  assert.equal((await golden("capture", "--golden", dir)).code, 0);
  const current = {};
  for (const file of ["llms.txt", "sitemap.xml"]) {
    current[file] = await readFile(resolve(dir, "site", file));
    await writeFile(resolve(dir, "site", file), `old ${file}\n`);
  }
  const exception = (file, overrides = {}) => ({
    path: `site/${file}`, before: digest(`old ${file}\n`), after: digest(current[file]),
    reason: `reviewed ${file} change`, diff: `-old ${file}\n+new ${file}`, ...overrides,
  });
  const diff = async (exceptions) => {
    await writeFile(resolve(ownerRoot, "golden-exceptions.json"), JSON.stringify({ exceptions }));
    return goldenAt(root, { ownerRoot }, "diff", "--golden", dir);
  };
  return { exception, diff };
}

test("golden diff accepts each exactly recorded technical change and fails every unlisted one", async (context) => {
  const { exception, diff } = await driftedSnapshot(context);

  const all = await diff([exception("llms.txt"), exception("sitemap.xml")]);
  assert.equal(all.code, 0, all.stderr);
  assert.match(all.stdout, /^accepted changed site\/llms\.txt: reviewed llms\.txt change$/m);
  assert.match(all.stdout, /^accepted changed site\/sitemap\.xml: reviewed sitemap\.xml change$/m);

  for (const [name, exceptions] of [
    ["unlisted", [exception("llms.txt")]],
    ["wrong before digest", [exception("llms.txt"), exception("sitemap.xml", { before: digest("other") })]],
    ["wrong after digest", [exception("llms.txt"), exception("sitemap.xml", { after: digest("other") })]],
  ]) {
    const result = await diff(exceptions);
    assert.equal(result.code, 1, name);
    assert.match(result.stdout, /^accepted changed site\/llms\.txt: /m, name);
    assert.match(result.stdout, /^changed site\/sitemap\.xml$/m, name);
  }
});

test("an exception accepts only its own path when another file has the same bytes", async (context) => {
  const dir = await tempDir(context);
  const bytes = (text) => Buffer.from(text);
  await writeGolden(dir, { "site/a.txt": bytes("old"), "site/b.txt": bytes("old"), "site/gone-a.txt": bytes("x"), "site/gone-b.txt": bytes("x") });
  const outputs = { "site/a.txt": bytes("new"), "site/b.txt": bytes("new"), "site/new-a.txt": bytes("y"), "site/new-b.txt": bytes("y") };
  const entry = (path, before, after) => ({ path, before: before && digest(before), after: after && digest(after), reason: `reviewed ${path}` });

  assert.deepEqual(await reviewGolden(dir, outputs, [
    entry("site/a.txt", "old", "new"), entry("site/new-a.txt", null, "y"), entry("site/gone-a.txt", "x", null),
  ]), {
    accepted: [
      { kind: "changed", path: "site/a.txt", reason: "reviewed site/a.txt" },
      { kind: "added", path: "site/new-a.txt", reason: "reviewed site/new-a.txt" },
      { kind: "removed", path: "site/gone-a.txt", reason: "reviewed site/gone-a.txt" },
    ],
    unlisted: [{ kind: "changed", path: "site/b.txt" }, { kind: "added", path: "site/new-b.txt" }, { kind: "removed", path: "site/gone-b.txt" }],
  });
});

test("golden diff rejects prompt exceptions and exceptions without a reason or reviewed diff", async (context) => {
  const { exception, diff } = await driftedSnapshot(context);

  for (const [name, entry, message] of [
    ["system prompt", exception("llms.txt", { path: "prompts/system.txt" }), /Prompt exceptions are not allowed: prompts\/system\.txt/],
    ["comparison prompt", exception("llms.txt", { path: "prompts/comparison.txt" }), /Prompt exceptions are not allowed: prompts\/comparison\.txt/],
    ["no reason", exception("llms.txt", { reason: "" }), /site\/llms\.txt needs a reason/],
    ["no diff", exception("llms.txt", { diff: undefined }), /site\/llms\.txt needs a reviewed diff/],
    ["bad digest", exception("llms.txt", { after: "abc" }), /site\/llms\.txt after must be a sha256: digest or null/],
  ]) {
    const result = await diff([entry, exception("sitemap.xml")]);
    assert.equal(result.code, 1, name);
    assert.match(result.stderr, message, name);
    assert.doesNotMatch(result.stdout, /accepted/, name);
  }
});
