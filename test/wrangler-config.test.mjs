import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildWranglerConfig } from "../scripts/wrangler-config.mjs";
import { ADA, GRACE } from "./fixtures/owners.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const base = JSON.parse(await readFile(resolve(root, "wrangler.base.jsonc"), "utf8"));

test("a custom-domain owner keeps her worker, archive, hosts and variables", () => {
  const config = JSON.parse(buildWranglerConfig(GRACE, base));
  assert.equal(config.name, "grace-sample-agent-cv");
  assert.deepEqual(config.routes, [
    { pattern: "grace.example", custom_domain: true },
    { pattern: "www.grace.example", custom_domain: true },
  ]);
  assert.deepEqual(config.kv_namespaces, [{ binding: "ARCHIVE", id: "11111111111111111111111111111111" }]);
  assert.equal(config.vars.CONTACT_EMAIL, "grace@grace.example");
  assert.equal(config.vars.COMPARISON_MONTHLY_REQUEST_CAP, "60");
});

test("another owner's config takes her worker, archive, hosts and vars and keeps every binding rule", () => {
  const owner = { ...ADA, site: { ...ADA.site, hosts: [...ADA.site.hosts, "ada-example-agent-cv.ada.workers.dev"] } };
  const ada = JSON.parse(buildWranglerConfig(owner, base));
  const grace = JSON.parse(buildWranglerConfig(GRACE, base));

  assert.equal(ada.name, "ada-example-agent-cv");
  assert.deepEqual(ada.kv_namespaces, [{ binding: "ARCHIVE", id: "00000000000000000000000000000000" }]);
  assert.deepEqual(ada.routes, [
    { pattern: "ada.example", custom_domain: true },
    { pattern: "www.ada.example", custom_domain: true },
  ]);
  assert.deepEqual(ada.vars, { ...base.vars, MONTHLY_REQUEST_CAP: "1000" });
  const shared = ({ name, routes, kv_namespaces, vars, ...rest }) => rest;
  assert.deepEqual(shared(ada), shared(grace));
  assert.equal(grace.kv_namespaces[0].binding, ada.kv_namespaces[0].binding);
});

test("CONTACT_EMAIL follows contact.email, whatever deploy.vars says", async (t) => {
  for (const [email, expected] of [["ada@ada.example", "ada@ada.example"], [null, undefined]]) {
    await t.test(String(email), () => {
      const owner = { ...ADA, contact: { email }, deploy: { ...ADA.deploy, vars: { CONTACT_EMAIL: "spoof@evil.example" } } };
      assert.equal(JSON.parse(buildWranglerConfig(owner, base)).vars.CONTACT_EMAIL, expected);
    });
  }
});

test("owner var strings that look like arrays survive formatting unchanged", async (t) => {
  for (const text of ["[ 1 ]", "The [ 1, 2 ] cases", "[ null ]", "[ 1. ]", 'say "[ 1 ]"', String.raw`back\slash [ "a" ]`]) {
    await t.test(text, () => {
      const owner = { ...ADA, deploy: { ...ADA.deploy, vars: { CUSTOM: text } } };
      const config = buildWranglerConfig(owner, base);
      assert.equal(JSON.parse(config).vars.CUSTOM, text);
      assert.match(config, /"new_sqlite_classes": \["BudgetCounter"\]\n/);
    });
  }
});

// An engine copy whose root wrangler.jsonc the entry points rewrite, so this checkout stays untouched.
async function engineCopy(context) {
  const engine = await mkdtemp(resolve(tmpdir(), "agent-cv-wrangler-"));
  context.after(() => rm(engine, { recursive: true, force: true }));
  for (const path of ["src", "schemas", "wrangler.base.jsonc", "scripts/owner.mjs", "scripts/wrangler-config.mjs", "scripts/check-worker-package.mjs"]) {
    await cp(resolve(root, path), resolve(engine, path), { recursive: true });
  }
  return engine;
}

test("entry points write the selected owner's config over an absent or another owner's file", async (t) => {
  for (const script of ["scripts/wrangler-config.mjs", "scripts/check-worker-package.mjs"]) {
    for (const existing of [null, buildWranglerConfig(GRACE, base)]) {
      await t.test(`${script} · ${existing ? "Grace's config present" : "no config"}`, async (context) => {
        const engine = await engineCopy(context);
        if (existing) await writeFile(resolve(engine, "wrangler.jsonc"), existing);
        const env = { ...process.env, AGENT_CV_OWNER_ROOT: resolve(root, "examples/owner") };
        await run(process.execPath, [resolve(engine, script)], { cwd: engine, env });
        const config = JSON.parse(await readFile(resolve(engine, "wrangler.jsonc"), "utf8"));
        assert.equal(config.name, "ada-example-agent-cv");
      });
    }
  }
});

test("npm entry points generate the config before Wrangler, checks and tests read it", async () => {
  const { scripts } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  assert.match(scripts.dev, /npm run build:wrangler-config && .*wrangler dev/);
  assert.match(scripts.deploy, /npm run build:wrangler-config -- --deploy && .*wrangler deploy/);
  assert.match(scripts.build, /^npm run check && .*wrangler deploy --config wrangler\.jsonc --dry-run/);
  assert.match(scripts.check, /npm run check:worker-package && npm test/);
  assert.equal(scripts["build:wrangler-config"], "node scripts/wrangler-config.mjs");
  const { stdout } = await run("git", ["ls-files", "wrangler.base.jsonc", "wrangler.jsonc"], { cwd: root });
  assert.equal(stdout.trim(), "wrangler.base.jsonc");
});
