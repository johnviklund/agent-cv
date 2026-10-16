import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildCvPrintHtml, countPdfPages } from "./cv-pdf.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "public", "cv.pdf");
const MAX_PAGES = 2;

function findChromium() {
  const candidates = [process.env.CHROME_PATH, "chromium", "chromium-browser", "google-chrome-stable", "google-chrome"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next browser.
    }
  }
  throw new Error("Chromium is required to build /cv.pdf. Install it or set CHROME_PATH.");
}

const [markdown, workerConfig] = await Promise.all([
  readFile(resolve(root, "data", "cv.md"), "utf8"),
  readFile(resolve(root, "wrangler.jsonc"), "utf8").then(JSON.parse),
]);
const email = workerConfig.vars?.CONTACT_EMAIL;
if (!email) throw new Error("wrangler.jsonc must define vars.CONTACT_EMAIL for the CV header.");

const workDir = await mkdtemp(join(tmpdir(), "agent-cv-pdf-"));
try {
  const htmlPath = join(workDir, "cv.html");
  // Static system fonts embed as real text fonts; the site's variable web font prints as Type 3 glyphs.
  await writeFile(htmlPath, buildCvPrintHtml(markdown, { email }));
  execFileSync(findChromium(), [
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
  throw new Error(`/cv.pdf must be 1–${MAX_PAGES} pages; generated ${pages}. Shorten data/cv.md or the omitted sections.`);
}
if (/\/Subtype\s*\/Type3/.test(pdf.toString("latin1"))) {
  throw new Error("/cv.pdf uses Type 3 fonts; use static fonts so applicant tracking systems can read it.");
}
if (/\/home\/|\/Users\/|file:\/\//.test(pdf.toString("latin1"))) {
  throw new Error("/cv.pdf contains a local file path.");
}
console.log(`Built public/cv.pdf (${pages} pages, ${Math.round(pdf.length / 1024)} KB).`);
