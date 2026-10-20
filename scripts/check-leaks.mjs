import { execFileSync } from "node:child_process";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { listFiles } from "./build-site.mjs";
import { resolveOwnerRoot } from "./owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const LEAK_SCAN_DIRS = ["build/site", "public", "src/data"].map((dir) => resolve(root, dir));

const upstreamSlug = "johnviklund/agent-cv";
const containsLeak = (text) => /john|viklund/i.test(text.replaceAll(upstreamSlug, ""));

export async function scanTrackedFiles(dir = process.cwd()) {
  let files;
  try {
    files = execFileSync("git", ["ls-files", "-z"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).split("\0").filter(Boolean);
  } catch {
    throw new Error(`Leak scan: not a git checkout: ${dir}`);
  }
  const findings = [];
  for (const file of files) {
    if (file.startsWith(".workflow/") || ["WORKLOG.md", "scripts/check-leaks.mjs"].includes(file)) continue;
    const path = resolve(dir, file);
    const bytes = (await lstat(path)).isSymbolicLink() ? Buffer.from(await readlink(path)) : await readFile(path);
    if (bytes.includes(0)) continue;
    let text = bytes.toString("utf8");
    if (file === "LICENSE") text = text.replace(/^Copyright \(c\) 2026 John Viklund\r?$/m, "");
    if (file === "README.md") text = text.replace(/^Maintained by John Viklund\. johnviklund\.com is one deployment\.\r?$/m, "");
    if (containsLeak(text)) findings.push(resolve(dir, file));
  }
  return findings;
}

export async function scanForLeaks(dirs) {
  const findings = [];
  for (const dir of dirs) {
    for (const file of await listFiles(dir)) {
      const path = resolve(dir, file);
      const bytes = await readFile(path);
      if (!bytes.includes(0) && containsLeak(bytes.toString("utf8"))) findings.push(path);
    }
  }
  return findings;
}

async function main() {
  const findings = await scanTrackedFiles();
  if (await realpath(resolveOwnerRoot()) === await realpath(resolve(root, "examples/owner"))) {
    const args = process.argv.slice(2);
    findings.push(...await scanForLeaks(args.length ? args : LEAK_SCAN_DIRS));
  } else {
    console.log("Leak scan: output scan skipped (selected owner is not examples/owner)");
  }
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
