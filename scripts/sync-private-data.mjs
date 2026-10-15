import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const privateDataFiles = Object.freeze([
  "experience.md",
  "faq.md",
  "interests.md",
  "meta.md",
  "personal.md",
  "skills.md",
]);

export async function syncPrivateData({ sourceRoot, destinationRoot = root }) {
  const sourceData = resolve(sourceRoot, "data");
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

  return { files: [...privateDataFiles], sourceData, destinationData };
}

function parseSourceRoot(argumentsList) {
  let source;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--source") {
      source = argumentsList[index + 1];
      if (!source) throw new Error("--source requires a path.");
      index += 1;
    } else if (argument.startsWith("--source=")) {
      source = argument.slice("--source=".length);
      if (!source) throw new Error("--source requires a path.");
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return resolve(source || process.env.AGENT_CV_PRIVATE_ROOT || resolve(root, "..", "agent-cv-private"));
}

async function main() {
  const sourceRoot = parseSourceRoot(process.argv.slice(2));
  const result = await syncPrivateData({ sourceRoot });
  console.log(`Synced ${result.files.length} private data files from ${result.sourceData}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
