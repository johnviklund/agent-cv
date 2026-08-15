import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleRequest } from "../src/worker.js";

const contactPage = await readFile(new URL("../public/contact/index.html", import.meta.url), "utf8");
const workerConfig = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
const publicTree = (await readTree(fileURLToPath(new URL("../public/", import.meta.url))))
  .map(({ path, source }) => `${path}\n${source}`)
  .join("\n");

async function readTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readTree(path);
    return [{ path, source: await readFile(path, "utf8") }];
  }));
  return files.flat();
}

test("contact page promotes the deliberate public channels", () => {
  assert.match(contactPage, /href=["']https:\/\/www\.linkedin\.com\/in\/[^"'\s/?#]+\/["'][^>]*\brel=["']me["']/i);
  assert.match(contactPage, /<[^>]+\bdata-contact-value\b[^>]*>[^<]*\bLinkedIn\b[^<]*<\/[^>]+>/i);
});

test("deployable public files exclude unselected contact channels", () => {
  assert.doesNotMatch(publicTree, /href\s*=\s*["']https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^"'\s/?#]+/i);
  assert.doesNotMatch(publicTree, /href\s*=\s*["']tel:/i);
  assert.doesNotMatch(publicTree, /\+\d(?:[\s().-]*\d){7,14}\b/);
  assert.doesNotMatch(publicTree, /\b\d{9,15}\b/);
  assert.doesNotMatch(publicTree, /\b(?:\d{2,4}[ .-]){2,3}\d{3,4}\b/);
});

test("contact endpoint leaves the LinkedIn fallback in place without an email", async () => {
  const response = await handleRequest(
    new Request("https://example.test/api/contact"),
    {},
    {},
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { email: null });
  assert.match(contactPage, /<[^>]+\bdata-contact-value\b[^>]*>[^<]*\bLinkedIn\b[^<]*<\/[^>]+>/i);
});

test("deployment config publishes the selected contact email", () => {
  assert.match(workerConfig, /"CONTACT_EMAIL":\s*"johnwik@gmail\.com"/);
});
