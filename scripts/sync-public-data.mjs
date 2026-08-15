import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicFiles = ["cv.md", "projects.md", "overview.md"];
const workerFiles = ["meta.md", "overview.md", "experience.md", "projects.md", "skills.md", "personal.md", "interests.md", "faq.md"];

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

console.log(`Synced ${publicFiles.length} public and ${workerFiles.length} Worker Markdown resources.`);
