import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadOwner } from "./owner.mjs";
import { publicFiles } from "./sync-public-data.mjs";
import { renderHeaders } from "../site/templates/headers.mjs";
import { renderDiscovery } from "../site/templates/discovery.mjs";
import { renderHome } from "../site/templates/home.mjs";
import * as pages from "../site/templates/pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Every file under dir as a sorted, slash-separated relative path.
async function listFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, resolve(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(([, source]) => `sha256-${createHash("sha256").update(source).digest("base64")}`);
}

// Renders every generated page for a validated owner; keys are paths inside the site directory.
export function renderSite({ owner, site }) {
  const content = { owner, site };
  const html = {
    "index.html": renderHome(content),
    "about/index.html": pages.renderAbout(content),
    "experience/index.html": pages.renderExperience(content),
    "projects/index.html": pages.renderProjects(content),
    "cv/index.html": pages.renderCv(content),
    "contact/index.html": pages.renderContact(content),
    "privacy/index.html": pages.renderPrivacy(content),
    "application/index.html": pages.renderApplication(content),
    "admin/index.html": pages.renderAdmin(content),
    "404.html": pages.renderNotFound(content),
  };
  const scriptHashes = [...new Set(Object.values(html).flatMap(inlineScriptHashes))];
  return { ...html, ...renderDiscovery(content), "_headers": renderHeaders({ owner, scriptHashes }) };
}

// Replaces out with the engine assets, the synced public resources, the design tokens, the rendered
// pages, the public Markdown from dataRoot and the owner's social card.
export async function buildSite({ root: ownerRoot, owner, site, out = resolve(root, "build/site"), dataRoot = resolve(root, "data") }) {
  const files = renderSite({ owner, site });
  const card = resolve(ownerRoot, "assets/og-image.png");
  files["og-image.png"] = await readFile(card).catch((error) => {
    throw new Error(`${card} is missing; run npm run build:og-image`, { cause: error });
  });
  // Only the four public Markdown sources are published; the private data files never are.
  for (const file of publicFiles) files[file] = await readFile(resolve(dataRoot, file));
  await rm(out, { recursive: true, force: true });
  await cp(resolve(root, "site/assets"), out, { recursive: true });
  await cp(resolve(root, "public"), out, { recursive: true });
  await cp(resolve(root, "tokens.css"), resolve(out, "tokens.css"));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(resolve(out, path)), { recursive: true });
    await writeFile(resolve(out, path), content);
  }
  return listFiles(out);
}

async function main() {
  const files = await buildSite(await loadOwner());
  console.log(`Rendered ${files.length} files into build/site.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
