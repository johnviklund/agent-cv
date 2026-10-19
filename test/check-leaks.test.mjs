import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { scanForLeaks } from "../scripts/check-leaks.mjs";
import { UPSTREAM_URL } from "../site/templates/html.mjs";

test("leak scan allows the upstream URL and rejects owner names in every output folder", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "agent-cv-leaks-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const dirs = ["build/site", "public", "src/data"].map((dir) => resolve(root, dir));
  const run = (owner) => spawnSync(process.execPath, ["scripts/check-leaks.mjs", ...dirs], {
    encoding: "utf8", env: { ...process.env, AGENT_CV_OWNER_ROOT: owner },
  });
  for (const dir of dirs) {
    await mkdir(resolve(dir, "nested"), { recursive: true });
    await writeFile(resolve(dir, "credit.html"), `${UPSTREAM_URL}\nAda Example\n`);
  }
  assert.deepEqual(await scanForLeaks(dirs), []);
  const clean = run("examples/owner");
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /Leak scan: 0 findings/);
  for (const dir of dirs) {
    const file = resolve(dir, "nested/leak.txt");
    for (const name of ["John", "VIKLUND", "johnviklund"]) {
      await writeFile(file, `${UPSTREAM_URL}\n${name}\n`);
      assert.deepEqual(await scanForLeaks(dirs), [file]);
    }
    const leaked = run("examples/owner");
    assert.equal(leaked.status, 1);
    assert.ok((leaked.stdout + leaked.stderr).includes(file));
    await rm(file);
  }
  const skipped = run(root);
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.match(skipped.stdout, /Leak scan: skipped/);
});
