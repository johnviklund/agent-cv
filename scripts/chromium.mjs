import { execFileSync } from "node:child_process";

// The first Chromium that answers --version: CHROME_PATH, then the usual command names.
export function findChromium(artifact) {
  const candidates = [process.env.CHROME_PATH, "chromium", "chromium-browser", "google-chrome-stable", "google-chrome"].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // Try the next browser.
    }
  }
  throw new Error(`Chromium is required to build ${artifact}. Install it or set CHROME_PATH.`);
}
