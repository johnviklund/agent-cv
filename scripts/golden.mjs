import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { registerHooks } from "node:module";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveOwnerRoot } from "./owner.mjs";

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The Worker imports data/*.md as Text modules; Node needs the same rule to render the prompt.
registerHooks({
  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !url.endsWith(".md")) return nextLoad(url, context);
    const text = readFileSync(fileURLToPath(url), "utf8");
    return { format: "module", source: `export default ${JSON.stringify(text)};`, shortCircuit: true };
  },
});

async function listFiles(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, resolve(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

export async function collectOutputs({ root = engineRoot } = {}) {
  const outputs = {};
  const site = resolve(root, "public");
  for (const file of await listFiles(site)) {
    if (file.endsWith(".pdf") || file.endsWith(".DS_Store")) continue;
    outputs[`site/${file}`] = await readFile(resolve(site, file));
  }

  const module = (path) => import(pathToFileURL(resolve(root, path)).href);
  const [{ knowledge }, { buildSystemPrompt }, { buildComparisonInstructions }] = await Promise.all([
    module("src/knowledge.js"),
    module("src/chat-core.js"),
    module("src/comparison-core.js"),
  ]);
  outputs["prompts/system.txt"] = Buffer.from(buildSystemPrompt(knowledge));
  outputs["prompts/comparison.txt"] = Buffer.from(buildComparisonInstructions());
  outputs["wrangler.jsonc"] = await readFile(resolve(root, "wrangler.jsonc"));
  return outputs;
}

export async function writeGolden(dir, outputs) {
  await rm(dir, { recursive: true, force: true });
  for (const [path, content] of Object.entries(outputs)) {
    await mkdir(dirname(resolve(dir, path)), { recursive: true });
    await writeFile(resolve(dir, path), content);
  }
}

export async function diffGolden(dir, outputs) {
  const stored = await listFiles(dir);
  const changed = [];
  for (const path of stored) {
    if (path in outputs && !(await readFile(resolve(dir, path))).equals(outputs[path])) changed.push(path);
  }
  return {
    changed,
    added: Object.keys(outputs).filter((path) => !stored.includes(path)).sort(),
    removed: stored.filter((path) => !(path in outputs)),
  };
}

function parseArguments([command, ...args]) {
  if (command !== "capture" && command !== "diff") throw new Error("Usage: golden.mjs capture|diff [--golden <dir>]");
  let dir;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== "--golden") throw new Error(`Unknown argument: ${args[index]}`);
    dir = args[index + 1];
    if (!dir) throw new Error("--golden requires a path.");
    index += 1;
  }
  return { command, dir };
}

// The real path of `path`, or of its nearest existing ancestor joined with the rest.
function canonical(path) {
  const rest = [];
  let current = resolve(path);
  while (!existsSync(current) && current !== dirname(current)) {
    rest.unshift(basename(current));
    current = dirname(current);
  }
  return resolve(realpathSync(current), ...rest);
}

// Capture replaces its directory, so it must never be a checkout or hold one.
function refuseRoots(dir, roots) {
  const target = canonical(dir);
  const prefix = target.endsWith(sep) ? target : target + sep;
  for (const root of roots) {
    const real = canonical(root);
    if (real === target || real.startsWith(prefix)) throw new Error(`Refusing to replace ${dir}: it holds ${root}`);
  }
}

async function main(argv) {
  const { command, dir: requested } = parseArguments(argv);
  const ownerRoot = resolveOwnerRoot();
  const dir = resolve(requested ?? resolve(ownerRoot, "golden"));
  if (command === "capture") refuseRoots(dir, [engineRoot, ownerRoot]);
  const outputs = await collectOutputs();

  if (command === "capture") {
    await writeGolden(dir, outputs);
    console.log(`Golden snapshot: ${Object.keys(outputs).length} files in ${dir}`);
    return 0;
  }

  if (!(await stat(dir).catch(() => null))?.isDirectory()) {
    console.error(`No golden snapshot at ${dir}; run npm run golden:capture`);
    return 1;
  }
  const { changed, added, removed } = await diffGolden(dir, outputs);
  const lines = [
    ...changed.map((path) => `changed ${path}`),
    ...added.map((path) => `added   ${path}`),
    ...removed.map((path) => `removed ${path}`),
  ];
  console.log(lines.length ? lines.join("\n") : "Golden diff: empty");
  return lines.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
