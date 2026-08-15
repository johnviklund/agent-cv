import { chmod, readFile, writeFile } from "node:fs/promises";

const ADMIN_TOKEN_LINE_PATTERN = /^ADMIN_API_TOKEN\s*=\s*(.*)$/m;

export async function readLocalAdminToken(envFile) {
  let source;
  try {
    source = await readFile(envFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }

  const raw = source.match(ADMIN_TOKEN_LINE_PATTERN)?.[1]?.trim() || "";
  if (raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    return raw.slice(1, -1);
  }
  return raw;
}

export async function writeLocalAdminToken(envFile, token) {
  let existing = "";
  try {
    existing = await readFile(envFile, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const line = `ADMIN_API_TOKEN=${token}`;
  const next = ADMIN_TOKEN_LINE_PATTERN.test(existing)
    ? existing.replace(ADMIN_TOKEN_LINE_PATTERN, line)
    : `${existing.trimEnd()}${existing.trim() ? "\n" : ""}${line}\n`;
  await writeFile(envFile, next, { mode: 0o600 });
  await chmod(envFile, 0o600);
}
