import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(resolve(root, "wrangler.jsonc"), "utf8"));
const failures = [];
const workerRoot = resolve(root, config.base_dir);

if (config.no_bundle !== true) failures.push("no_bundle must remain true");
if (config.find_additional_modules !== true) {
  failures.push("find_additional_modules must remain true so Wrangler discovers the import closure");
}
if (workerRoot !== resolve(root, "src")) {
  failures.push("base_dir must remain ./src so emitted module names match static import specifiers");
}

const moduleRules = config.rules ?? [];
assertNarrowRule("ESModule", ["**/*.js"]);
assertNarrowRule("Text", ["data/meta.md", "data/overview.md", "data/experience.md", "data/projects.md", "data/repositories.md", "data/skills.md", "data/personal.md", "data/interests.md", "data/faq.md"]);
assertNarrowRule("CompiledWasm", ["**/*.wasm"]);

const budgetBinding = config.durable_objects?.bindings?.find((binding) => binding.name === "CHAT_BUDGET");
if (budgetBinding?.class_name !== "BudgetCounter") {
  failures.push("CHAT_BUDGET must bind to the BudgetCounter Durable Object");
}
if (!config.migrations?.some((migration) => migration.new_sqlite_classes?.includes("BudgetCounter"))) {
  failures.push("a Durable Object migration must create the BudgetCounter SQLite class");
}

const importedModules = await collectImports(config.main);
for (const modulePath of importedModules) {
  const type = extname(modulePath) === ".js" ? "ESModule" : extname(modulePath) === ".md" ? "Text" : null;
  if (!type) {
    failures.push(`unsupported Worker dependency type: ${modulePath}`);
    continue;
  }

  const absoluteModulePath = resolve(root, modulePath);
  if (!absoluteModulePath.startsWith(`${workerRoot}${sep}`) && absoluteModulePath !== workerRoot) {
    failures.push(`${modulePath} is outside configured Worker base_dir`);
    continue;
  }
  const rulePath = absoluteModulePath.slice(workerRoot.length + 1).split(sep).join(posix.sep);
  const covered = moduleRules
    .filter((rule) => rule.type === type)
    .some((rule) => rule.globs?.some((glob) => globMatches(rulePath, glob)));
  if (!covered) failures.push(`${modulePath} is imported but not covered by a ${type} upload rule`);
}

const outdirIndex = process.argv.indexOf("--outdir");
if (outdirIndex !== -1) {
  const outdir = process.argv[outdirIndex + 1];
  if (!outdir) {
    failures.push("--outdir requires the Wrangler dry-run output directory");
  } else {
    await verifyDryRunOutput(outdir, importedModules);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Worker package rules cover ${importedModules.size} imported modules: ${[...importedModules].join(", ")}`);
}

function assertNarrowRule(type, expectedGlobs) {
  const rules = moduleRules.filter((rule) => rule.type === type);
  if (rules.length !== 1
    || JSON.stringify(rules[0].globs) !== JSON.stringify(expectedGlobs)
    || rules[0].fallthrough !== false) {
    failures.push(`${type} upload rule must use only ${expectedGlobs.join(", ")}`);
  }
}

async function collectImports(entry) {
  const found = new Set();

  async function visit(relativePath) {
    const normalized = relativePath.split(sep).join(posix.sep);
    if (found.has(normalized)) return;
    found.add(normalized);

    if (extname(normalized) !== ".js") return;
    const source = await readFile(resolve(root, normalized), "utf8");
    const importPattern = /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) continue;
      const resolvedPath = resolve(root, dirname(normalized), specifier);
      if (!resolvedPath.startsWith(`${workerRoot}${sep}`)) {
        failures.push(`${normalized} imports a file outside base_dir: ${specifier}`);
        continue;
      }
      await visit(resolvedPath.slice(root.length + 1));
    }
  }

  await visit(entry);
  return found;
}

function globMatches(path, glob) {
  let pattern = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*" && glob[index + 1] === "*") {
      if (glob[index + 2] === "/") {
        pattern += "(?:.*/)?";
        index += 2;
      } else {
        pattern += ".*";
        index += 1;
      }
    } else if (character === "*") {
      pattern += "[^/]*";
    } else {
      pattern += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${pattern}$`).test(path);
}

async function verifyDryRunOutput(outdir, modules) {
  for (const modulePath of modules) {
    const emittedName = emittedModuleName(modulePath);
    const emittedPath = resolve(root, outdir, emittedName);
    try {
      const [source, emitted] = await Promise.all([
        readFile(resolve(root, modulePath)),
        readFile(emittedPath),
      ]);
      if (!source.equals(emitted)) failures.push(`dry-run changed or truncated ${modulePath}`);
    } catch {
      failures.push(`Wrangler dry-run omitted imported module ${modulePath}`);
    }
  }

  const expected = new Set([...modules].map(emittedModuleName));
  expected.add("README.md");
  for (const emitted of await collectFiles(resolve(root, outdir))) {
    if (!expected.has(emitted)) failures.push(`Wrangler dry-run included unexpected module ${emitted}`);
  }
}

function emittedModuleName(modulePath) {
  if (modulePath === config.main) return posix.basename(config.main);
  return resolve(root, modulePath).slice(workerRoot.length + 1).split(sep).join(posix.sep);
}

async function collectFiles(directory, prefix = "") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await collectFiles(resolve(directory, entry.name), relative));
    else files.push(relative);
  }
  return files;
}
