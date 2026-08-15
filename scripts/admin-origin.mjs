import { readFile } from "node:fs/promises";

export async function readAdminOrigin(configFile) {
  let config;
  try {
    config = JSON.parse(await readFile(configFile, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("The trusted admin origin is not configured. Set it in config/admin-origin.json.");
    }
    throw new Error("The trusted admin origin configuration is invalid.");
  }
  return validateAdminOrigin(config?.origin);
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
