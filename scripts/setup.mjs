import { execFile } from "node:child_process";
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";
import { validate } from "./owner.mjs";

const root = resolve(import.meta.dirname, "..");
const command = promisify(execFile);
async function prompt(question) {
  const reader = createInterface({ input: process.stdin, output: process.stdout });
  try { return await reader.question(`${question}: `); }
  finally { reader.close(); }
}

export async function runSetup({ args = process.argv.slice(2), env = process.env, run = command,
  ask = prompt, isTTY = Boolean(process.stdin.isTTY), engineRoot = root } = {}) {
  const { values } = parseArgs({ args, options: {
    name: { type: "string" }, slug: { type: "string" }, domain: { type: "string" },
    target: { type: "string" }, "skip-cloud": { type: "boolean" },
  } });
  for (const flag of ["name", "slug", "domain"]) {
    if (!values[flag]) {
      if (!isTTY) throw new Error(`Missing --${flag}; supply it when running without a terminal.`);
      values[flag] = await ask(flag);
    }
    values[flag] = values[flag].trim();
    if (!values[flag]) throw new Error(`--${flag} must not be empty.`);
  }
  const target = resolve(values.target ?? resolve(engineRoot, "..", "agent-cv-private"));
  const owner = JSON.parse(await readFile(resolve(engineRoot, "examples/owner/owner.json"), "utf8"));
  owner.slug = values.slug;
  owner.name = { full: values.name, short: values.name.split(/\s+/)[0] };
  owner.site.origin = `https://${values.domain}`;
  owner.site.hosts = [values.domain, `www.${values.domain}`];
  owner.deploy.workerName = `${values.slug}-agent-cv`;
  owner.links.github = null;
  const schema = JSON.parse(await readFile(resolve(root, "schemas/owner.schema.json"), "utf8"));
  validate(schema, owner, "owner.json");
  try {
    if ((await readdir(target)).length) throw new Error(`Target ${target} is not empty; choose an empty directory.`);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(target, { recursive: true });
  await cp(resolve(engineRoot, "examples/owner"), target, { recursive: true });
  await writeFile(resolve(target, "owner.json"), `${JSON.stringify(owner, null, 2)}\n`);
  await run("git", ["init"], { cwd: target, env });
  return { root: target, owner, message: `Created owner directory ${target}.\nSet AGENT_CV_OWNER_ROOT to this directory.\nReplace Ada Example's content and regenerate the social card before running npm run deploy.` };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runSetup().then(({ message }) => console.log(message)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
