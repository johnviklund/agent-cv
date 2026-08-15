import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedFiles = [
  "experience.md",
  "faq.md",
  "interests.md",
  "meta.md",
  "personal.md",
  "skills.md",
];
const publicDataFiles = ["cv.md", "overview.md", "projects.md", "repositories.md"];
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

async function isIgnored(checkout, file) {
  try {
    await execFileAsync("git", ["check-ignore", "--quiet", "--", file], { cwd: checkout });
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
}

test("a fresh checkout bootstraps only the safe example data and preserves later edits", async (context) => {
  const checkout = await mkdtemp(resolve(tmpdir(), "agent-cv-bootstrap-"));
  context.after(() => rm(checkout, { recursive: true, force: true }));

  await mkdir(resolve(checkout, "scripts"), { recursive: true });
  await cp(
    resolve(root, "scripts", "bootstrap-example-data.mjs"),
    resolve(checkout, "scripts", "bootstrap-example-data.mjs"),
  );
  await cp(
    resolve(root, "examples", "private-data"),
    resolve(checkout, "examples", "private-data"),
    { recursive: true },
  );
  await Promise.all([
    cp(resolve(root, ".gitignore"), resolve(checkout, ".gitignore")),
    cp(resolve(root, "package.json"), resolve(checkout, "package.json")),
  ]);
  await execFileAsync("git", ["init", "--quiet"], { cwd: checkout });

  const initiallyReviewedData = "# Reviewed private data before first bootstrap\n\nKeep this exact content.\n";
  await mkdir(resolve(checkout, "data"), { recursive: true });
  await writeFile(resolve(checkout, "data", "meta.md"), initiallyReviewedData);

  const firstRun = await execFileAsync(npmCommand, ["run", "bootstrap:data"], {
    cwd: checkout,
  });
  assert.match(firstRun.stdout, /Created 5 missing example data files; preserved 1 existing private files\./);
  assert.deepEqual((await readdir(resolve(checkout, "data"))).sort(), expectedFiles);

  for (const file of expectedFiles) {
    const [created, example] = await Promise.all([
      readFile(resolve(checkout, "data", file), "utf8"),
      readFile(resolve(checkout, "examples", "private-data", file), "utf8"),
    ]);
    assert.equal(
      created,
      file === "meta.md" ? initiallyReviewedData : example,
      `${basename(file)} must be created from the public example bundle or preserve reviewed data`,
    );
  }

  const exampleBundle = await Promise.all(expectedFiles.map((file) => (
    readFile(resolve(checkout, "examples", "private-data", file), "utf8")
  )));
  assert.doesNotMatch(
    exampleBundle.join("\n"),
    /John(?:'s)?|Viklund|johnwik@gmail\.com|johnviklund|linkedin\.com\/in\/johnviklund/i,
    "safe fork data must not retain the original profile owner's identity or contact details",
  );

  for (const [index, file] of expectedFiles.entries()) {
    await writeFile(
      resolve(checkout, "data", file),
      `# Reviewed ${file}\n\nKeep private revision ${index + 1} exact.\n`,
    );
  }

  for (const file of expectedFiles) {
    assert.equal(await isIgnored(checkout, `data/${file}`), true, `${file} must be ignored`);
  }
  for (const file of publicDataFiles) {
    assert.equal(await isIgnored(checkout, `data/${file}`), false, `${file} must remain trackable`);
  }

  const secondRun = await execFileAsync(npmCommand, ["run", "bootstrap:data"], {
    cwd: checkout,
  });
  assert.match(secondRun.stdout, /Created 0 missing example data files; preserved 6 existing private files\./);
  for (const [index, file] of expectedFiles.entries()) {
    assert.equal(
      await readFile(resolve(checkout, "data", file), "utf8"),
      `# Reviewed ${file}\n\nKeep private revision ${index + 1} exact.\n`,
      `${file} must remain byte-for-byte unchanged`,
    );
  }
});
