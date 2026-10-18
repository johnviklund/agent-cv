import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { privateDataFiles, syncOwner } from "../scripts/sync-owner.mjs";
import { writeOwnerModule } from "../scripts/sync-public-data.mjs";

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleOwner = JSON.parse(await readFile(resolve(engineRoot, "examples/owner/owner.json"), "utf8"));
const exampleSite = await readFile(resolve(engineRoot, "examples/owner/site.json"), "utf8");

async function makeWorkspace(context) {
  const workspace = await mkdtemp(resolve(tmpdir(), "agent-cv-private-sync-"));
  context.after(() => rm(workspace, { recursive: true, force: true }));

  const sourceRoot = resolve(workspace, "agent-cv-private");
  const destinationRoot = resolve(workspace, "agent-cv");
  await Promise.all([
    mkdir(resolve(sourceRoot, "data"), { recursive: true }),
    mkdir(resolve(destinationRoot, "data"), { recursive: true }),
  ]);
  await writeFile(resolve(sourceRoot, "owner.json"), JSON.stringify({ ...exampleOwner, slug: "fixture-owner" }));
  await writeFile(resolve(sourceRoot, "site.json"), exampleSite);

  return { sourceRoot, destinationRoot };
}

test("private data sync copies exactly the approved source files", async (context) => {
  const { sourceRoot, destinationRoot } = await makeWorkspace(context);

  for (const [index, file] of privateDataFiles.entries()) {
    await writeFile(resolve(sourceRoot, "data", file), `private-${index}\0${file}\n`);
  }
  await writeFile(resolve(sourceRoot, "data", "raw-transcript.md"), "must not copy\n");
  await writeFile(resolve(destinationRoot, "data", "cv.md"), "public cv\n");

  const result = await syncOwner({ sourceRoot, destinationRoot });

  assert.equal(result.owner.slug, "fixture-owner");
  assert.deepEqual(result.files, privateDataFiles);
  for (const [index, file] of privateDataFiles.entries()) {
    assert.equal(
      await readFile(resolve(destinationRoot, "data", file), "utf8"),
      `private-${index}\0${file}\n`,
    );
  }
  await assert.rejects(readFile(resolve(destinationRoot, "data", "raw-transcript.md")));
  assert.equal(await readFile(resolve(destinationRoot, "data", "cv.md"), "utf8"), "public cv\n");
});

test("private data sync validates every source before changing local data", async (context) => {
  const { sourceRoot, destinationRoot } = await makeWorkspace(context);

  for (const file of privateDataFiles.slice(0, -1)) {
    await writeFile(resolve(sourceRoot, "data", file), `new ${file}\n`);
  }
  for (const file of privateDataFiles) {
    await writeFile(resolve(destinationRoot, "data", file), `existing ${file}\n`);
  }

  await assert.rejects(
    syncOwner({ sourceRoot, destinationRoot }),
    /Private data source is incomplete/,
  );

  for (const file of privateDataFiles) {
    assert.equal(
      await readFile(resolve(destinationRoot, "data", file), "utf8"),
      `existing ${file}\n`,
    );
  }
});

test("owner sync refuses an invalid owner or a deploy of the example owner before copying", async (context) => {
  const cases = [
    [async ({ sourceRoot }) => writeFile(resolve(sourceRoot, "owner.json"), JSON.stringify({ ...exampleOwner, slug: "" })),
      (options) => syncOwner(options), /^owner\.json: slug /],
    [async () => {}, ({ destinationRoot }) => syncOwner({ destinationRoot, deploy: true, env: { AGENT_CV_OWNER_ROOT: resolve(engineRoot, "examples/owner") } }),
      /^Refusing to deploy the example owner/],
    [async () => {}, ({ sourceRoot, destinationRoot }) => syncOwner({ sourceRoot: resolve(engineRoot, "examples/owner"), destinationRoot, deploy: true }),
      /^Refusing to deploy the example owner/],
  ];

  for (const [arrange, act, message] of cases) {
    const workspace = await makeWorkspace(context);
    for (const file of privateDataFiles) {
      await writeFile(resolve(workspace.sourceRoot, "data", file), `new ${file}\n`);
      await writeFile(resolve(workspace.destinationRoot, "data", file), `existing ${file}\n`);
    }
    await arrange(workspace);

    await assert.rejects(act(workspace), { message });
    for (const file of privateDataFiles) {
      assert.equal(await readFile(resolve(workspace.destinationRoot, "data", file), "utf8"), `existing ${file}\n`);
    }
  }
});

test("owner sync refuses a deploy of the example owner through a symlink, and deploys any other owner", async (context) => {
  const { sourceRoot, destinationRoot } = await makeWorkspace(context);
  const link = resolve(dirname(sourceRoot), "example-link");
  await symlink(resolve(engineRoot, "examples/owner"), link);
  for (const file of privateDataFiles) {
    await writeFile(resolve(sourceRoot, "data", file), `new ${file}\n`);
    await writeFile(resolve(destinationRoot, "data", file), `existing ${file}\n`);
  }

  for (const options of [{ sourceRoot: link }, { env: { AGENT_CV_OWNER_ROOT: link } }, { env: { AGENT_CV_PRIVATE_ROOT: link } }]) {
    await assert.rejects(syncOwner({ ...options, destinationRoot, deploy: true }), {
      message: /^Refusing to deploy the example owner/,
    });
    for (const file of privateDataFiles) {
      assert.equal(await readFile(resolve(destinationRoot, "data", file), "utf8"), `existing ${file}\n`);
    }
  }

  assert.equal((await syncOwner({ sourceRoot, destinationRoot, deploy: true })).owner.slug, "fixture-owner");
  assert.equal(await readFile(resolve(destinationRoot, "data", privateDataFiles[0]), "utf8"), `new ${privateDataFiles[0]}\n`);
});

test("sync:owner, its sync:private-data alias and deploy run the owner sync", async () => {
  const { scripts } = JSON.parse(await readFile(resolve(engineRoot, "package.json"), "utf8"));

  assert.equal(scripts["sync:owner"], "node scripts/sync-owner.mjs");
  assert.equal(scripts["sync:private-data"], "node scripts/sync-owner.mjs");
  assert.ok(scripts.deploy.startsWith("npm run sync:owner -- --deploy && "));
});

test("the generated owner module carries the owner without deploy settings or analytics", async (context) => {
  const { destinationRoot } = await makeWorkspace(context);

  await writeOwnerModule({ root: destinationRoot, owner: exampleOwner, site: { updatedAt: "2026-10-18" } });
  const { default: owner } = await import(pathToFileURL(resolve(destinationRoot, "src/data/owner.js")).href);

  const { deploy, analytics, ...expected } = exampleOwner;
  assert.deepEqual(owner, expected);
  assert.equal(owner.name.full, "Ada Example");
});
