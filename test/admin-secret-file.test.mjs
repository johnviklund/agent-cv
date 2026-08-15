import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeLocalAdminToken } from "../scripts/admin-secret-file.mjs";

test("admin token setup tightens permissions on an existing env file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "agent-cv-admin-secret-"));
  const envFile = join(directory, ".dev.vars");
  try {
    await writeFile(envFile, "OPENAI_API_KEY=example\n", { mode: 0o644 });
    await chmod(envFile, 0o644);
    await writeLocalAdminToken(envFile, "test-token");

    assert.match(await readFile(envFile, "utf8"), /^ADMIN_API_TOKEN=test-token$/m);
    assert.equal((await stat(envFile)).mode & 0o777, 0o600);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
