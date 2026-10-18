import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
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
