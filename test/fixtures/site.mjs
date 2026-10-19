import { rmSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { buildSite } from "../../scripts/build-site.mjs";
import { loadOwner } from "../../scripts/owner.mjs";

// The selected owner's built site, as npm run build:site produces it, in a directory removed on exit.
export const content = await loadOwner();
export const siteDir = await mkdtemp(resolve(tmpdir(), "agent-cv-test-site-"));
process.on("exit", () => rmSync(siteDir, { recursive: true, force: true }));
await buildSite({ ...content, out: siteDir });

export const readSite = (path, encoding = "utf8") => readFile(resolve(siteDir, path), encoding);
