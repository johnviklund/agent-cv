import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { writeComparisonEvidence } from "../scripts/build-comparison-evidence.mjs";
import { syncRepositories } from "../scripts/sync-github-repositories.mjs";
import { syncPublicData } from "../scripts/sync-public-data.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ada = resolve(root, "examples/owner");

// An engine with the public sources and engine-side manifests that must never be read.
async function workspace(context, ownerFiles = {}) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-manifests-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  const engine = resolve(dir, "engine");
  const owner = resolve(dir, "owner");
  await mkdir(resolve(engine, "config"), { recursive: true });
  await mkdir(owner);
  for (const file of ["owner.json", "site.json"]) await cp(resolve(ada, file), resolve(owner, file));
  await cp(resolve(ada, "data"), resolve(owner, "data"), { recursive: true });
  await cp(resolve(root, "config/comparison-contract.json"), resolve(engine, "config/comparison-contract.json"));
  for (const file of ["cv.md", "overview.md", "projects.md", "repositories.md"]) {
    await cp(resolve(root, "data", file), resolve(engine, "data", file));
  }
  await writeFile(resolve(engine, "config/repositories.json"), JSON.stringify([{ project: "Engine", repository: "engine/fallback", documents: [] }]));
  await writeFile(resolve(engine, "config/comparison-evidence.json"), JSON.stringify({ schemaVersion: 1, items: [{ id: "cv.profile", source: { path: "data/cv.md", headingPath: ["Profile"] } }] }));
  for (const [file, value] of Object.entries(ownerFiles)) await writeFile(resolve(owner, file), value);
  return { engine, owner };
}

// Answers the GitHub API for any public repository and records every URL requested.
function githubStub() {
  const urls = [];
  const userAgents = [];
  const fetchImpl = async (url, { headers }) => {
    urls.push(url);
    userAgents.push(headers["user-agent"]);
    const body = url.endsWith("/languages") ? { JavaScript: 1 }
      : url.includes("/contents/") ? "# Alpha\n"
        : { private: false, html_url: "https://github.com/example/alpha", description: "Alpha", pushed_at: "2026-10-01T00:00:00Z", default_branch: "main", license: null };
    return new Response(typeof body === "string" ? body : JSON.stringify(body));
  };
  return { urls, userAgents, fetchImpl };
}

test("an owner's empty manifests produce no evidence and no repository requests", async (context) => {
  const { engine, owner } = await workspace(context, {
    "repositories.json": "[]", "comparison-evidence.json": '{"schemaVersion":1,"items":[]}',
  });
  assert.deepEqual(JSON.parse(await readFile(resolve(owner, "repositories.json"), "utf8")), []);
  assert.deepEqual(JSON.parse(await readFile(resolve(owner, "comparison-evidence.json"), "utf8")), { schemaVersion: 1, items: [] });

  const catalog = await writeComparisonEvidence({ root: engine, ownerRoot: owner });
  assert.deepEqual(catalog.items, []);
  assert.deepEqual(JSON.parse(await readFile(resolve(engine, "public/evidence.json"), "utf8")).items, []);

  const { urls, fetchImpl } = githubStub();
  assert.deepEqual(await syncRepositories({ engineRoot: engine, ownerRoot: owner, fetchImpl }), []);
  assert.deepEqual(urls, []);
  assert.doesNotMatch(await readFile(resolve(owner, "data/repositories.md"), "utf8"), /^## /m);
});

test("missing or invalid owner manifests fail even when the engine still has config copies", async (t) => {
  for (const [name, files] of [
    ["missing", {}],
    ["invalid", { "repositories.json": "{}", "comparison-evidence.json": "{\"schemaVersion\":2,\"items\":[]}" }],
    ["malformed", { "repositories.json": "[", "comparison-evidence.json": "{" }],
  ]) {
    await t.test(name, async (context) => {
      const { engine, owner } = await workspace(context, files);
      const { urls, fetchImpl } = githubStub();
      await assert.rejects(writeComparisonEvidence({ root: engine, ownerRoot: owner }));
      await assert.rejects(syncRepositories({ engineRoot: engine, ownerRoot: owner, fetchImpl }));
      assert.deepEqual(urls, []);
    });
  }
});

test("a nonempty owner allowlist fetches only its named repositories and documents", async (context) => {
  const manifest = [{ project: "Alpha", repository: "example/alpha", documents: ["README.md"] }];
  const { engine, owner } = await workspace(context, { "repositories.json": JSON.stringify(manifest) });
  const { urls, userAgents, fetchImpl } = githubStub();

  const [entry] = await syncRepositories({ engineRoot: engine, ownerRoot: owner, fetchImpl });
  assert.deepEqual(urls.sort(), [
    "https://api.github.com/repos/example/alpha",
    "https://api.github.com/repos/example/alpha/contents/README.md",
    "https://api.github.com/repos/example/alpha/languages",
  ]);
  assert.equal(entry.repository, "example/alpha");
  assert.deepEqual(userAgents, Array(3).fill("ada-example-agent-cv-repository-sync"));
  assert.match(await readFile(resolve(owner, "data/repositories.md"), "utf8"), /^## Alpha$/m);
});

test("repository sync publishes freshly fetched grounding from the owner's data", async (context) => {
  const { engine, owner } = await workspace(context, {
    "repositories.json": JSON.stringify([{ project: "Fresh repository", repository: "example/alpha", documents: [] }]),
    "comparison-evidence.json": '{"schemaVersion":1,"items":[]}',
  });
  await syncRepositories({ engineRoot: engine, ownerRoot: owner, fetchImpl: githubStub().fetchImpl });
  assert.match(await readFile(resolve(owner, "data/repositories.md"), "utf8"), /^## Fresh repository$/m);
  await syncPublicData({ root: engine, ownerRoot: owner });
  assert.match(await readFile(resolve(engine, "public/repositories.md"), "utf8"), /^## Fresh repository$/m);
});
