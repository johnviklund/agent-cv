import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findChromium } from "./chromium.mjs";
import { loadOwner } from "./owner.mjs";
import { escapeHtml as e } from "../site/templates/html.mjs";

// Renders the owner's 1200×630 social preview card used by og:image and twitter:image.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 630;

const tokens = readFileSync(resolve(root, "tokens.css"), "utf8");
const font = (name) => pathToFileURL(resolve(root, "site", "assets", "fonts", name)).href;

// The card's HTML: "<tagline> · <location>", the name with its last part accented, the headline and
// the site's host.
export function buildCardHtml(owner) {
  const eyebrow = [owner.tagline, owner.location].filter(Boolean).map(e).join(" · ");
  const full = owner.name.full;
  const space = full.indexOf(" ");
  const name = space < 0 ? `<span>${e(full)}.</span>` : `${e(full.slice(0, space))} <span>${e(full.slice(space + 1))}.</span>`;
  const deck = /[.!?]$/.test(owner.headline) ? owner.headline : `${owner.headline}.`;
  return `<!doctype html>
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
  <p class="eyebrow">${eyebrow}</p>
  <h1>${name}</h1>
  <p class="deck">${e(deck)}</p>
</div>
<footer><span class="url">${e(new URL(owner.site.origin).host)}</span><span class="cta">Ask my agent →</span></footer>
</body></html>`;
}

// Writes <owner root>/assets/og-image.png, the card npm run build:site publishes.
export async function buildCard({ root: ownerRoot, owner }) {
  const output = resolve(ownerRoot, "assets", "og-image.png");
  const workDir = await mkdtemp(join(tmpdir(), "agent-cv-og-"));
  try {
    const htmlPath = join(workDir, "og.html");
    await writeFile(htmlPath, buildCardHtml(owner));
    await mkdir(dirname(output), { recursive: true });
    execFileSync(findChromium("/og-image.png"), [
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
  return output;
}

async function main() {
  const output = await buildCard(await loadOwner());
  console.log(`Built ${output} (${Math.round((await stat(output)).size / 1024)} KB).`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
