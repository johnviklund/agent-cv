import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readAdminOrigin, validateAdminOrigin } from "../scripts/admin-origin.mjs";

test("loads one explicit HTTPS admin origin", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "agent-cv-admin-origin-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const configFile = join(root, "admin-origin.json");
  await writeFile(configFile, '{"origin":"https://fork.example"}\n');

  assert.equal(await readAdminOrigin(configFile), "https://fork.example");
  assert.throws(() => validateAdminOrigin("http://fork.example"), /valid HTTPS origin/);
  assert.throws(() => validateAdminOrigin("https://user:secret@fork.example"), /valid HTTPS origin/);
  assert.throws(() => validateAdminOrigin("https://fork.example/private"), /valid HTTPS origin/);
  await assert.rejects(() => readAdminOrigin(join(root, "missing.json")), /not configured/);
});
