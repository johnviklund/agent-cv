import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { privateDataFiles, syncPrivateData } from "../scripts/sync-private-data.mjs";

async function makeWorkspace(context) {
  const workspace = await mkdtemp(resolve(tmpdir(), "agent-cv-private-sync-"));
  context.after(() => rm(workspace, { recursive: true, force: true }));

  const sourceRoot = resolve(workspace, "agent-cv-private");
  const destinationRoot = resolve(workspace, "agent-cv");
  await Promise.all([
    mkdir(resolve(sourceRoot, "data"), { recursive: true }),
    mkdir(resolve(destinationRoot, "data"), { recursive: true }),
  ]);

  return { sourceRoot, destinationRoot };
}

test("private data sync copies exactly the approved source files", async (context) => {
  const { sourceRoot, destinationRoot } = await makeWorkspace(context);

  for (const [index, file] of privateDataFiles.entries()) {
    await writeFile(resolve(sourceRoot, "data", file), `private-${index}\0${file}\n`);
  }
  await writeFile(resolve(sourceRoot, "data", "raw-transcript.md"), "must not copy\n");
  await writeFile(resolve(destinationRoot, "data", "cv.md"), "public cv\n");

  const result = await syncPrivateData({ sourceRoot, destinationRoot });

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
    syncPrivateData({ sourceRoot, destinationRoot }),
    /Private data source is incomplete/,
  );

  for (const file of privateDataFiles) {
    assert.equal(
      await readFile(resolve(destinationRoot, "data", file), "utf8"),
      `existing ${file}\n`,
    );
  }
});
