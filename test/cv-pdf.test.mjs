import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCvPrintHtml, countPdfPages } from "../scripts/cv-pdf.mjs";
import { content, readSite } from "./fixtures/site.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the CV PDF is built from the public CV with contacts and a link back to the site", async () => {
  const html = buildCvPrintHtml(await read("data/cv.md"), { email: "johnwik@gmail.com" });

  assert.match(html, /<h1>John Viklund<\/h1>/);
  assert.match(html, /@page \{ size: Letter;/);
  assert.match(html, /href="mailto:johnwik@gmail\.com"/);
  assert.match(html, /href="https:\/\/x\.com\/johnviklund"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/johnviklund\/"/);
  assert.match(html, /<footer>[^<]*<a href="https:\/\/johnviklund\.com">/);
  assert.match(html, /<h2>Capabilities<\/h2>\n<p>[^<]+ · /);
  assert.doesNotMatch(html, /Selected transformation case studies|Selected applied-AI projects/);
  assert.match(html, /Generated automatically from John's approved CV data/);
  assert.doesNotMatch(html, /tel:|@font-face|file:\/\//i);
});

test("the CV PDF keeps every role bullet, omits projects, and joins capabilities", () => {
  const markdown = [
    "# Name", "", "## Experience", "",
    "### Axient — Manager", "", "- First", "- Second", "",
    "## Selected applied-AI projects", "", "### Tool", "", "Does one thing. Then more.", "",
    "## Capabilities", "", "- Alpha", "- Beta", "",
    "---", "", "Data last updated: 1 May 2026. More.",
  ].join("\n");
  const html = buildCvPrintHtml(markdown, { email: "a@example.com" });

  assert.match(html, /<li>First<\/li><li>Second<\/li><\/ul>/);
  assert.doesNotMatch(html, /Tool|Does one thing/);
  assert.match(html, /<p>Alpha · Beta<\/p>/);
  assert.match(html, /Updated 1 May 2026/);
});

test("PDF page counting ignores the page tree node", () => {
  const pdf = Buffer.from("<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page /Parent 1 0 R >>", "latin1");
  assert.equal(countPdfPages(pdf), 2);
});

test("deploy always regenerates the ignored PDF", async () => {
  const [pkg, gitignore, headers] = await Promise.all([
    read("package.json").then(JSON.parse),
    read(".gitignore"),
    readSite("_headers"),
  ]);

  assert.match(pkg.scripts.deploy, /npm run sync:data && npm run build:site && npm run build:cv-pdf && .*wrangler deploy/);
  assert.match(gitignore, /^build\/$/m);
  const pdf = `${content.owner.slug}-cv.pdf`;
  assert.ok(headers.includes(`/${pdf}\n  Content-Type: application/pdf\n  Content-Disposition: inline; filename="${pdf}"`));
});
