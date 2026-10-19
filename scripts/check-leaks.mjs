import { readFile, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listFiles } from "./build-site.mjs";
import { resolveOwnerRoot } from "./owner.mjs";
import { UPSTREAM_URL } from "../site/templates/html.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function scanForLeaks(dirs) {
  const findings = [];
  for (const dir of dirs) {
    for (const file of await listFiles(dir)) {
      const path = resolve(dir, file);
      const text = (await readFile(path, "utf8")).replaceAll(UPSTREAM_URL, "");
      if (/john|viklund/i.test(text)) findings.push(path);
    }
  }
  return findings;
}

async function main() {
  if (await realpath(resolveOwnerRoot()) !== await realpath(resolve(root, "examples/owner"))) {
    console.log("Leak scan: skipped (selected owner is not examples/owner)");
    return;
  }
  const args = process.argv.slice(2);
  const dirs = args.length ? args : ["build/site", "public", "src/data"].map((dir) => resolve(root, dir));
  const findings = await scanForLeaks(dirs);
  console.log(`Leak scan: ${findings.length} findings`);
  for (const file of findings) console.error(file);
  if (findings.length) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
