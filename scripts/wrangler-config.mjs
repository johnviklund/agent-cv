import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadOwner } from "./owner.mjs";

const defaultEngineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The engine's wrangler.base.jsonc with the owner's worker, archive namespace, custom domains and vars.
// contact.email alone decides CONTACT_EMAIL, so deploy.vars can neither set nor keep it.
export function buildWranglerConfig(owner, base) {
  const { CONTACT_EMAIL, ...vars } = { ...base.vars, ...owner.deploy.vars };
  const config = {
    ...base,
    name: owner.deploy.workerName,
    routes: owner.site.hosts
      .filter((host) => !host.endsWith(".workers.dev"))
      .map((pattern) => ({ pattern, custom_domain: true })),
    kv_namespaces: base.kv_namespaces.map((namespace) => (
      namespace.binding === "ARCHIVE" ? { ...namespace, id: owner.deploy.archiveNamespaceId } : namespace
    )),
    vars: owner.contact.email ? { ...vars, CONTACT_EMAIL: owner.contact.email } : vars,
  };
  // Arrays of plain values stay on one line, as in the hand-written config this replaces.
  const value = String.raw`(?:"(?:[^"\\]|\\.)*"|-?[\d.]+|true|false|null)`;
  const flatArray = new RegExp(String.raw`\[\s+(${value}(?:,\s+${value})*)\s+\]`, "g");
  const flatten = (_, items) => `[${JSON.parse(`[${items}]`).map((item) => JSON.stringify(item)).join(", ")}]`;
  return `${JSON.stringify(config, null, 2).replace(flatArray, flatten)}\n`;
}

// Writes the selected owner's root wrangler.jsonc and returns its text. The rename keeps a parallel
// reader from seeing a half-written file.
export async function writeWranglerConfig({ engineRoot = defaultEngineRoot, deploy = false } = {}) {
  const [{ owner }, base] = await Promise.all([
    loadOwner({ deploy, engineRoot }),
    readFile(resolve(engineRoot, "wrangler.base.jsonc"), "utf8").then(JSON.parse),
  ]);
  const text = buildWranglerConfig(owner, base);
  const target = resolve(engineRoot, "wrangler.jsonc");
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, text);
  await rename(temporary, target);
  return text;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  writeWranglerConfig({ deploy: process.argv.includes("--deploy") }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
