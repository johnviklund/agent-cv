import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { scanForLeaks, LEAK_SCAN_DIRS } from "../scripts/check-leaks.mjs";
import { UPSTREAM_URL } from "../site/templates/html.mjs";

test("leak scan defaults cover every engine output folder", () => {
  assert.deepEqual(LEAK_SCAN_DIRS, ["build/site", "public", "src/data"].map((dir) => resolve(dir)));
});

test("no-argument CLI blocks private owner evidence and stray proposals in all tracked files", async (context) => {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-private-leaks-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const cli = resolve("scripts/check-leaks.mjs");
  const git = (...args) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  await mkdir(resolve(dir, "data"));
  await mkdir(resolve(dir, ".workflow"));
  git("init", "--quiet");
  const email = "fixture@example.invalid";
  const bodies = { "data/faq.md": "unpublished FAQ", "AGENTS.md": "private agent rules",
    "golden-exceptions.json": "private exceptions", "data/cv.md": "published CV" };
  for (const [file, body] of Object.entries(bodies)) await writeFile(resolve(dir, file), body);
  const digest = (file) => createHash("sha256").update(bodies[file]).digest("hex").slice(0, 12);
  for (const [label, file, text, contact, status] of [
    ["owner email", ".workflow/x.md", email, email, 1],
    ["null email", ".workflow/x.md", email, null, 0],
    ["Linux home", "WORKLOG.md", "/" + "home/fixture/repo", null, 1],
    ["macOS home", "WORKLOG.md", "/" + "Users/fixture/repo", null, 1],
    ...["data/faq.md", "AGENTS.md", "golden-exceptions.json"].map((file) =>
      [file, ".workflow/x.md", digest(file), null, 1]),
    ["published hash", ".workflow/x.md", digest("data/cv.md"), null, 0],
    ["proposal", "notes.proposed", "draft", null, 1],
    ["clean", ".workflow/x.md", "ordinary public evidence", null, 0],
  ]) await context.test(label, async () => {
    await writeFile(resolve(dir, "owner.json"), JSON.stringify({ contact: { email: contact } }));
    await writeFile(resolve(dir, file), text);
    git("add", file);
    const result = spawnSync(process.execPath, [cli], {
      cwd: dir, encoding: "utf8", env: { ...process.env, AGENT_CV_OWNER_ROOT: dir },
    });
    assert.equal(result.status, status, result.stderr);
    assert.match(result.stdout, new RegExp(`Leak scan: ${status} findings`));
    if (status) assert.ok(result.stderr.includes(resolve(dir, file)), result.stderr);
    git("rm", "--cached", "--", file);
    await rm(resolve(dir, file));
  });
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
    "README.md": `Live demo: [${name.toLowerCase()}${surname.toLowerCase()}.com](https://${name.toLowerCase()}${surname.toLowerCase()}.com).\n`,
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
