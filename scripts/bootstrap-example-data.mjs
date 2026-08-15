import { copyFile, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["meta.md", "experience.md", "skills.md", "personal.md", "interests.md", "faq.md"];
await mkdir(resolve(root, "data"), { recursive: true });

let created = 0;
for (const file of files) {
  try {
    await copyFile(
      resolve(root, "examples", "private-data", file),
      resolve(root, "data", file),
      constants.COPYFILE_EXCL,
    );
    created += 1;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

console.log(`Created ${created} missing example data files; preserved ${files.length - created} existing private files.`);
