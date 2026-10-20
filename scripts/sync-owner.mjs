import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadOwner } from "./owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const privateDataFiles = Object.freeze([
  "experience.md",
  "faq.md",
  "interests.md",
  "meta.md",
  "personal.md",
  "skills.md",
]);

// Validates the owner config, then copies the six private files; nothing is written on failure.
export async function syncOwner({ sourceRoot, destinationRoot = root, deploy = false, env = process.env }) {
  const { root: ownerRoot, owner } = await loadOwner({
    env: sourceRoot ? { AGENT_CV_OWNER_ROOT: sourceRoot } : env,
    deploy,
  });
  if (deploy) {
    const exampleImage = await readFile(resolve(root, "examples/owner/assets/og-image.png"));
    const directories = [""];
    const remaining = [];
    while (directories.length) {
      const directory = directories.pop();
      for (const entry of await readdir(resolve(ownerRoot, directory), { withFileTypes: true })) {
        if (!directory && !["owner.json", "site.json", "data", "assets", "repositories.json", "comparison-evidence.json"].includes(entry.name)) continue;
        if (entry.name === ".git") continue;
        const path = directory ? `${directory}/${entry.name}` : entry.name;
        if (entry.isDirectory()) directories.push(path);
        else if (entry.isFile()) {
          const content = await readFile(resolve(ownerRoot, path));
          if (content.includes("Ada Example") || (path === "assets/og-image.png" && content.equals(exampleImage))) {
            remaining.push(path);
          }
        }
      }
    }
    if (remaining.length) throw new Error(`Refusing to deploy example content in: ${remaining.sort().join(", ")}. Replace Ada Example's text and regenerate the social image.`);
  }
  const sourceData = resolve(ownerRoot, "data");
  const destinationData = resolve(destinationRoot, "data");
  let contents;

  try {
    contents = await Promise.all(
      privateDataFiles.map((file) => readFile(resolve(sourceData, file))),
    );
  } catch (error) {
    throw new Error(
      `Private data source is incomplete at ${sourceData}. Expected: ${privateDataFiles.join(", ")}.`,
      { cause: error },
    );
  }

  await mkdir(destinationData, { recursive: true });
  await Promise.all(
    privateDataFiles.map((file, index) => writeFile(resolve(destinationData, file), contents[index])),
  );

  return { owner, files: [...privateDataFiles], sourceData, destinationData };
}

function parseArguments(argumentsList) {
  let source;
  let deploy = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--source") {
      source = argumentsList[index + 1];
      if (!source) throw new Error("--source requires a path.");
      index += 1;
    } else if (argument.startsWith("--source=")) {
      source = argument.slice("--source=".length);
      if (!source) throw new Error("--source requires a path.");
    } else if (argument === "--deploy") {
      deploy = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return { sourceRoot: source && resolve(source), deploy };
}

async function main() {
  const result = await syncOwner(parseArguments(process.argv.slice(2)));
  console.log(`Synced ${result.files.length} private data files for ${result.owner.slug} from ${result.sourceData}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
