import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveOwnerRoot } from "./owner.mjs";

const NOT_CONFIGURED = "The trusted admin origin is not configured. Set site.origin in the owner's owner.json.";

// An explicit override, else the selected owner's site.origin; either is validated before any request.
export async function adminOrigin(override, options) {
  return override ? validateAdminOrigin(override) : readAdminOrigin(options);
}

// The environment selects the owner root, never the origin itself. The example owner is refused, so a
// missing owner checkout cannot send an admin token to the example's domain.
export async function readAdminOrigin({ env = process.env, engineRoot } = {}) {
  let owner;
  try {
    owner = JSON.parse(await readFile(resolve(resolveOwnerRoot({ env, engineRoot, deploy: true }), "owner.json"), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") throw new Error(NOT_CONFIGURED);
    if (error instanceof SyntaxError) throw new Error("The trusted admin origin configuration is invalid.");
    throw error;
  }
  if (!owner?.site?.origin) throw new Error(NOT_CONFIGURED);
  return validateAdminOrigin(owner.site.origin);
}

export function validateAdminOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The trusted admin origin must be a valid HTTPS origin.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The trusted admin origin must be a valid HTTPS origin.");
  }
  return url.origin;
}
