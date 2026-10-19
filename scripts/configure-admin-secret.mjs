import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeLocalAdminToken } from "./admin-secret-file.mjs";
import { writeWranglerConfig } from "./wrangler-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Wrangler must target the selected owner's Worker; this also refuses the example owner before any token exists.
await writeWranglerConfig({ engineRoot: root, deploy: true }).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
const envFile = resolve(root, ".dev.vars");
const token = randomBytes(32).toString("hex");
await writeLocalAdminToken(envFile, token);

const environment = { ...process.env, NODE_EXTRA_CA_CERTS: "/etc/ssl/cert.pem" };
delete environment.SSL_CERT_FILE;
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["wrangler", "secret", "put", "ADMIN_API_TOKEN"], {
  cwd: root,
  env: environment,
  stdio: ["pipe", "inherit", "inherit"],
});
child.stdin.end(`${token}\n`);
const exitCode = await new Promise((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", resolveExit);
});
if (exitCode !== 0) {
  console.error("Cloudflare secret setup failed. The generated token remains in .dev.vars for a retry.");
  process.exit(exitCode || 1);
}

console.log("Configured ADMIN_API_TOKEN in Cloudflare and saved the same private token to .dev.vars.");
