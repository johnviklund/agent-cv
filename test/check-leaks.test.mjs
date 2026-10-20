import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { scanForLeaks, LEAK_SCAN_DIRS } from "../scripts/check-leaks.mjs";
import { UPSTREAM_URL } from "../site/templates/html.mjs";

test("leak scan defaults cover every engine output folder", () => {
  assert.deepEqual(LEAK_SCAN_DIRS, ["build/site", "public", "src/data"].map((dir) => resolve(dir)));
});

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
    for (const name of ["Jo" + "hn", "VIK" + "LUND", "jo" + "hnvik" + "lund"]) {
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
  assert.match(skipped.stdout, /Leak scan: output scan skipped/);
});


test("no-argument CLI scans tracked files with bounded credit exceptions", async (context) => {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-tracked-leaks-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const cli = resolve("scripts/check-leaks.mjs");
  const run = () => spawnSync(process.execPath, [cli], {
    cwd: dir, encoding: "utf8", env: { ...process.env, AGENT_CV_OWNER_ROOT: dir },
  });
  const outside = run();
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /not a git checkout/);
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  git("init", "--quiet");
  const name = "Jo" + "hn";
  const surname = "Vik" + "lund";
  const allowed = {
    "LICENSE": `Copyright (c) 2026 ${name} ${surname}\n`,
    "README.md": `Maintained by ${name} ${surname}. ${name.toLowerCase()}${surname.toLowerCase()}.com is one deployment.\n`,
    "upstream.txt": UPSTREAM_URL.replace("https://github.com/", ""),
    ".workflow/x.md": name,
    "WORKLOG.md": surname,
    "binary.bin": `\0${name}`,
    "untracked.txt": name,
  };
  await mkdir(resolve(dir, ".workflow"));
  for (const [path, text] of Object.entries(allowed)) await writeFile(resolve(dir, path), text);
  await symlink(".workflow", resolve(dir, "linked-directory"));
  git("add", "linked-directory");
  git("add", "LICENSE", "README.md", "upstream.txt", ".workflow", "WORKLOG.md", "binary.bin");
  const clean = run();
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /Leak scan: 0 findings/);
  assert.match(clean.stdout, /output scan skipped/i);
  for (const [path, text] of [
    ["notes.txt", name], ["LICENSE", `Copyright (c) 2026 ${name} ${surname}\n${name}\n`],
    ["README.md", `${allowed["README.md"]}${surname}\n`],
    ["LICENSE", `${allowed["LICENSE"].trimEnd()} ${surname}\n`],
    ["README.md", `${allowed["README.md"].trimEnd()} ${surname}\n`],
  ]) {
    await writeFile(resolve(dir, path), text);
    git("add", path);
    const leaked = run();
    assert.equal(leaked.status, 1);
    assert.ok(leaked.stderr.includes(path), leaked.stderr);
    await writeFile(resolve(dir, path), allowed[path] ?? "Ada");
  }
});
