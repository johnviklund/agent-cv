import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadOwner } from "../scripts/owner.mjs";
import { renderSite } from "../scripts/build-site.mjs";

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

test("John's home renders the published page byte for byte", {
  skip: current.owner.slug !== "john-viklund" && "needs John's owner root",
}, async () => {
  const pages = renderSite(current);
  assert.equal(pages["index.html"], await published("index.html"));
  assert.equal(pages["_headers"], await published("_headers"));
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
