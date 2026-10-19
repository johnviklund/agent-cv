import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findChromium } from "./chromium.mjs";
import { buildCvPrintHtml, countPdfPages } from "./cv-pdf.mjs";
import { loadOwner } from "./owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAX_PAGES = 2;

// Prints <dir>/<slug>-cv.pdf and checks it stays 1–2 pages of real text fonts with no local paths.
export async function buildCvPdf({ owner, markdown, dir }) {
  const name = `/${owner.slug}-cv.pdf`;
  const output = join(dir, name);
  const workDir = await mkdtemp(join(tmpdir(), "agent-cv-pdf-"));
  try {
    const htmlPath = join(workDir, "cv.html");
    // Static system fonts embed as real text fonts; the site's variable web font prints as Type 3 glyphs.
    await writeFile(htmlPath, buildCvPrintHtml(markdown, owner));
    await mkdir(dirname(output), { recursive: true });
    execFileSync(findChromium(name), [
      "--headless=new",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--user-data-dir=${join(workDir, "profile")}`,
      `--print-to-pdf=${output}`,
      pathToFileURL(htmlPath).href,
    ], { stdio: "ignore" });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  const pdf = await readFile(output);
  const pages = countPdfPages(pdf);
  if (pages < 1 || pages > MAX_PAGES) {
    throw new Error(`${name} must be 1–${MAX_PAGES} pages; generated ${pages}. Shorten data/cv.md or the omitted sections.`);
  }
  if (/\/Subtype\s*\/Type3/.test(pdf.toString("latin1"))) {
    throw new Error(`${name} uses Type 3 fonts; use static fonts so applicant tracking systems can read it.`);
  }
  if (/\/home\/|\/Users\/|file:\/\//.test(pdf.toString("latin1"))) {
    throw new Error(`${name} contains a local file path.`);
  }
  return { path: output, pages, size: pdf.length };
}

async function main() {
  const { root: ownerRoot, owner } = await loadOwner();
  // Written into the built site after npm run build:site, which replaces build/site.
  const { pages, size } = await buildCvPdf({
    owner,
    markdown: await readFile(resolve(ownerRoot, "data", "cv.md"), "utf8"),
    dir: resolve(root, "build", "site"),
  });
  console.log(`Built build/site/${owner.slug}-cv.pdf (${pages} pages, ${Math.round(size / 1024)} KB).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
