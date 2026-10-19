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
  return `${format(config)}\n`;
}

// JSON.stringify(value, null, 2), except that arrays of plain values stay on one line, as in the
// hand-written config this replaces. Strings are only ever written by JSON.stringify.
function format(value, indent = "") {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value) && value.every((item) => typeof item !== "object")) {
    return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  }
  const inner = `${indent}  `;
  const items = Array.isArray(value)
    ? value.map((item) => format(item, inner))
    : Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${format(item, inner)}`);
  const [open, close] = Array.isArray(value) ? "[]" : "{}";
  return items.length ? `${open}\n${inner}${items.join(`,\n${inner}`)}\n${indent}${close}` : `${open}${close}`;
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
