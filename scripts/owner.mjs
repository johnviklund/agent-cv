import { existsSync, realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultEngineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT_VARIABLES = ["AGENT_CV_OWNER_ROOT", "AGENT_CV_PRIVATE_ROOT"];

const realPath = (path) => (existsSync(path) ? realpathSync(path) : resolve(path));

// Compares real directories, so a symlink or another spelling of examples/owner is refused too.
function refuseExample(root, engineRoot) {
  if (realPath(root) === realPath(resolve(engineRoot, "examples/owner"))) {
    throw new Error("Refusing to deploy the example owner; set AGENT_CV_OWNER_ROOT");
  }
}

export function resolveOwnerRoot({ env = process.env, deploy = false, engineRoot = defaultEngineRoot } = {}) {
  const example = resolve(engineRoot, "examples/owner");
  const variable = ROOT_VARIABLES.find((name) => env[name]);
  let root;

  if (variable) {
    root = resolve(env[variable]);
    if (!existsSync(root)) throw new Error(`Owner root ${root} does not exist (from ${variable})`);
  } else {
    const sibling = resolve(engineRoot, "..", "agent-cv-private");
    root = existsSync(sibling) ? sibling : example;
  }

  if (deploy) refuseExample(root, engineRoot);
  return root;
}

// A JSON Schema subset: type, const, pattern, minLength, minItems, items, required,
// properties and additionalProperties. Throws on the first error with the file and field path.
export function validate(schema, value, file, path = "") {
  const fail = (message) => {
    throw new Error(`${file}: ${path || "(root)"} ${message}`);
  };
  const types = [schema.type ?? []].flat();

  if ("const" in schema && value !== schema.const) fail(`must be ${JSON.stringify(schema.const)}`);
  if (types.length && !types.includes(typeOf(value))) fail(`must be ${types.join(" or ")}`);
  if (typeof value === "string") {
    if (schema.minLength && value.length < schema.minLength) fail("must not be empty");
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) fail(`must match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) fail(`must have at least ${schema.minItems} item(s)`);
    value.forEach((item, index) => schema.items && validate(schema.items, item, file, `${path}[${index}]`));
  }
  if (typeOf(value) === "object") {
    const join = (key) => (path ? `${path}.${key}` : key);
    for (const key of schema.required ?? []) {
      if (value[key] === undefined) throw new Error(`${file}: ${join(key)} is required`);
    }
    for (const [key, item] of Object.entries(value)) {
      const property = Object.hasOwn(schema.properties ?? {}, key) ? schema.properties[key] : schema.additionalProperties;
      if (property === false || (property === undefined && schema.properties)) {
        throw new Error(`${file}: ${join(key)} is not allowed`);
      }
      if (property && property !== true) validate(property, item, file, join(key));
    }
  }
  return value;
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

async function readJson(path, file) {
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(`${file}: cannot read ${path}`, { cause: error });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${file}: invalid JSON (${error.message})`, { cause: error });
  }
}

export async function loadOwner({ root, env, deploy, engineRoot = defaultEngineRoot } = {}) {
  const ownerRoot = root ? resolve(root) : resolveOwnerRoot({ env, deploy, engineRoot });
  if (deploy) refuseExample(ownerRoot, engineRoot);
  const [ownerSchema, siteSchema, owner, site] = await Promise.all([
    readJson(resolve(engineRoot, "schemas/owner.schema.json"), "owner.schema.json"),
    readJson(resolve(engineRoot, "schemas/site.schema.json"), "site.schema.json"),
    readJson(resolve(ownerRoot, "owner.json"), "owner.json"),
    readJson(resolve(ownerRoot, "site.json"), "site.json"),
  ]);
  return {
    root: ownerRoot,
    owner: validate(ownerSchema, owner, "owner.json"),
    site: validate(siteSchema, site, "site.json"),
  };
}
