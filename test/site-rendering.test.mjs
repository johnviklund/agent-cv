import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOwner, resolveOwnerRoot } from "../scripts/owner.mjs";
import { buildSite, renderSite } from "../scripts/build-site.mjs";
import { privateDataFiles } from "../scripts/sync-owner.mjs";
import { escapeHtml, UPSTREAM_URL } from "../site/templates/html.mjs";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const example = resolve(root, "examples/owner");
const ada = () => loadOwner({ root: example });

async function tempDir(context) {
  const dir = await mkdtemp(resolve(tmpdir(), "agent-cv-site-"));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test("every page credits Agent CV in its last footer for each owner", async () => {
  for (const ownerRoot of new Set([example, resolveOwnerRoot()])) {
    const pages = Object.entries(renderSite(await loadOwner({ root: ownerRoot })))
      .filter(([path]) => path.endsWith(".html"));
    assert.equal(pages.length, 10);
    for (const [path, page] of pages) {
      const footer = [...page.matchAll(/<footer\b[^>]*>([\s\S]*?)<\/footer>/g)].at(-1)?.[1] ?? "";
      assert.ok(footer.includes(`<a href="${UPSTREAM_URL}" target="_blank" rel="noopener noreferrer">Built with Agent CV</a>`), `${ownerRoot}: ${path}`);
    }
  }
});

test("a fictional home renders Ada from structured data", async () => {
  const html = renderSite(await ada())["index.html"];

  assert.match(html, /<title>Ada Example — Agent CV<\/title>/);
  assert.match(html, /<h1 id="home-title">Ada<br><span>Example\.<\/span><\/h1>/);
  assert.match(html, /data-prompt="What systems has Ada built\?"><span>Explore projects<\/span>/);
  assert.match(html, /<a href="\/ada-example-cv\.pdf">PDF ↓<\/a>/);
  assert.match(html, /<a href="https:\/\/github\.com\/ada-example" rel="noopener noreferrer" target="_blank"><strong>Example library ↗<\/strong>/);
  assert.doesNotMatch(html.replaceAll(UPSTREAM_URL, ""), /Grace|Sample|gracesample|Example Motors|cloudflareinsights/);
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

test("a prose block without exactly one type fails with its site.json field", async (context) => {
  const site = JSON.parse(await readFile(resolve(example, "site.json"), "utf8"));
  const withPage = (name, key, value) => ({ ...site, pages: { ...site.pages, [name]: { ...site.pages[name], [key]: value } } });

  for (const [value, message] of [
    [withPage("about", "body", [{ p: "fine" }, {}]), "pages.about.body[1] must have at least 1 key(s)"],
    [withPage("cv", "body", [{}]), "pages.cv.body[0] must have at least 1 key(s)"],
    [withPage("privacy", "sections", [[{ h2: "Saved" }], [{ p: "fine" }, {}]]), "pages.privacy.sections[1][1] must have at least 1 key(s)"],
    [withPage("about", "body", [{ p: "one", h2: "two" }]), "pages.about.body[0] must have at most 1 key(s)"],
  ]) {
    const dir = await tempDir(context);
    await cp(example, dir, { recursive: true });
    await writeFile(resolve(dir, "site.json"), JSON.stringify(value));
    await assert.rejects(loadOwner({ root: dir }), { message: `site.json: ${message}` });
  }
});

test("each prose block type renders its markup", async () => {
  const { owner, site } = await ada();
  const body = [{ p: "Para" }, { h2: "Head" }, { h3: "Sub" }, { kicker: "Meta" }, { quote: "Said" }, { list: ["One", "Two"] }];
  const html = renderSite({ owner, site: { ...site, pages: { ...site.pages, about: { ...site.pages.about, body } } } })["about/index.html"];

  for (const markup of ["<p>Para</p>", "<h2>Head</h2>", "<h3>Sub</h3>", '<p class="cv-kicker">Meta</p>',
    "<blockquote>Said</blockquote>", "<ul><li>One</li><li>Two</li></ul>"]) {
    assert.ok(html.includes(`      ${markup}\n`), markup);
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

  assert.match(html, /Uses &lt;em&gt;tags&lt;\/em&gt; & &quot;quotes&quot;/);
  assert.match(html, /<title>Ada &lt;\/title&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt; — Agent CV<\/title>/);
  assert.match(html, /"name": "Ada \\u003c\/title\\u003e\\u003cscript\\u003ealert\(1\)\\u003c\/script\\u003e"/);
  assert.match(html, /href="mailto:&quot;&gt;&lt;script&gt;alert\(2\)&lt;\/script&gt;@x\.example"/);
  assert.match(html, /data-cf-beacon='\{"token": "&#39;&gt;&lt;script&gt;alert\(3\)&lt;\/script&gt;"\}'/);
  assert.doesNotMatch(html, /<script>alert|<em>|<b>/);
});

test("rendered home keeps its CSP hash", async () => {
  const pages = renderSite(await ada());
  const [inline] = [...pages["index.html"].matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  const hash = `sha256-${createHash("sha256").update(inline[1]).digest("base64")}`;

  assert.match(inline[1], /"@type": "ProfilePage"/);
  assert.ok(pages["_headers"].includes(`'${hash}'`), hash);
  assert.match(pages["_headers"], /^\/ada-example-cv\.pdf\n.*filename="ada-example-cv\.pdf"/ms);
});


test("every fictional page renders Ada's own identity and copy", async () => {
  const pages = renderSite(await ada());
  assert.match(pages["admin/index.html"], /<html[^>]+data-owner-short-name="Ada"/);
  for (const [path, text] of Object.entries(pages)) {
    assert.doesNotMatch(text.replaceAll(UPSTREAM_URL, ""), /Grace|Sample|gracesample|Example Motors|c7d9e434/, path);
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
    ["AGENTS.md", "cv.md", "overview.md", "positions-template.md", "projects.md", "repositories.md"]);
  for (const file of privateDataFiles) assert.equal(listed.includes(file), false, file);
  const text = (await Promise.all(listed.map((file) => readFile(resolve(out, file), "utf8")))).join("\n");
  const { owner } = await ada();
  for (const secret of [owner.deploy.workerName, owner.deploy.archiveNamespaceId, ...Object.keys(owner.deploy.vars), "ADMIN_TOKEN"]) {
    assert.equal(text.includes(secret), false, secret);
  }
  // The private sources sit beside the public ones in data/; no line of theirs is published.
  // Short lines are too generic to prove a leak; the example owner's skills.md has only short ones.
  let checked = 0;
  for (const file of privateDataFiles) {
    const lines = (await readFile(resolve(example, "data", file), "utf8")).split("\n").filter((line) => line.length > 40);
    checked += lines.length;
    for (const line of lines) assert.equal(text.includes(line), false, `${file}: ${line}`);
  }
  assert.ok(checked > 0);
});

test("a bare ampersand stays raw and one that could start a character reference is escaped", () => {
  for (const [text, html] of [
    ["CRM & AI", "CRM & AI"],
    ["R&D", "R&amp;D"],
    ["&amp; literal", "&amp;amp; literal"],
    ["&#39;", "&amp;#39;"],
    ["ends with &", "ends with &"],
    ["<b> \"q\"", "&lt;b&gt; &quot;q&quot;"],
  ]) assert.equal(escapeHtml(text), html, text);
});

const ASSETS = ["404.html", "about/index.html", "admin/index.html", "application/index.html", "contact/index.html",
  "cv/index.html", "experience/index.html", "index.html", "privacy/index.html", "projects/index.html",
  "fonts/archivo-latin.woff2", "fonts/inter-latin.woff2", "fonts/jetbrains-mono-latin.woff2", "tokens.css", "styles.css",
  "app.js", "application.js", "admin.js", "navigation.js", "comparison-contract.js", "evidence.json", "og-image.png",
  "favicon.svg", "positions-template.md"];

test("a clean build holds every page and engine asset, and a rebuild drops stale files but keeps the sources", async (context) => {
  const out = resolve(await tempDir(context), "site");
  const sources = async () => (await readdir(resolve(root, "site/assets"), { recursive: true })).sort();
  const before = await sources();

  await buildSite({ ...(await ada()), out });
  for (const file of ASSETS) assert.ok((await readFile(resolve(out, file))).length > 0, file);
  assert.equal(await readFile(resolve(out, "tokens.css"), "utf8"), await readFile(resolve(root, "tokens.css"), "utf8"));

  await writeFile(resolve(out, "stale.txt"), "old");
  await buildSite({ ...(await ada()), out });
  await assert.rejects(readFile(resolve(out, "stale.txt")), { code: "ENOENT" });
  assert.deepEqual(await sources(), before);
  assert.ok(before.includes("app.js"));
});

test("generated site output stays out of Git while the engine assets are tracked", () => {
  const ignored = (path) => spawnSync("git", ["check-ignore", "-q", path], { cwd: root }).status === 0;
  assert.equal(ignored("build/site/index.html"), true);
  assert.equal(ignored("build/site/grace-sample-cv.pdf"), true);
  assert.equal(ignored("site/assets/app.js"), false);
});
