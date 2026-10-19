import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildCardHtml } from "../scripts/build-og-image.mjs";
import { buildSite } from "../scripts/build-site.mjs";
import { loadOwner, resolveOwnerRoot } from "../scripts/owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, "examples/owner");
const run = promisify(execFile);

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-og-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

const eyebrow = (html) => html.match(/<p class="eyebrow">([^<]*)<\/p>/)?.[1];

test("og card names the owner, their headline and domain, and escapes owner text", async () => {
  const { owner: ada } = await loadOwner({ root: example });
  const html = buildCardHtml(ada);
  assert.equal(eyebrow(html), "Lisbon, Portugal");
  assert.match(html, /<h1>Ada <span>Example\.<\/span><\/h1>/);
  assert.match(html, /<p class="deck">Staff engineer, distributed systems\.<\/p>/);
  assert.match(html, /<span class="url">ada\.example<\/span>/);
  assert.doesNotMatch(html, /John|Viklund|Volvo|johnviklund/);

  for (const [name, changes, expected] of [
    ["tagline and location", { tagline: "Staff engineer at Example" }, "Staff engineer at Example · Lisbon, Portugal"],
    ["tagline alone", { tagline: "Staff engineer", location: undefined }, "Staff engineer"],
    ["escaped tagline", { tagline: "R&D <b>lead</b>" }, "R&amp;D &lt;b&gt;lead&lt;/b&gt; · Lisbon, Portugal"],
  ]) assert.equal(eyebrow(buildCardHtml({ ...ada, ...changes })), expected, name);
  const named = buildCardHtml({ ...ada, name: { full: "Ada <i>Lovelace</i>", short: "Ada" } });
  assert.match(named, /<h1>Ada <span>&lt;i&gt;Lovelace&lt;\/i&gt;\.<\/span><\/h1>/);
});

// A stand-in browser that answers --version and copies the rendered card HTML to the screenshot path.
async function fakeChromium(dir) {
  const path = resolve(dir, "fake-chromium");
  await writeFile(path, `#!/usr/bin/env node
const fs = require("node:fs");
const shot = process.argv.find((arg) => arg.startsWith("--screenshot="));
if (shot) fs.copyFileSync(new URL(process.argv.at(-1)), shot.slice("--screenshot=".length));
`);
  await chmod(path, 0o755);
  return path;
}

test("og card CLI writes the selected owner's card, buildSite publishes those bytes, and a missing card fails", async (context) => {
  const dir = await tempDir(context);
  const ownerRoot = resolve(dir, "owner");
  for (const file of ["owner.json", "site.json"]) await cp(resolve(example, file), resolve(ownerRoot, file));
  const owner = JSON.parse(await readFile(resolve(ownerRoot, "owner.json"), "utf8"));
  await writeFile(resolve(ownerRoot, "owner.json"), JSON.stringify({ ...owner, tagline: "Staff engineer at Example" }));
  const env = { ...process.env, AGENT_CV_OWNER_ROOT: ownerRoot, CHROME_PATH: await fakeChromium(dir) };

  await run(process.execPath, [resolve(root, "scripts/build-og-image.mjs")], { env });
  const card = await readFile(resolve(ownerRoot, "assets/og-image.png"));
  assert.match(card.toString("utf8"), /<p class="eyebrow">Staff engineer at Example · Lisbon, Portugal<\/p>/);

  const out = resolve(dir, "site");
  await buildSite({ ...(await loadOwner({ root: ownerRoot })), out });
  assert.ok((await readFile(resolve(out, "og-image.png"))).equals(card), "published card");

  await rm(resolve(ownerRoot, "assets"), { recursive: true });
  await assert.rejects(buildSite({ ...(await loadOwner({ root: ownerRoot })), out }), /npm run build:og-image/);
});

test("og cards live in each owner root, never in the engine assets", () => {
  assert.equal(existsSync(resolve(root, "site/assets/og-image.png")), false);
  assert.equal(existsSync(resolve(example, "assets/og-image.png")), true);
});

// Real Chromium; npm run check never launches it. Run with AGENT_CV_CHROMIUM_TESTS=1 and John's owner root.
test("og card CLI regenerates John's committed card byte for byte", {
  skip: (!process.env.AGENT_CV_CHROMIUM_TESTS && "set AGENT_CV_CHROMIUM_TESTS=1")
    || (!existsSync(resolve(resolveOwnerRoot(), "golden")) && "needs John's owner root"),
}, async (context) => {
  const ownerRoot = resolve(await tempDir(context), "owner");
  await cp(resolveOwnerRoot(), ownerRoot, { recursive: true, filter: (path) => !path.includes("/golden") && !path.includes("/.git") });
  const committed = await readFile(resolve(ownerRoot, "assets/og-image.png"));
  await run(process.execPath, [resolve(root, "scripts/build-og-image.mjs")], { env: { ...process.env, AGENT_CV_OWNER_ROOT: ownerRoot } });
  assert.ok((await readFile(resolve(ownerRoot, "assets/og-image.png"))).equals(committed));
});
