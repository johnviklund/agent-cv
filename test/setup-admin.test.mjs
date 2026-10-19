import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildWranglerConfig } from "../scripts/wrangler-config.mjs";
import { JOHN } from "./fixtures/owners.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const base = JSON.parse(await readFile(resolve(root, "wrangler.base.jsonc"), "utf8"));
const adaOwner = JSON.parse(await readFile(resolve(root, "examples/owner/owner.json"), "utf8"));

// An engine copy with a fake npx that records the config Wrangler would read, so no network or real token is used.
async function setupFixture(context) {
  const directory = await mkdtemp(resolve(tmpdir(), "agent-cv-setup-admin-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const engine = resolve(directory, "engine");
  for (const path of ["schemas", "examples/owner", "wrangler.base.jsonc", "scripts/owner.mjs", "scripts/wrangler-config.mjs",
    "scripts/admin-secret-file.mjs", "scripts/configure-admin-secret.mjs"]) {
    await cp(resolve(root, path), resolve(engine, path), { recursive: true });
  }
  const owner = resolve(directory, "owner");
  await cp(resolve(engine, "examples/owner"), owner, { recursive: true });
  const bin = resolve(directory, "bin");
  const seen = resolve(directory, "wrangler-saw.json");
  await mkdir(bin);
  await writeFile(resolve(bin, "npx"), `#!/bin/sh\ncat wrangler.jsonc > "${seen}"\ncat > /dev/null\n`);
  await chmod(resolve(bin, "npx"), 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  delete env.AGENT_CV_PRIVATE_ROOT;
  return { directory, engine, owner, seen, env };
}

const setupAdmin = ({ engine, env }, ownerRoot) => run(process.execPath, [resolve(engine, "scripts/configure-admin-secret.mjs")],
  { cwd: engine, env: { ...env, AGENT_CV_OWNER_ROOT: ownerRoot } });

test("setup:admin hands Wrangler the selected owner's worker over an absent or another owner's config", async (t) => {
  for (const existing of [null, buildWranglerConfig(JOHN, base)]) {
    await t.test(existing ? "John's config present" : "no config", async (context) => {
      const fixture = await setupFixture(context);
      if (existing) await writeFile(resolve(fixture.engine, "wrangler.jsonc"), existing);
      await setupAdmin(fixture, fixture.owner);
      const config = JSON.parse(await readFile(fixture.seen, "utf8"));
      assert.equal(config.name, adaOwner.deploy.workerName);
      assert.equal(config.kv_namespaces[0].id, adaOwner.deploy.archiveNamespaceId);
    });
  }
});

test("setup:admin refuses the example owner before writing a token or calling Wrangler", async (t) => {
  for (const spelling of ["directory", "symlink"]) {
    await t.test(spelling, async (context) => {
      const fixture = await setupFixture(context);
      const example = resolve(fixture.engine, "examples/owner");
      const ownerRoot = spelling === "symlink" ? resolve(fixture.directory, "example-link") : example;
      if (spelling === "symlink") await symlink(example, ownerRoot);
      const envFile = resolve(fixture.engine, ".dev.vars");
      await writeFile(envFile, "ADMIN_API_TOKEN=existing\n");

      await assert.rejects(setupAdmin(fixture, ownerRoot), /Refusing to deploy the example owner/);
      assert.equal(await readFile(envFile, "utf8"), "ADMIN_API_TOKEN=existing\n");
      await assert.rejects(readFile(fixture.seen), { code: "ENOENT" });
    });
  }
});
