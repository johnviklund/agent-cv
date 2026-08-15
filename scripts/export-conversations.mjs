import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArguments(process.argv.slice(2));
const token = process.env.ADMIN_API_TOKEN || await localAdminToken();
if (!token) {
  console.error("Set ADMIN_API_TOKEN in the command environment before exporting.");
  process.exit(1);
}

const endpoint = new URL("/api/admin/conversations", options.url);
const response = await fetch(endpoint, {
  headers: { authorization: `Bearer ${token}` },
});
if (!response.ok) {
  const problem = await response.json().catch(() => ({}));
  console.error(problem.error || `Export failed with HTTP ${response.status}.`);
  process.exit(1);
}

const output = resolve(root, options.output || `exports/agent-cv-conversations-${new Date().toISOString().slice(0, 10)}.jsonl`);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, await response.text(), { mode: 0o600 });
console.log(`Saved private conversation export to ${output}`);

function parseArguments(arguments_) {
  const options = { url: "https://john-viklund-agent-cv.agent-cv.workers.dev" };
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

async function localAdminToken() {
  try {
    const source = await readFile(resolve(root, ".dev.vars"), "utf8");
    return source.match(/^ADMIN_API_TOKEN=(.+)$/m)?.[1]?.trim() || "";
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}
