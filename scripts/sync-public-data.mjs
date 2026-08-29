import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeComparisonEvidence } from "./build-comparison-evidence.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicFiles = ["cv.md", "projects.md", "overview.md", "repositories.md"];
const workerFiles = ["meta.md", "overview.md", "experience.md", "projects.md", "repositories.md", "skills.md", "personal.md", "interests.md", "faq.md"];

await mkdir(resolve(root, "public"), { recursive: true });
await mkdir(resolve(root, "src", "data"), { recursive: true });
await Promise.all([
  ...publicFiles.map((file) => copyFile(
    resolve(root, "data", file),
    resolve(root, "public", file),
  )),
  ...workerFiles.map((file) => copyFile(
    resolve(root, "data", file),
    resolve(root, "src", "data", file),
  )),
]);

const comparisonEvidence = await writeComparisonEvidence({ root });

console.log(`Synced ${publicFiles.length} public and ${workerFiles.length} Worker Markdown resources, plus ${comparisonEvidence.items.length} comparison evidence items.`);
