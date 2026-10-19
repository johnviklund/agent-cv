import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { adminOrigin, readAdminOrigin, validateAdminOrigin } from "../scripts/admin-origin.mjs";

const engine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);

async function ownerRoot(context, ownerJson) {
  const root = await mkdtemp(join(tmpdir(), "agent-cv-admin-origin-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  if (ownerJson !== undefined) await writeFile(join(root, "owner.json"), ownerJson);
  return root;
}
const env = (root) => ({ AGENT_CV_OWNER_ROOT: root });
const owner = (origin) => JSON.stringify({ site: { origin } });

test("the admin origin is the selected owner's site.origin, unless explicitly overridden", async (context) => {
  const root = await ownerRoot(context, owner("https://fork.example"));
  assert.equal(await readAdminOrigin({ env: env(root) }), "https://fork.example");
  assert.equal(await adminOrigin("", { env: env(root) }), "https://fork.example");
  assert.equal(await adminOrigin("https://override.example", { env: env(root) }), "https://override.example");
  await assert.rejects(() => adminOrigin("http://override.example", { env: env(root) }), /valid HTTPS origin/);
  assert.equal(existsSync(resolve(engine, "config/admin-origin.json")), false);
});

test("a missing, malformed or unsafe owner origin fails", async (context) => {
  const cases = [
    [undefined, /not configured/],
    [JSON.stringify({ site: {} }), /not configured/],
    ["{ not json", /configuration is invalid/],
    ...["http://fork.example", "https://user:secret@fork.example", "https://fork.example/private",
      "https://fork.example/?q=1", "https://fork.example/#top"].map((origin) => [owner(origin), /valid HTTPS origin/]),
  ];
  for (const [ownerJson, error] of cases) {
    const root = await ownerRoot(context, ownerJson);
    await assert.rejects(() => readAdminOrigin({ env: env(root) }), error, ownerJson);
  }
  assert.throws(() => validateAdminOrigin("http://fork.example"), /valid HTTPS origin/);
});

test("the example owner, or a symlink to it, is never an admin destination", async (context) => {
  const link = join(await ownerRoot(context), "owner");
  await symlink(resolve(engine, "examples/owner"), link);
  for (const root of [resolve(engine, "examples/owner"), link]) {
    await assert.rejects(() => readAdminOrigin({ env: env(root) }), /Refusing/);
  }
});

test("export refuses the example owner before sending its token", async (context) => {
  const out = await ownerRoot(context);
  await assert.rejects(run(process.execPath, [resolve(engine, "scripts/export-conversations.mjs"), "--output", join(out, "x.jsonl")], {
    env: { ...process.env, ADMIN_API_TOKEN: "synthetic-token", AGENT_CV_OWNER_ROOT: resolve(engine, "examples/owner") },
  }), (error) => error.code === 1 && /Refusing/.test(error.stderr));
  assert.equal(existsSync(join(out, "x.jsonl")), false);
});
