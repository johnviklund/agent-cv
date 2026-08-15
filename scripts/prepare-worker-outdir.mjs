import { mkdir, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outdir = resolve(root, ".wrangler-dist");

if (dirname(outdir) !== root || basename(outdir) !== ".wrangler-dist") {
  throw new Error("Refusing to clear an unexpected Worker output directory.");
}

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
