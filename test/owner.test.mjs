import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOwner, resolveOwnerRoot } from "../scripts/owner.mjs";

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(engineRoot, "examples/owner");

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-owner-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("loadOwner returns the example owner, its site and its root", async () => {
  const { root, owner, site } = await loadOwner({ root: example });

  assert.equal(root, example);
  assert.equal(owner.name.full, "Ada Example");
  assert.equal(owner.slug, "ada-example");
  assert.equal(site.schemaVersion, 1);
});

test("loadOwner names the file and field of an invalid config", async (context) => {
  const owner = JSON.parse(await readFile(resolve(example, "owner.json"), "utf8"));
  const cases = [
    ["owner.json", { ...owner, site: { ...owner.site, origin: undefined } }, "owner.json: site.origin is required"],
    ["owner.json", { ...owner, slug: "Ada Example" }, "owner.json: slug must match ^[a-z0-9]+(-[a-z0-9]+)*$"],
    ["owner.json", { ...owner, site: { ...owner.site, extra: true } }, "owner.json: site.extra is not allowed"],
    ["site.json", { schemaVersion: 2 }, "site.json: schemaVersion must be 1"],
    ["site.json", "{ not json", /^site\.json: invalid JSON/],
  ];

  for (const [file, value, message] of cases) {
    const root = await tempDir(context);
    await cp(example, root, { recursive: true });
    await writeFile(resolve(root, file), typeof value === "string" ? value : JSON.stringify(value));
    await assert.rejects(loadOwner({ root }), (error) => {
      if (message instanceof RegExp) assert.match(error.message, message);
      else assert.equal(error.message, message);
      return true;
    });
  }
});

test("owner root resolves in order: owner root, private root, sibling, example", async (context) => {
  const workspace = await tempDir(context);
  const engine = resolve(workspace, "agent-cv");
  const sibling = resolve(workspace, "agent-cv-private");
  const explicit = resolve(workspace, "explicit");
  await Promise.all([engine, explicit].map((dir) => mkdir(dir, { recursive: true })));

  assert.equal(resolveOwnerRoot({ env: {}, engineRoot: engine }), resolve(engine, "examples/owner"));
  await mkdir(sibling);
  assert.equal(resolveOwnerRoot({ env: {}, engineRoot: engine }), sibling);
  assert.equal(resolveOwnerRoot({ env: { AGENT_CV_PRIVATE_ROOT: explicit }, engineRoot: engine }), explicit);
  assert.equal(
    resolveOwnerRoot({ env: { AGENT_CV_OWNER_ROOT: explicit, AGENT_CV_PRIVATE_ROOT: sibling }, engineRoot: engine }),
    explicit,
  );
});

test("a missing explicit owner root is an error, never a fallback", () => {
  for (const deploy of [false, true]) {
    assert.throws(
      () => resolveOwnerRoot({ env: { AGENT_CV_OWNER_ROOT: "/missing" }, deploy, engineRoot }),
      { message: "Owner root /missing does not exist (from AGENT_CV_OWNER_ROOT)" },
    );
  }
});

test("deploy refuses the example owner", async (context) => {
  const lonelyEngine = resolve(await tempDir(context), "agent-cv");
  const cases = [
    { env: {}, engineRoot: lonelyEngine },
    { env: { AGENT_CV_OWNER_ROOT: example }, engineRoot },
  ];

  for (const options of cases) {
    assert.throws(() => resolveOwnerRoot({ ...options, deploy: true }), {
      message: "Refusing to deploy the example owner; set AGENT_CV_OWNER_ROOT",
    });
  }
});

test("inherited property names are checked against the schema like any other key", async (context) => {
  const owner = JSON.parse(await readFile(resolve(example, "owner.json"), "utf8"));
  // Spreading parsed JSON keeps "__proto__" as an own key, as JSON.parse does for a real file.
  const own = (key, value) => JSON.parse(`{${JSON.stringify(key)}:${JSON.stringify(value)}}`);
  const rejected = [];
  for (const key of ["constructor", "toString", "__proto__"]) {
    rejected.push(
      [{ ...owner, ...own(key, {}) }, `owner.json: ${key} is not allowed`],
      [{ ...owner, site: { ...owner.site, ...own(key, "x") } }, `owner.json: site.${key} is not allowed`],
      [{ ...owner, deploy: { ...owner.deploy, ...own(key, "x") } }, `owner.json: deploy.${key} is not allowed`],
      [{ ...owner, links: { ...owner.links, ...own(key, 5) } }, `owner.json: links.${key} must be string or null`],
      [{ ...owner, deploy: { ...owner.deploy, vars: own(key, 5) } }, `owner.json: deploy.vars.${key} must be string`],
    );
  }
  const accepted = { ...owner, links: { ...owner.links, ...own("constructor", "https://example.com") },
    deploy: { ...owner.deploy, vars: own("__proto__", "value") } };

  for (const [value, message] of rejected) {
    const root = await tempDir(context);
    await cp(example, root, { recursive: true });
    await writeFile(resolve(root, "owner.json"), JSON.stringify(value));
    await assert.rejects(loadOwner({ root }), { message });
  }
  const root = await tempDir(context);
  await cp(example, root, { recursive: true });
  await writeFile(resolve(root, "owner.json"), JSON.stringify(accepted));
  assert.equal((await loadOwner({ root })).owner.links.constructor, "https://example.com");
});
