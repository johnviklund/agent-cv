import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as sync from "../scripts/sync-public-data.mjs";
import { privateDataFiles, syncOwner } from "../scripts/sync-owner.mjs";
import { buildSite } from "../scripts/build-site.mjs";
import { loadOwner } from "../scripts/owner.mjs";

const example = resolve("examples/owner");
const files = ["cv.md", "overview.md", "projects.md", "repositories.md", ...privateDataFiles].sort();

async function workspace(context) {
  const root = await mkdtemp(resolve(tmpdir(), "agent-cv-public-sync-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "config"));
  await cp("config/comparison-contract.json", resolve(root, "config/comparison-contract.json"));
  return root;
}

test("sync builds Ada's public resources, ten Worker sources and selected evidence", async (context) => {
  const root = await workspace(context);
  await syncOwner({ sourceRoot: example, destinationRoot: root });
  await sync.syncPublicData({ root, ownerRoot: example });
  assert.match(await readFile(resolve(root, "public/cv.md"), "utf8"), /Ada Example/);
  for (const file of files) {
    const expected = await readFile(resolve(example, "data", file), "utf8");
    assert.equal(await readFile(resolve(root, "src/data", file), "utf8"), expected);
    if (privateDataFiles.includes(file)) {
      assert.doesNotMatch(expected, /john/i);
      assert.equal(await readFile(resolve(root, "data", file), "utf8"), expected);
    }
  }
  const catalog = JSON.parse(await readFile(resolve(root, "public/evidence.json"), "utf8"));
  const manifest = JSON.parse(await readFile(resolve(example, "comparison-evidence.json"), "utf8"));
  assert.equal(catalog.items.length, 3);
  assert.deepEqual(catalog.items.map(({ id }) => id), manifest.items.map(({ id }) => id));
  assert.deepEqual(catalog.items.map(({ text }) => text), [
    "Ada Example is a fictional staff engineer who builds distributed systems.",
    "Ada designs reliable services and helps teams operate them.",
    "A fictional library for explaining distributed job scheduling.",
  ]);
});

test("sync refuses an owner missing cv.md before writing any output", async (context) => {
  const root = await workspace(context);
  const ownerRoot = resolve(root, "owner");
  await cp(example, ownerRoot, { recursive: true });
  await rm(resolve(ownerRoot, "data/cv.md"), { force: true });
  await assert.rejects(sync.syncPublicData({ root, ownerRoot }), /cv\.md/);
  assert.deepEqual((await readdir(root)).sort(), ["config", "owner"]);
});

test("site builds read the selected owner's public Markdown by default", async (context) => {
  const root = await workspace(context);
  const out = resolve(root, "site");
  await buildSite({ ...(await loadOwner({ root: example })), out });
  assert.match(await readFile(resolve(out, "cv.md"), "utf8"), /Ada Example/);
});
