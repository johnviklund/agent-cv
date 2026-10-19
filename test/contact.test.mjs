import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { handleRequest } from "../src/worker.js";
import { content, readSite, siteDir } from "./fixtures/site.mjs";

const contactPage = await readSite("contact/index.html");
const workerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
// John's contact channels are owner content; the example owner configures none of them.
const johnOnly = { skip: content.owner.slug !== "john-viklund" && "needs John's owner root" };
const publicTree = (await readTree(siteDir))
  .map(({ path, source }) => `${path}\n${source}`)
  .join("\n");

async function readTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readTree(path);
    // Fonts and images are binary; the deploy-built PDF's text comes from cv.md, which is scanned.
    if (/\.(pdf|png|woff2)$/.test(entry.name)) return [];
    return [{ path, source: await readFile(path, "utf8") }];
  }));
  return files.flat();
}

test("contact page promotes the deliberate public channels", johnOnly, () => {
  assert.match(contactPage, /href=["']https:\/\/www\.linkedin\.com\/in\/[^"'\s/?#]+\/["'][^>]*\brel=["'](?:[^"']*\s)?me(?:\s[^"']*)?["']/i);
  assert.match(contactPage, /href=["']mailto:johnwik@gmail\.com["']/i);
  assert.match(contactPage, /href=["']https:\/\/x\.com\/johnviklund["'][^>]*\brel=["'](?:[^"']*\s)?me(?:\s[^"']*)?["']/i);
  assert.doesNotMatch(contactPage, /temporarily unavailable/i);
});

test("deployable public files exclude unselected contact channels", () => {
  const socialLinks = publicTree.match(/href\s*=\s*["']https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^"'\s?#]*/gi) || [];
  for (const link of socialLinks) assert.equal(link.replace(/^href\s*=\s*["']/, ""), content.owner.links.x);
  assert.doesNotMatch(publicTree, /href\s*=\s*["']tel:/i);
  assert.doesNotMatch(publicTree, /\+\d(?:[\s().-]*\d){7,14}\b/);
  assert.doesNotMatch(publicTree, /\b\d{9,15}\b/);
  assert.doesNotMatch(publicTree, /\b(?:\d{2,4}[ .-]){2,3}\d{3,4}\b/);
});

test("contact endpoint can report no configured email without removing the static direct route", johnOnly, async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/contact"),
    {},
    {},
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: null });
  assert.match(contactPage, /href=["']mailto:johnwik@gmail\.com["']/i);
});

test("agent guidance keeps the published email when the endpoint returns null", { skip: !content.owner.contact.email && "the owner publishes no email" }, async () => {
  const [agents, llms] = await Promise.all([
    readSite("AGENTS.md"),
    readSite("llms.txt"),
  ]);

  for (const guidance of [agents, llms]) {
    assert.match(guidance, /mailto:/i);
    assert.match(guidance, /returns? `null`|endpoint returns `null`/i);
    assert.match(guidance, /LinkedIn[^.]*additional[^.]*not a replacement/i);
    assert.match(guidance, /never infer or guess/i);
  }
});

test("deployment config publishes the selected contact email", () => {
  assert.match(workerConfig, /"CONTACT_EMAIL":\s*"johnwik@gmail\.com"/);
});
