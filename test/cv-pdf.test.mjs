import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { buildCvPdf } from "../scripts/build-cv-pdf.mjs";
import { buildCvPrintHtml, countPdfPages } from "../scripts/cv-pdf.mjs";
import { ADA, GRACE } from "./fixtures/owners.mjs";
import { content, readSite } from "./fixtures/site.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const ownerCv = await readFile(resolve(content.root, "data/cv.md"), "utf8");

const grace = {
  ...GRACE,
  links: { linkedin: "https://www.linkedin.com/in/gracesample/", x: "https://x.com/gracesample", github: "https://github.com/gracesample" },
  contact: { email: "grace@grace.example" },
};
const ada = { ...ADA, links: { ...ADA.links, x: "https://x.com/adaexample" }, contact: { email: "ada@ada.example" } };
const ADA_CV = [
  "# Ada Example", "", "Staff engineer · Lisbon, Portugal", "",
  "## Experience", "", "### Example Systems — Staff engineer", "", "**2020–present**", "",
  "- Ran the consensus layer for a global ledger.", "", "## Capabilities", "", "- Distributed systems", "- Rust",
].join("\n");
const contacts = (html) => html.match(/<p class="contacts">(.*)<\/p>/)[1].replace(/<[^>]+>/g, "");

test("the CV PDF is built from the public CV with contacts and a link back to the site", async () => {
  const owner = { ...content.owner, links: grace.links, contact: grace.contact };
  const html = buildCvPrintHtml(ownerCv, owner);

  assert.ok(html.includes(`<h1>${owner.name.full}</h1>`));
  assert.match(html, /@page \{ size: Letter;/);
  assert.match(html, /href="mailto:grace@grace\.example"/);
  assert.match(html, /href="https:\/\/x\.com\/gracesample"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/gracesample\/"/);
  assert.ok(html.includes(`<a href="${owner.site.origin}">`));
  assert.doesNotMatch(html, /Selected transformation case studies|Selected applied-AI projects/);
  assert.ok(html.includes(`Generated automatically from ${owner.name.short}'s approved CV data`));
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
  const html = buildCvPrintHtml(markdown, ada);

  assert.match(html, /<li>First<\/li><li>Second<\/li><\/ul>/);
  assert.doesNotMatch(html, /Tool|Does one thing/);
  assert.match(html, /<p>Alpha · Beta<\/p>/);
  assert.match(html, /<h2>Capabilities<\/h2>\n<p>[^<]+ · /);
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

test("the CV header, footer and metadata name the selected owner", async () => {
  const cases = [
    [grace, ownerCv, "grace.example · grace@grace.example · x.com/gracesample · linkedin.com/in/gracesample", "Grace"],
    [ada, ADA_CV, "ada.example · ada@ada.example · x.com/adaexample", "Ada"],
  ];
  for (const [owner, markdown, line, short] of cases) {
    const html = buildCvPrintHtml(markdown, owner);
    assert.equal(contacts(html), line);
    assert.match(html, new RegExp(`<title>${owner.name.full} — CV</title>\n<meta name="author" content="${owner.name.full}">`));
    assert.match(html, new RegExp(`<footer>Generated automatically from ${short}'s approved CV data at <a href="${owner.site.origin}">`));
  }
  const adaHtml = buildCvPrintHtml(ADA_CV, ada);
  assert.doesNotMatch(adaHtml, /Grace|gracesample|gracewik/);
});

test("an owner without an email gets no email link or empty separator", () => {
  const html = buildCvPrintHtml(ADA_CV, { ...ada, contact: { email: null } });
  assert.equal(contacts(html), "ada.example · x.com/adaexample");
  assert.doesNotMatch(html, /mailto:/);
});

// Real Chromium; npm run check never launches it. Run with AGENT_CV_CHROMIUM_TESTS=1.
test("the printed PDF is named for the owner, fits two pages and carries readable owner text", {
  skip: !process.env.AGENT_CV_CHROMIUM_TESTS && "set AGENT_CV_CHROMIUM_TESTS=1",
}, async (context) => {
  const out = await mkdtemp(resolve(tmpdir(), "agent-cv-pdf-test-"));
  context.after(() => rm(out, { recursive: true, force: true }));
  const homeLink = (await readSite("index.html")).match(/href="\/([^"]+-cv\.pdf)"/)[1];
  const cases = [[content.owner, ownerCv, `${content.owner.slug}-cv.pdf`], [ada, ADA_CV, "ada-example-cv.pdf"]];
  for (const [owner, markdown, name] of cases) {
    const { path, pages } = await buildCvPdf({ owner, markdown, dir: out });
    assert.equal(path, resolve(out, name));
    assert.ok(pages >= 1 && pages <= 2);
    const text = execFileSync("pdftotext", [path, "-"], { encoding: "utf8" });
    assert.match(text, new RegExp(owner.name.full));
    assert.doesNotMatch(execFileSync("pdffonts", [path], { encoding: "utf8" }), /Type 3/);
    assert.doesNotMatch((await readFile(path)).toString("latin1"), /\/home\/|\/Users\/|file:\/\//);
    if (owner === ada) assert.doesNotMatch(text, /Grace|gracesample/);
  }
  assert.equal(homeLink, `${content.owner.slug}-cv.pdf`);
});
