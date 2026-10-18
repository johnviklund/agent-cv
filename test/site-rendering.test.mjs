import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOwner } from "../scripts/owner.mjs";
import { buildSite, renderSite } from "../scripts/build-site.mjs";
import { privateDataFiles } from "../scripts/sync-owner.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, "examples/owner");
const published = (path) => readFile(resolve(root, "public", path), "utf8");
const ada = () => loadOwner({ root: example });
const current = await loadOwner();

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-site-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

// Published copies of the generated pages; experience/ wrote raw "&" where the renderer escapes it.
const PUBLISHED_PAGES = ["index.html", "about/index.html", "experience/index.html", "projects/index.html",
  "cv/index.html", "contact/index.html", "privacy/index.html", "application/index.html", "admin/index.html",
  "404.html", "robots.txt", "sitemap.xml", "llms.txt", "AGENTS.md", "_headers"];

test("John's pages and discovery files render the published files byte for byte", {
  skip: current.owner.slug !== "john-viklund" && "needs John's owner root",
}, async () => {
  const pages = renderSite(current);
  assert.deepEqual(Object.keys(pages).sort(), [...PUBLISHED_PAGES].sort());
  for (const path of PUBLISHED_PAGES) {
    const expected = await published(path);
    const actual = path === "experience/index.html" ? pages[path].replaceAll(" &amp; ", " & ") : pages[path];
    assert.equal(actual, expected, path);
  }
});

test("a fictional home renders Ada from structured data", async () => {
  const html = renderSite(await ada())["index.html"];

  assert.match(html, /<title>Ada Example — Agent CV<\/title>/);
  assert.match(html, /<h1 id="home-title">Ada<br><span>Example\.<\/span><\/h1>/);
  assert.match(html, /data-prompt="What systems has Ada built\?"><span>Explore projects<\/span>/);
  assert.match(html, /<a href="\/ada-example-cv\.pdf">PDF ↓<\/a>/);
  assert.match(html, /<a href="https:\/\/github\.com\/ada-example" rel="noopener noreferrer" target="_blank"><strong>Example library ↗<\/strong>/);
  assert.doesNotMatch(html, /John|Viklund|johnviklund|Volvo|cloudflareinsights/);
});

test("invalid site sections name site.json and the field", async (context) => {
  const site = JSON.parse(await readFile(resolve(example, "site.json"), "utf8"));
  const withProof = (href) => ({ ...site, home: { ...site.home, proof: [{ ...site.home.proof[0], href }] } });

  for (const [value, message] of [
    [{ ...site, home: { ...site.home, deck: undefined } }, "site.json: home.deck is required"],
    [{ ...site, home: { ...site.home, starters: [] } }, "site.json: home.starters must have at least 1 item(s)"],
    [{ ...site, person: { ...site.person, extra: "<b>" } }, "site.json: person.extra is not allowed"],
    ...["javascript:alert(1)", "//evil.example/", "http://ada.example/", "data:text/html,x", "/ spaced"].map((href) => [
      withProof(href), /^site\.json: home\.proof\[0\]\.href must match /,
    ]),
  ]) {
    const dir = await tempDir(context);
    await cp(example, dir, { recursive: true });
    await writeFile(resolve(dir, "site.json"), JSON.stringify(value));
    await assert.rejects(loadOwner({ root: dir }), (error) => {
      if (message instanceof RegExp) assert.match(error.message, message);
      else assert.equal(error.message, message);
      return true;
    });
  }
});

test("owner and site text renders literally and hostile values stay inert", async () => {
  const { owner, site } = await ada();
  const hostile = {
    owner: {
      ...owner,
      name: { full: "Ada </title><script>alert(1)</script>", short: "Ada \"<b>" },
      contact: { email: "\"><script>alert(2)</script>@x.example" },
      analytics: { cloudflareBeaconToken: "'><script>alert(3)</script>" },
    },
    site: { ...site, home: { ...site.home, deck: "Uses <em>tags</em> & \"quotes\"" } },
  };
  const html = renderSite(hostile)["index.html"];

  assert.match(html, /Uses &lt;em&gt;tags&lt;\/em&gt; &amp; &quot;quotes&quot;/);
  assert.match(html, /<title>Ada &lt;\/title&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; — Agent CV<\/title>/);
  assert.match(html, /"name": "Ada \\u003c\/title\\u003e\\u003cscript\\u003ealert\(1\)\\u003c\/script\\u003e"/);
  assert.match(html, /href="mailto:&quot;&gt;&lt;script&gt;alert\(2\)&lt;\/script&gt;@x\.example"/);
  assert.match(html, /data-cf-beacon='\{"token": "&#39;&gt;&lt;script&gt;alert\(3\)&lt;\/script&gt;"\}'/);
  assert.doesNotMatch(html, /<script>alert|<em>|<b>/);
});

test("rendered home keeps its CSP hash and the controller contracts", async () => {
  const contract = (html) => ({
    ids: [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
    // The analytics beacon is configuration, not a controller hook.
    data: [...new Set([...html.matchAll(/\s(data-[a-z-]+)/g)].map((match) => match[1]))].filter((name) => name !== "data-cf-beacon").sort(),
    nav: [...html.matchAll(/<nav[^>]*>([\s\S]*?)<\/nav>/g)].map((match) => [...match[1].matchAll(/href="([^"]+)"/g)].length),
    scripts: [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1]).filter((src) => src.startsWith("/")),
  });
  const pages = renderSite(await ada());
  const [inline] = [...pages["index.html"].matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const hash = `sha256-${createHash("sha256").update(inline[1]).digest("base64")}`;

  assert.match(inline[1], /"@type": "ProfilePage"/);
  assert.ok(pages["_headers"].includes(`'${hash}'`), hash);
  assert.match(pages["_headers"], /^\/ada-example-cv\.pdf\n.*filename="ada-example-cv\.pdf"/ms);
  // The published page is John's; the fictional page must expose the same hooks to the browser code.
  const expected = contract(await published("index.html"));
  const actual = contract(pages["index.html"]);
  assert.deepEqual(actual.ids, expected.ids);
  assert.deepEqual(actual.data, expected.data);
  assert.deepEqual(actual.scripts, expected.scripts);
  assert.deepEqual(actual.nav.slice(0, 2), expected.nav.slice(0, 2));
});

test("every fictional page renders Ada's own identity and copy", async () => {
  const pages = renderSite(await ada());
  for (const [path, text] of Object.entries(pages)) {
    assert.doesNotMatch(text, /John|Viklund|johnviklund|Volvo|c7d9e434/, path);
  }
  for (const [path, pattern] of [
    ["about/index.html", /<h1>Close to the systems\.<\/h1>[\s\S]*Her work is <strong>invented<\/strong>/],
    ["experience/index.html", /<h2>Example Co · Staff engineer<\/h2><p>Runs a fictional platform\.<\/p>/],
    ["projects/index.html", /href="https:\/\/github\.com\/ada-example" rel="me noopener noreferrer" target="_blank">View source ↗/],
    ["cv/index.html", /href="\/ada-example-cv\.pdf"[\s\S]*<p class="cv-kicker">Staff engineer · Lisbon<\/p>/],
    ["contact/index.html", /<p>Ada answers on GitHub\.<\/p>\n      <p class="contact-value" data-contact-value><\/p>/],
    ["privacy/index.html", /<a href="https:\/\/github\.com\/ada-example" rel="me noopener noreferrer" target="_blank">the source<\/a>/],
    ["application/index.html", /map the supplied job description to Ada's documented experience/],
    ["404.html", /<a href="\/">Ask Ada's agent →<\/a>/],
  ]) {
    assert.match(pages[path], pattern, path);
    assert.match(pages[path], /aria-label="Ada Example, home">ADA EXAMPLE<\/a>/, path);
  }
});

test("unsafe inline links in page prose fail with their site.json field", async () => {
  const { owner, site } = await ada();
  for (const href of ["javascript:alert", "//evil.example", "http://ada.example", "data:text/html,x"]) {
    const about = { ...site.pages.about, body: [{ p: "fine" }, { p: `see [this](${href})` }] };
    assert.throws(() => renderSite({ owner, site: { ...site, pages: { ...site.pages, about } } }),
      { message: `site.json: pages.about.body[1].p has an unsafe link ${href}` });
  }
});

test("discovery files keep the engine contract and follow the owner's origin, slug and updatedAt", async () => {
  const { owner, site } = await ada();
  const pages = renderSite({ owner, site: { ...site, updatedAt: "2027-02-03" } });

  for (const name of ["llms.txt", "AGENTS.md"]) {
    const engine = await published(name);
    for (const contract of [...engine.matchAll(/`((?:POST|GET) \/api\/[a-z/:]+|[a-z]+_[a-z_]+)`/g)].map((match) => match[1])) {
      assert.ok(pages[name].includes(contract), `${name}: ${contract}`);
    }
  }
  assert.match(pages["AGENTS.md"], /At most 16 requirements per role may be assessed in rows, and up to 96 extracted requirements/);
  assert.match(pages["llms.txt"], /Data last updated: 2027-02-03\n$/);
  assert.match(pages["AGENTS.md"], /Public data last updated: 3 February 2027\./);
  assert.match(pages["index.html"], /"dateModified": "2027-02-03"[\s\S]*Updated Feb 2027/);
  assert.equal([...pages["sitemap.xml"].matchAll(/<lastmod>2027-02-03<\/lastmod>/g)].length, 13);
  assert.match(pages["sitemap.xml"], /<loc>https:\/\/ada\.example\/privacy\/<\/loc>/);
  assert.match(pages["robots.txt"], /^Sitemap: https:\/\/ada\.example\/sitemap\.xml$/m);
  assert.match(pages["cv/index.html"], /<link rel="canonical" href="https:\/\/ada\.example\/cv\/">/);
  assert.match(pages["llms.txt"], /\[CV PDF\]\(\/ada-example-cv\.pdf\)/);
  assert.match(pages["llms.txt"], /returns `null`\. Never infer or guess another address\./);
  assert.doesNotMatch(pages["llms.txt"], /\[Public source\]/);
});

test("the built site publishes four Markdown sources and no private material", async (context) => {
  const out = resolve(await tempDir(context), "site");
  const files = await buildSite({ ...(await ada()), out });
  const listed = (await readdir(out, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile()).map((entry) => resolve(entry.parentPath, entry.name).slice(out.length + 1)).sort();

  assert.deepEqual(listed, [...files].sort());
  assert.deepEqual(listed.filter((file) => file.endsWith(".md")).sort(),
    ["AGENTS.md", "cv.md", "overview.md", "projects.md", "repositories.md"]);
  for (const file of privateDataFiles) assert.equal(listed.includes(file), false, file);
  const text = (await Promise.all(listed.map((file) => readFile(resolve(out, file), "utf8")))).join("\n");
  const { owner } = await ada();
  for (const secret of [owner.deploy.workerName, owner.deploy.archiveNamespaceId, ...Object.keys(owner.deploy.vars), "ADMIN_TOKEN"]) {
    assert.equal(text.includes(secret), false, secret);
  }
  // The private sources sit beside the public ones in data/; no line of theirs is published.
  for (const file of privateDataFiles) {
    const lines = (await readFile(resolve(root, "data", file), "utf8")).split("\n").filter((line) => line.length > 40);
    assert.ok(lines.length > 0, file);
    for (const line of lines) assert.equal(text.includes(line), false, `${file}: ${line}`);
  }
});
