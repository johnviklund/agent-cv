import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadOwner } from "./owner.mjs";
import { renderHeaders } from "../site/templates/headers.mjs";
import { renderHome } from "../site/templates/home.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(([, source]) => `sha256-${createHash("sha256").update(source).digest("base64")}`);
}

// Renders every generated page for a validated owner; keys are paths inside the site directory.
export function renderSite({ owner, site }) {
  const index = renderHome({ owner, site });
  return {
    "index.html": index,
    "_headers": renderHeaders({ owner, scriptHashes: inlineScriptHashes(index) }),
  };
}

async function main() {
  const out = resolve(root, "build/site");
  const pages = renderSite(await loadOwner());
  await rm(out, { recursive: true, force: true });
  for (const [path, content] of Object.entries(pages)) {
    await mkdir(dirname(resolve(out, path)), { recursive: true });
    await writeFile(resolve(out, path), content);
  }
  console.log(`Rendered ${Object.keys(pages).length} files into ${out}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
