import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { Writable } from "node:stream";
import { validate } from "./owner.mjs";
import { configureAdminSecret, runCommand } from "./configure-admin-secret.mjs";
import { writeWranglerConfig } from "./wrangler-config.mjs";

const root = resolve(import.meta.dirname, "..");
async function prompt(question, { secret = false } = {}) {
  const output = secret ? new Writable({ write(_chunk, _encoding, next) { next(); } }) : process.stdout;
  const reader = createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });
  if (secret) process.stdout.write(`${question}: `);
  try { return await reader.question(secret ? "" : `${question}: `); }
  finally { reader.close(); if (secret) process.stdout.write("\n"); }
}

export async function runSetup({ args = process.argv.slice(2), env = process.env, run = runCommand,
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
  const { OPENAI_API_KEY, ...environment } = env;
  await run("git", ["init"], { cwd: target, env: environment });
  if (!values["skip-cloud"]) {
    const cloudEnv = { ...environment, AGENT_CV_OWNER_ROOT: target, NODE_EXTRA_CA_CERTS: "/etc/ssl/cert.pem" };
    delete cloudEnv.SSL_CERT_FILE;
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
    const retryEnv = `AGENT_CV_OWNER_ROOT=${quote(target)}`;
    const step = async (name, retry, action) => {
      try { return await action(); }
      catch { throw new Error(`${name} failed. Owner directory kept at ${target}. Retry: ${retryEnv} ${retry}`); }
    };
    await writeWranglerConfig({ engineRoot, env: cloudEnv });
    const namespace = `${owner.deploy.workerName}-archive`;
    await step("wrangler kv namespace create", `npx wrangler kv namespace create ${namespace}; copy the returned id into ${target}/owner.json deploy.archiveNamespaceId`, async () => {
      const { stdout } = await run(npx, ["wrangler", "kv", "namespace", "create", namespace], { cwd: engineRoot, env: cloudEnv });
      const id = stdout.match(/"id"\s*:\s*"([a-f0-9]{32})"/i)?.[1];
      if (!id) throw new Error("Namespace response has no id.");
      owner.deploy.archiveNamespaceId = id;
      await writeFile(resolve(target, "owner.json"), `${JSON.stringify(owner, null, 2)}\n`);
    });
    await writeWranglerConfig({ engineRoot, env: cloudEnv });
    await step("OPENAI_API_KEY", "npx wrangler secret put OPENAI_API_KEY", async () => {
      const key = OPENAI_API_KEY || (isTTY && await ask("OpenAI API key", { secret: true }));
      if (!key) throw new Error("Provide OPENAI_API_KEY or run in a terminal.");
      await run(npx, ["wrangler", "secret", "put", "OPENAI_API_KEY"], { cwd: engineRoot, env: cloudEnv, input: `${key}\n` });
    });
    await step("ADMIN_API_TOKEN", "npm run setup:admin", () => configureAdminSecret({ engineRoot, env: cloudEnv, run }));
  }
  return { root: target, owner, message: `Created owner directory ${target}.\nSet AGENT_CV_OWNER_ROOT to this directory.\nReplace Ada Example's content and regenerate the social card before running npm run deploy.` };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runSetup().then(({ message }) => console.log(message)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
