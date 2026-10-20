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

const namespaceId = "0123456789abcdef0123456789abcdef";
async function cloudFixture(t, failAt) {
  const f = await fixture(t);
  f.engine = resolve(f.directory, "engine");
  for (const path of ["examples/owner", "schemas", "wrangler.base.jsonc"]) {
    await cp(resolve(engineRoot, path), resolve(f.engine, path), { recursive: true });
  }
  f.run = async (command, args, options) => {
    f.calls.push([command, args, options]);
    if (command === "git") return { stdout: "" };
    const step = args[1] === "kv" ? "kv" : args.at(-1);
    if (step === failAt) throw new Error("cloud failure");
    const config = JSON.parse(await readFile(resolve(f.engine, "wrangler.jsonc")));
    assert.equal(config.name, "grace-hopper-agent-cv");
    return { stdout: failAt === "missing-id" ? "Created" : `Created.\n{ "id": "${namespaceId}" }` };
  };
  f.invoke = () => runSetup({ args: [...flags.filter((value) => value !== "--skip-cloud"), "--target", f.target],
    engineRoot: f.engine, env: { OPENAI_API_KEY: "sk-setup-test-private" }, run: f.run, isTTY: false });
  return f;
}

test("setup creates the owner archive and pipes both secrets to the selected Worker", async (t) => {
  const f = await cloudFixture(t);
  await f.invoke();
  const cloud = f.calls.filter(([command]) => command !== "git");
  assert.deepEqual(cloud.map(([, args]) => args), [
    ["wrangler", "kv", "namespace", "create", "grace-hopper-agent-cv-archive"],
    ["wrangler", "secret", "put", "OPENAI_API_KEY"],
    ["wrangler", "secret", "put", "ADMIN_API_TOKEN"],
  ]);
  const owner = (await loadOwner({ root: f.target })).owner;
  assert.equal(owner.deploy.archiveNamespaceId, namespaceId);
  assert.equal(cloud[1][2].input, "sk-setup-test-private\n");
  assert.match(cloud[2][2].input, /^[a-f0-9]{64}\n$/);
  assert.equal(await readFile(resolve(f.engine, ".dev.vars"), "utf8"), `ADMIN_API_TOKEN=${cloud[2][2].input}`);
  assert.ok(f.calls.every(([, args, options]) => !JSON.stringify([args, options.env]).includes("sk-setup-test-private")));
  for (const path of await readdir(f.target, { recursive: true, withFileTypes: true })) {
    if (path.isFile()) assert.ok(!(await readFile(resolve(path.parentPath, path.name), "utf8")).includes("sk-setup-test-private"));
  }
  assert.ok(!(await readFile(resolve(f.engine, ".dev.vars"), "utf8")).includes("sk-setup-test-private"));
});

test("setup preserves completed values and names the retry command for each cloud failure", async (t) => {
  for (const step of ["kv", "OPENAI_API_KEY", "ADMIN_API_TOKEN", "missing-id"]) await t.test(step, async (t) => {
    const f = await cloudFixture(t, step);
    await assert.rejects(f.invoke(), (error) => {
      assert.match(error.message, step === "kv" || step === "missing-id" ? /kv.*namespace.*create/ : new RegExp(step));
      assert.match(error.message, /Retry:/);
      assert.match(error.message, step === "ADMIN_API_TOKEN" ? /npm run setup:admin/ : /npx wrangler/);
      assert.ok(error.message.includes(f.target));
      const retries = ["npx wrangler kv namespace create", "npx wrangler secret put OPENAI_API_KEY", "npm run setup:admin"];
      const first = { kv: 0, "missing-id": 0, OPENAI_API_KEY: 1, ADMIN_API_TOKEN: 2 }[step];
      assert.deepEqual(retries.filter((retry) => error.message.includes(retry)), retries.slice(first));
      const positions = retries.slice(first).map((retry) => error.message.indexOf(retry));
      assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
      assert.ok(error.message.endsWith(step === "missing-id" ? "Namespace response has no id." : "cloud failure"));
      return true;
    });
    const owner = (await loadOwner({ root: f.target })).owner;
    assert.equal(owner.deploy.archiveNamespaceId, ["kv", "missing-id"].includes(step) ? "0".repeat(32) : namespaceId);
    assert.equal(f.calls.length, { kv: 2, "missing-id": 2, OPENAI_API_KEY: 3, ADMIN_API_TOKEN: 4 }[step]);
  });
});
