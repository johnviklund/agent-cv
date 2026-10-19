import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { registerHooks } from "node:module";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadOwner, resolveOwnerRoot } from "./owner.mjs";

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

// The site is built fresh for the selected owner into a temporary directory, so no earlier build leaks in.
export async function collectOutputs({ root = engineRoot } = {}) {
  const outputs = {};
  const site = await mkdtemp(resolve(tmpdir(), "agent-cv-golden-"));
  try {
    // Imported here so the argument checks run without the site templates.
    const { buildSite } = await import(pathToFileURL(resolve(root, "scripts/build-site.mjs")).href);
    await buildSite({ ...(await loadOwner()), out: site });
    for (const file of await listFiles(site)) outputs[`site/${file}`] = await readFile(resolve(site, file));
  } finally {
    await rm(site, { recursive: true, force: true });
  }

  const module = (path) => import(pathToFileURL(resolve(root, path)).href);
  const [{ knowledge, owner, updatedAt }, { buildSystemPrompt }, { buildComparisonInstructions }] = await Promise.all([
    module("src/knowledge.js"),
    module("src/chat-core.js"),
    module("src/comparison-core.js"),
  ]);
  outputs["prompts/system.txt"] = Buffer.from(buildSystemPrompt(knowledge, { owner, updatedAt }));
  outputs["prompts/comparison.txt"] = Buffer.from(buildComparisonInstructions());
  const { writeWranglerConfig } = await module("scripts/wrangler-config.mjs");
  outputs["wrangler.jsonc"] = Buffer.from(await writeWranglerConfig({ engineRoot: root }));
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

const digestPattern = /^sha256:[0-9a-f]{64}$/;
const digest = (content) => `sha256:${createHash("sha256").update(content).digest("hex")}`;

// Approved technical differences: each names a path, its exact old and new digests (null when the
// path is added or removed), a reason and the reviewed diff. Prompts never take an exception.
export function parseExceptions({ exceptions = [] } = {}) {
  for (const entry of exceptions) {
    const path = String(entry?.path ?? "");
    if (path.startsWith("prompts/")) throw new Error(`Prompt exceptions are not allowed: ${path}`);
    for (const key of ["before", "after"]) {
      if (entry[key] !== null && !digestPattern.test(entry[key])) throw new Error(`${path} ${key} must be a sha256: digest or null`);
    }
    if (typeof entry.reason !== "string" || !entry.reason.trim()) throw new Error(`${path} needs a reason`);
    if (typeof entry.diff !== "string" || !entry.diff.trim()) throw new Error(`${path} needs a reviewed diff`);
  }
  return exceptions;
}

// Splits a diff into changes an exception matches exactly and changes no exception covers.
export async function reviewGolden(dir, outputs, exceptions) {
  const { changed, added, removed } = await diffGolden(dir, outputs);
  const stored = async (path) => digest(await readFile(resolve(dir, path)));
  const accepted = [];
  const unlisted = [];
  for (const [kind, paths] of [["changed", changed], ["added", added], ["removed", removed]]) {
    for (const path of paths) {
      const before = kind === "added" ? null : await stored(path);
      const after = kind === "removed" ? null : digest(outputs[path]);
      const match = exceptions.find((entry) => entry.path === path && entry.before === before && entry.after === after);
      if (match) accepted.push({ kind, path, reason: match.reason });
      else unlisted.push({ kind, path });
    }
  }
  return { accepted, unlisted };
}

async function readExceptions(file) {
  const text = await readFile(file, "utf8").catch((error) => (error.code === "ENOENT" ? null : Promise.reject(error)));
  return text === null ? [] : parseExceptions(JSON.parse(text));
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
  const exceptions = command === "diff" ? await readExceptions(resolve(ownerRoot, "golden-exceptions.json")) : [];
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
  const { accepted, unlisted } = await reviewGolden(dir, outputs, exceptions);
  const lines = [
    ...accepted.map(({ kind, path, reason }) => `accepted ${kind} ${path}: ${reason}`),
    ...unlisted.map(({ kind, path }) => `${kind.padEnd(7)} ${path}`),
  ];
  console.log(lines.length ? lines.join("\n") : "Golden diff: empty");
  return unlisted.length ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
