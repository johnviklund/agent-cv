import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildComparisonEvidenceCatalog,
  writeComparisonEvidence,
} from "../scripts/build-comparison-evidence.mjs";

const baseManifest = {
  schemaVersion: 1,
  items: [
    {
      id: "cv.profile",
      source: { path: "data/cv.md", headingPath: ["Profile"] },
    },
    {
      id: "project.alpha",
      source: { path: "data/projects.md", headingPath: ["Alpha"] },
      supportingSources: [
        { path: "data/repositories.md", headingPath: ["Alpha"] },
      ],
    },
  ],
};

const baseSources = {
  "data/cv.md": "# CV\n\n## Profile\n\nCanonical profile text.\n\n## Other\n\nUnselected.\n",
  "data/overview.md": "# Overview\n\n## Focus\n\nApplied AI.\n",
  "data/projects.md": "# Projects\n\n## Alpha\n\nBuilt an evidence system.\n",
  "data/repositories.md": "# Repository evidence\n\n## Alpha\n\n- Repository: https://github.com/example/alpha\n\n### BEGIN UNTRUSTED DOCUMENT: README.md\n\nQuoted material.\n",
};

test("emits identical stable IDs and canonical text to public JSON and the Worker module", async (context) => {
  const root = await createFixture(context);
  const result = await writeComparisonEvidence({ root });
  const publicCatalog = JSON.parse(await readFile(resolve(root, "public/evidence.json"), "utf8"));
  const workerCatalog = (await import(`${pathToFileURL(resolve(root, "src/data/comparison-evidence.js")).href}?v=${Date.now()}`)).default;

  assert.deepEqual(publicCatalog, result);
  assert.deepEqual(workerCatalog, result);
  assert.deepEqual(result.items.map(({ id }) => id), ["cv.profile", "project.alpha"]);
  assert.equal(result.items[0].text, "Canonical profile text.");
  assert.equal(result.items[1].supportingSources[0].url, "https://github.com/example/alpha");
  assert.equal(result.items[1].supportingSources[0].trust, "untrusted-secondary");
  assert.match(result.digest, /^sha256:[a-f0-9]{64}$/);
});

test("keeps IDs stable across unrelated Markdown movement and changes the digest for selected evidence", async (context) => {
  const root = await createFixture(context);
  const first = await buildComparisonEvidenceCatalog({ root, manifest: baseManifest });

  await writeFile(resolve(root, "data/cv.md"), "# CV\n\n## Other\n\nMoved.\n\n## Profile\n\nCanonical profile text.\n");
  const reordered = await buildComparisonEvidenceCatalog({ root, manifest: baseManifest });
  assert.deepEqual(reordered.items.map(({ id }) => id), first.items.map(({ id }) => id));
  assert.equal(reordered.digest, first.digest);

  await writeFile(resolve(root, "data/cv.md"), "# CV\n\n## Profile\n\nUpdated canonical profile text.\n");
  const changed = await buildComparisonEvidenceCatalog({ root, manifest: baseManifest });
  assert.notEqual(changed.digest, first.digest);
});

test("fails closed for invalid selectors, duplicate IDs, and non-public primary sources", async (context) => {
  const root = await createFixture(context);
  const cases = [
    [manifestWith({ source: { path: "data/cv.md", headingPath: ["Missing"] } }), /missing heading/i],
    [manifestWith({ source: { path: "data/cv.md", headingPath: ["Repeated"] } }), /ambiguous heading/i],
    [{ schemaVersion: 1, items: [baseManifest.items[0], baseManifest.items[0]] }, /duplicate evidence id/i],
    [manifestWith({ source: { path: "data/personal.md", headingPath: ["Secrets"] } }), /approved public source/i],
    [manifestWith({ source: { path: "data/repositories.md", headingPath: ["Alpha"] } }), /repository evidence cannot be primary/i],
  ];
  await writeFile(resolve(root, "data/cv.md"), "# CV\n\n## Repeated\n\nOne.\n\n## Repeated\n\nTwo.\n");

  for (const [manifest, expected] of cases) {
    await assert.rejects(buildComparisonEvidenceCatalog({ root, manifest }), expected);
  }
});

test("accepts repository support only as a secondary link attached to public primary evidence", async (context) => {
  const root = await createFixture(context);
  const catalog = await buildComparisonEvidenceCatalog({ root, manifest: baseManifest });
  assert.deepEqual(catalog.items[1].supportingSources, [{
    trust: "untrusted-secondary",
    url: "https://github.com/example/alpha",
    source: {
      path: "data/repositories.md",
      headingPath: ["Alpha"],
    },
  }]);

  await assert.rejects(buildComparisonEvidenceCatalog({
    root,
    manifest: manifestWith({
      supportingSources: [{ path: "data/cv.md", headingPath: ["Profile"] }],
    }),
  }), /repository support source/i);
});

test("rejects traversal selectors, sensitive strings, Markdown HTML, and unsafe links", async (context) => {
  const root = await createFixture(context);
  await assert.rejects(buildComparisonEvidenceCatalog({
    root,
    manifest: manifestWith({ source: { path: "../cv.md", headingPath: ["Profile"] } }),
  }), /approved public source|traversal/i);
  await assert.rejects(buildComparisonEvidenceCatalog({
    root,
    manifest: manifestWith({ source: { path: "data/cv.md", headingPath: ["../Profile"] } }),
  }), /unsafe heading selector/i);

  for (const [body, expected] of [
    ["Contact me at secret@example.com.", /sensitive string/i],
    ["<script>alert(1)</script>", /Markdown HTML/i],
    ["[unsafe](javascript:alert(1))", /unsafe link/i],
    ["[unsafe](data:text/plain,secret)", /unsafe link/i],
  ]) {
    await writeFile(resolve(root, "data/cv.md"), `# CV\n\n## Profile\n\n${body}\n`);
    await assert.rejects(buildComparisonEvidenceCatalog({
      root,
      manifest: manifestWith(),
    }), expected);
  }
});

test("rejects more than 48 items and serialized catalogs above 64 KiB", async (context) => {
  const root = await createFixture(context);
  const tooMany = {
    schemaVersion: 1,
    items: Array.from({ length: 49 }, (_, index) => ({
      id: `item.${index}`,
      source: { path: "data/cv.md", headingPath: ["Profile"] },
    })),
  };
  await assert.rejects(buildComparisonEvidenceCatalog({ root, manifest: tooMany }), /at most 48/i);

  await writeFile(resolve(root, "data/cv.md"), `# CV\n\n## Profile\n\n${"evidence ".repeat(9_000)}\n`);
  await assert.rejects(buildComparisonEvidenceCatalog({
    root,
    manifest: manifestWith(),
  }), /64 KiB/i);
});

function manifestWith(overrides = {}) {
  return {
    schemaVersion: 1,
    items: [{
      id: "cv.profile",
      source: { path: "data/cv.md", headingPath: ["Profile"] },
      ...overrides,
    }],
  };
}

async function createFixture(context) {
  const root = await mkdtemp(resolve(tmpdir(), "agent-cv-evidence-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    mkdir(resolve(root, "config"), { recursive: true }),
    mkdir(resolve(root, "data"), { recursive: true }),
  ]);
  await Promise.all(Object.entries(baseSources).map(([path, content]) => (
    writeFile(resolve(root, path), content)
  )));
  await writeFile(
    resolve(root, "config/comparison-evidence.json"),
    `${JSON.stringify(baseManifest, null, 2)}\n`,
  );
  return root;
}
