import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { writeLocalAdminToken } from "./admin-secret-file.mjs";
import { writeWranglerConfig } from "./wrangler-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function runCommand(command, args, { input = "", ...options }) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { ...options, stdio: ["pipe", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.once("error", reject);
    child.stdin.on("error", (error) => { if (error.code !== "EPIPE") reject(error); });
    child.once("close", (code) => code === 0 ? resolveRun({ stdout }) : reject(new Error(`${command} failed with exit ${code}.`)));
    child.stdin.end(input);
  });
}

export async function configureAdminSecret({ engineRoot = root, env = process.env, run = runCommand } = {}) {
  // Regenerate before writing the token, so the selected owner always decides the Worker.
  await writeWranglerConfig({ engineRoot, env, deploy: true });
  const token = randomBytes(32).toString("hex");
  await writeLocalAdminToken(resolve(engineRoot, ".dev.vars"), token);
  const environment = { ...env, NODE_EXTRA_CA_CERTS: "/etc/ssl/cert.pem" };
  delete environment.SSL_CERT_FILE;
  try {
    await run(process.platform === "win32" ? "npx.cmd" : "npx", ["wrangler", "secret", "put", "ADMIN_API_TOKEN"], {
      cwd: engineRoot, env: environment, input: `${token}\n`,
    });
  } catch {
    throw new Error("Cloudflare ADMIN_API_TOKEN setup failed. The generated token remains in .dev.vars for a retry.");
  }
  return "Configured ADMIN_API_TOKEN in Cloudflare and saved the same private token to .dev.vars.";
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  configureAdminSecret().then(console.log).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
