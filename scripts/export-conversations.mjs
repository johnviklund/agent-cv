import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readAdminOrigin, validateAdminOrigin } from "./admin-origin.mjs";
import { readLocalAdminToken } from "./admin-secret-file.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArguments(process.argv.slice(2));
const token = await readLocalAdminToken(resolve(root, ".dev.vars")) || process.env.ADMIN_API_TOKEN;
if (!token) {
  console.error("Set ADMIN_API_TOKEN in the command environment before exporting.");
  process.exit(1);
}
const adminOrigin = options.url
  ? validateAdminOrigin(options.url)
  : await readAdminOrigin(resolve(root, "config", "admin-origin.json"));

const output = resolve(root, options.output || `exports/agent-cv-conversations-${new Date().toISOString().slice(0, 10)}.jsonl`);
await mkdir(dirname(output), { recursive: true });
const outputFile = await open(output, "w", 0o600);
try {
  let cursor = "";
  do {
    const endpoint = new URL("/api/admin/conversations", adminOrigin);
    endpoint.searchParams.set("limit", "250");
    if (cursor) endpoint.searchParams.set("cursor", cursor);
    const response = await fetch(endpoint, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || `Export failed with HTTP ${response.status}.`);
    }
    await outputFile.writeFile(await response.text());
    cursor = response.headers.get("x-archive-next-cursor") || "";
  } while (cursor);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await outputFile.close();
}
if (process.exitCode) process.exit(process.exitCode);
console.log(`Saved private conversation export to ${output}`);

function parseArguments(arguments_) {
  const options = { url: "" };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--url") options.url = arguments_[index += 1];
    else if (argument === "--output") options.output = arguments_[index += 1];
    else {
      console.error(`Unknown argument: ${argument}`);
      process.exit(1);
    }
  }
  return options;
}
