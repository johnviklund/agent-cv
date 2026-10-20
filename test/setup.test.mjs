import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { runSetup } from "../scripts/setup.mjs";
import { loadOwner } from "../scripts/owner.mjs";

const engineRoot = resolve(import.meta.dirname, "..");
const flags = ["--name", "Grace Hopper", "--slug", "grace-hopper", "--domain", "grace.example", "--skip-cloud"];
async function fixture(t) {
  const directory = await mkdtemp(resolve(tmpdir(), "agent-cv-setup-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const target = resolve(directory, "owner");
  const calls = [];
  const run = async (...call) => { calls.push(call); return { stdout: "" }; };
  return { directory, target, calls, run };
}

test("setup creates a validated owner, preserves the other example files and prints next steps", async (t) => {
  const f = await fixture(t);
  const result = await runSetup({ args: [...flags, "--target", f.target], run: f.run });
  const { owner } = await loadOwner({ root: f.target });
  assert.equal(owner.slug, "grace-hopper");
  assert.deepEqual(owner.name, { full: "Grace Hopper", short: "Grace" });
  assert.deepEqual(owner.site.hosts, ["grace.example", "www.grace.example"]);
  assert.equal(owner.site.origin, "https://grace.example");
  assert.equal(owner.deploy.workerName, "grace-hopper-agent-cv");
  assert.equal(owner.links.github, null);
  for (const entry of await readdir(resolve(engineRoot, "examples/owner"), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "owner.json") continue;
    const relative = resolve(entry.parentPath, entry.name).slice(resolve(engineRoot, "examples/owner").length + 1);
    assert.deepEqual(await readFile(resolve(f.target, relative)), await readFile(resolve(engineRoot, "examples/owner", relative)));
  }
  assert.deepEqual(f.calls.map(([command, args, options]) => [command, args, options.cwd]), [["git", ["init"], f.target]]);
  assert.match(result.message, /npm run deploy/);
});

test("setup refuses a non-empty target or invalid slug without writing", async (t) => {
  for (const invalid of ["non-empty", "slug"]) await t.test(invalid, async (t) => {
    const f = await fixture(t);
    const args = [...flags, "--target", f.target];
    if (invalid === "non-empty") {
      await mkdir(f.target);
      await writeFile(resolve(f.target, "keep.txt"), "keep");
    } else args[args.indexOf("--slug") + 1] = "Grace";
    await assert.rejects(runSetup({ args, run: f.run }), invalid === "slug" ? /slug/ : new RegExp(f.target));
    if (invalid === "non-empty") {
      assert.deepEqual(await readdir(f.target), ["keep.txt"]);
      assert.equal(await readFile(resolve(f.target, "keep.txt"), "utf8"), "keep");
    } else await assert.rejects(readdir(f.target), { code: "ENOENT" });
    assert.equal(f.calls.length, 0);
  });
});

test("setup prompts for a missing domain only on a terminal", async (t) => {
  for (const isTTY of [true, false]) await t.test(String(isTTY), async (t) => {
    const f = await fixture(t);
    const args = [...flags.filter((value) => !["--domain", "grace.example"].includes(value)), "--target", f.target];
    const asks = [];
    const pending = runSetup({ args, run: f.run, isTTY, ask: async (question) => { asks.push(question); return "grace.example"; } });
    if (isTTY) {
      await pending;
      assert.equal(asks.length, 1);
      assert.match(asks[0], /domain/i);
      assert.equal((await loadOwner({ root: f.target })).owner.site.origin, "https://grace.example");
    } else {
      await assert.rejects(pending, /--domain/);
      await assert.rejects(readdir(f.target), { code: "ENOENT" });
      assert.equal(asks.length, 0);
    }
  });
});

test("setup defaults to the sibling agent-cv-private directory", async (t) => {
  const f = await fixture(t);
  const engine = resolve(f.directory, "engine");
  await cp(resolve(engineRoot, "examples/owner"), resolve(engine, "examples/owner"), { recursive: true });
  await runSetup({ args: flags, engineRoot: engine, run: f.run });
  assert.equal(JSON.parse(await readFile(resolve(f.directory, "agent-cv-private/owner.json"))).slug, "grace-hopper");
});
