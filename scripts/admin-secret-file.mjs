import { chmod, readFile, writeFile } from "node:fs/promises";

export async function writeLocalAdminToken(envFile, token) {
  let existing = "";
  try {
    existing = await readFile(envFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const line = `ADMIN_API_TOKEN=${token}`;
  const next = /^ADMIN_API_TOKEN=.*$/m.test(existing)
    ? existing.replace(/^ADMIN_API_TOKEN=.*$/m, line)
    : `${existing.trimEnd()}${existing.trim() ? "\n" : ""}${line}\n`;
  await writeFile(envFile, next, { mode: 0o600 });
  await chmod(envFile, 0o600);
}
