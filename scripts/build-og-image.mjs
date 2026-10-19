import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Renders the 1200×630 social preview card used by og:image and twitter:image.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "site", "assets", "og-image.png");
const WIDTH = 1200;
const HEIGHT = 630;

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
  throw new Error("Chromium is required to build /og-image.png. Install it or set CHROME_PATH.");
}

const tokens = await readFile(resolve(root, "tokens.css"), "utf8");
const font = (name) => pathToFileURL(resolve(root, "site", "assets", "fonts", name)).href;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
${tokens}
@font-face { font-family: "Archivo"; font-weight: 700 900; src: url("${font("archivo-latin.woff2")}") format("woff2"); }
@font-face { font-family: "Inter"; font-weight: 400 700; src: url("${font("inter-latin.woff2")}") format("woff2"); }
@font-face { font-family: "JetBrains Mono"; font-weight: 400 500; src: url("${font("jetbrains-mono-latin.woff2")}") format("woff2"); }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
body {
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 72px 88px 64px; background: var(--color-canvas); color: var(--color-ink);
  font-family: var(--font-body); border-top: 6px solid var(--color-accent);
}
.eyebrow { color: var(--color-muted); font-size: 26px; }
h1 { margin-top: 30px; font-family: var(--font-display); font-weight: 800; font-size: 128px; line-height: .95; letter-spacing: -.04em; }
h1 span { color: var(--color-accent); }
.deck { margin-top: 30px; color: var(--color-ink-2); font-size: 30px; line-height: 1.4; }
footer { display: flex; justify-content: space-between; align-items: baseline; padding-top: 26px; border-top: 1px solid var(--color-rule); font-size: 26px; }
.url { font-family: var(--font-mono); color: var(--color-ink-2); }
.cta { color: var(--color-accent); font-weight: 600; }
</style></head><body>
<div>
  <p class="eyebrow">CX AI Lead at Volvo Cars · Gothenburg, Sweden</p>
  <h1>John <span>Viklund.</span></h1>
  <p class="deck">Applied-AI builder and product leader.</p>
</div>
<footer><span class="url">johnviklund.com</span><span class="cta">Ask my agent →</span></footer>
</body></html>`;

const workDir = await mkdtemp(join(tmpdir(), "agent-cv-og-"));
try {
  const htmlPath = join(workDir, "og.html");
  await writeFile(htmlPath, html);
  execFileSync(findChromium(), [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--user-data-dir=${join(workDir, "profile")}`,
    `--screenshot=${output}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
} finally {
  await rm(workDir, { recursive: true, force: true });
}

console.log(`Built site/assets/og-image.png (${Math.round((await stat(output)).size / 1024)} KB).`);
