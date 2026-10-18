// Builds the print-only HTML for /john-viklund-cv.pdf from the canonical public CV.
// Kept free of filesystem and browser access so it can be tested directly.
import { escapeHtml } from "../site/templates/html.mjs";

const OMITTED_SECTIONS = new Set(["Selected transformation case studies", "Selected applied-AI projects"]);
// Sections whose bullets are joined into one compact paragraph.
const INLINE_LIST_SECTIONS = new Set(["Capabilities"]);
const SITE_URL = "https://johnviklund.com";

export function buildCvPrintHtml(markdown, { email }) {
  const { body, updated } = parseCv(markdown);
  const contacts = [
    link(SITE_URL, "johnviklund.com"),
    link(`mailto:${email}`, email),
    link("https://x.com/johnviklund", "x.com/johnviklund"),
    link("https://www.linkedin.com/in/johnviklund/", "linkedin.com/in/johnviklund"),
  ].join(" · ");
  const footer = `Generated automatically from John's approved CV data at ${link(SITE_URL, "johnviklund.com")}, where you can also find case studies and an AI agent grounded in this CV.${updated ? ` Updated ${escapeHtml(updated)}.` : ""}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>John Viklund — CV</title>
<meta name="author" content="John Viklund">
<style>
@page { size: Letter; margin: 0.45in 0.55in; }
* { box-sizing: border-box; }
body { margin: 0; color: #1b1d1a; font: 9pt/1.28 "Noto Sans", "Liberation Sans", Arial, Helvetica, sans-serif; }
a { color: inherit; text-decoration: none; }
h1 { margin: 0; font-size: 20pt; line-height: 1.1; letter-spacing: -0.02em; }
.contacts { margin: 2pt 0 0; color: #4a4f47; font-size: 8.6pt; }
h2 { margin: 8pt 0 3pt; padding-bottom: 2pt; border-bottom: 0.6pt solid #b9beb5; font-size: 9.6pt; letter-spacing: 0.06em; text-transform: uppercase; break-after: avoid; }
h3 { margin: 5pt 0 0; font-size: 9.8pt; break-after: avoid; }
h4 { margin: 3pt 0 0; font-size: 9pt; font-weight: 600; break-after: avoid; }
p { margin: 0 0 3pt; }
.meta { color: #4a4f47; font-size: 8.6pt; break-after: avoid; }
ul { margin: 1pt 0 3pt; padding-left: 12pt; }
li { margin: 0; }
li, p { break-inside: avoid; }
footer { margin-top: 5pt; padding-top: 4pt; border-top: 0.6pt solid #b9beb5; color: #4a4f47; font-size: 8.4pt; }
</style>
</head>
<body>
${body.replace("<!--contacts-->", `<p class="contacts">${contacts}</p>`)}
<footer>${footer}</footer>
</body>
</html>
`;
}

function parseCv(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let list = [];
  let skipping = false;
  let inlineList = false;
  let contactsPlaced = false;
  let updated = "";

  const flush = () => {
    if (list.length && inlineList) html.push(`<p>${list.map(inline).join(" · ")}</p>`);
    else if (list.length) html.push(`<ul>${list.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const updatedMatch = line.match(/^Data last updated: ([^.]+)\./);
    if (updatedMatch) updated = updatedMatch[1];
    if (line === "---") skipping = true;

    if (line.startsWith("## ")) {
      flush();
      const heading = line.slice(3);
      skipping = OMITTED_SECTIONS.has(heading);
      if (!contactsPlaced) {
        html.push("<!--contacts-->");
        contactsPlaced = true;
      }
      inlineList = INLINE_LIST_SECTIONS.has(heading);
      if (!skipping) html.push(`<h2>${inline(heading)}</h2>`);
      continue;
    }
    if (skipping) continue;


    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (!line) continue;

    if (line.startsWith("# ")) html.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith("#### ")) html.push(`<h4>${inline(line.slice(5))}</h4>`);
    else if (line.startsWith("### ")) html.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if (/^\*\*[^*]+\*\*$/.test(line)) html.push(`<p class="meta">${inline(line.slice(2, -2))}</p>`);
    else html.push(`<p>${inline(line)}</p>`);
  }
  flush();
  return { body: html.join("\n"), updated };
}

function inline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, href) => `<a href="${href}">${label}</a>`);
}

function link(href, label) {
  return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

export function countPdfPages(buffer) {
  return (buffer.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}
