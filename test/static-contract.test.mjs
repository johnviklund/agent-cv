import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { content, readSite } from "./fixtures/site.mjs";
import { loadOwner } from "../scripts/owner.mjs";
import { renderSite } from "../scripts/build-site.mjs";
import { writeWranglerConfig } from "../scripts/wrangler-config.mjs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const TOOL_NAMES = [
  "compare_candidate_roles",
  "get_comparison_state",
  "focus_comparison_cell",
  "clear_role_comparison",
];

test("evidence and comparison result schemas evolve independently", async () => {
  const [evidence, contract] = await Promise.all([
    readSite("evidence.json").then(JSON.parse),
    read("config/comparison-contract.json").then(JSON.parse),
  ]);

  assert.equal(evidence.schemaVersion, 1);
  assert.equal(contract.schemaVersion, 2);
  assert.match(evidence.digest, /^sha256:[a-f0-9]{64}$/);
});

test("machine-readable discovery documents the comparison surface without presenting WebMCP tools as endpoints", async () => {
  const [llms, agents, contract] = await Promise.all([
    readSite("llms.txt"),
    readSite("AGENTS.md"),
    read("config/comparison-contract.json").then(JSON.parse),
  ]);

  for (const resource of [llms, agents]) {
    for (const value of ["/#compare", "/evidence.json", "POST /api/compare"]) {
      assert.match(resource, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
  for (const name of TOOL_NAMES) {
    assert.match(agents, new RegExp(`\\b${name}\\b`));
    assert.doesNotMatch(agents, new RegExp(`(?:GET|POST|PUT|PATCH|DELETE)\\s+/${name}`));
  }
  assert.match(agents, /page-scoped/i);
  assert.match(agents, /not (?:an? )?MCP server/i);
  assert.match(agents, /only while[^.]*page[^.]*open/i);
  assert.match(agents, /sessionStorage/);
  assert.match(agents, /untrusted/i);
  assert.match(agents, /does not score, rank, recommend/i);
  assert.match(agents, /documented.*transferable.*not_documented.*not_listed/s);
  assert.match(agents, /direct_responsibility.*directly_relevant_delivery.*related_domain_experience.*related_technical_exposure.*analogous_scale_or_context/s);

  for (const limit of Object.values(contract.limits).filter((value) => Number.isInteger(value) && value <= 20_000)) {
    if ([2, 240, 600, 262144].includes(limit)) continue;
    assert.match(agents, new RegExp(`\\b${limit.toLocaleString("en-US")}\\b|\\b${limit}\\b`));
  }
});

test("batch entry publishes a downloadable Markdown template", async () => {
  const [home, template] = await Promise.all([
    readSite("index.html"),
    readSite("positions-template.md"),
  ]);
  assert.match(home, /href="\/positions-template\.md"[^>]*download/i);
  assert.match(template, /^## Role(?: title)?:/m);
  assert.match(template, /^Company:/m);
  assert.match(template, /^## Responsibilities/m);
});

test("compatibility notes separate native WebMCP validation from portable fallbacks", async () => {
  const agents = await readSite("AGENTS.md");
  assert.match(agents, /ChatGPT Work\/Codex/i);
  assert.match(agents, /Chrome[^.]*experimental WebMCP/i);
  assert.match(agents, /browser automation|manual UI/i);
  assert.match(agents, /HTTP API/i);
  assert.doesNotMatch(agents, /certification/i);
  assert.match(agents, /Production discovery and invocation were verified/i);
});

test("privacy copy explains transient comparison state, processor retention, and separate persistent features", async () => {
  const privacy = renderSite(await loadOwner({ root: "examples/owner" }))["privacy/index.html"];
  for (const pattern of [
    /same-origin <code>sessionStorage<\/code>/i,
    /tab duplication|duplicat(?:e|ing) a tab/i,
    /browser restore/i,
    /does not archive or persist[^.]*role comparison/i,
    /Cloudflare Worker[^.]*OpenAI API/i,
    /<code>store: false<\/code>/i,
    /<code>background: false<\/code>/i,
    /conversation object/i,
    /application-state retention/i,
    /up to 30 days/i,
    /not used to train[^.]*by default/i,
    /agent[^.]*may retain|provider[^.]*may retain/i,
    /90 days/i,
    /application links[^.]*separate/i,
  ]) assert.match(privacy, pattern);
  assert.match(privacy, /https:\/\/platform\.openai\.com\/docs\/models\/default-usage-policies-by-endpoint/);
});

test("every page loads the shared navigation controller and preserves its CSS-only fallback", async () => {
  const pages = [
    "index.html", "about/index.html", "application/index.html",
    "contact/index.html", "cv/index.html", "experience/index.html",
    "privacy/index.html", "projects/index.html", "admin/index.html",
    "404.html",
  ];
  for (const path of pages) {
    const html = await readSite(path);
    assert.match(html, /<script\s+src="\/navigation\.js"\s+type="module"><\/script>/i, path);
    assert.match(html, /<details\s+class="mobile-nav">/i, path);
    assert.doesNotMatch(
      html,
      /<details\s+class="mobile-nav"[^>]*\b(?:hidden|aria-hidden|inert)\b/i,
      path,
    );
  }

  const [app, navigation, styles] = await Promise.all([
    readSite("app.js"),
    readSite("navigation.js"),
    readSite("styles.css"),
  ]);
  assert.doesNotMatch(app, /initializeResponsiveNavigation/);
  assert.match(navigation, /\(max-width: 900px\)/);
  assert.match(navigation, /aria-hidden/);
  assert.match(navigation, /\.inert/);
  assert.match(styles, /\.desktop-nav\s*\{[^}]*display:\s*flex/s);
  assert.match(styles, /\.mobile-nav\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.desktop-nav\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.mobile-nav\s*\{[^}]*display:\s*block/s);
});

test("public pages share a social preview card and cookieless visit analytics", async () => {
  const sharedPages = [
    "index.html", "about/index.html", "contact/index.html",
    "cv/index.html", "experience/index.html", "privacy/index.html",
    "projects/index.html",
  ];
  for (const path of sharedPages) {
    const html = await readSite(path);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    assert.ok(canonical, path);
    assert.match(html, new RegExp(`<meta property="og:url" content="${canonical}">`), path);
    assert.match(html, /<meta property="og:title" content="[^"]+">/, path);
    assert.ok(html.includes(`<meta property="og:image" content="${content.owner.site.origin}/og-image.png">`), path);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, path);
  }

  const beacon = /<script type="module" src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon='\{"token": "[a-f0-9]{32}"\}'><\/script>/;
  // An owner without a beacon token gets no analytics script at all.
  const analytics = Boolean(content.owner.analytics?.cloudflareBeaconToken);
  for (const path of [...sharedPages, "application/index.html", "404.html"]) {
    assert[analytics ? "match" : "doesNotMatch"](await readSite(path), analytics ? beacon : /cloudflareinsights/, path);
  }
  assert.doesNotMatch(await readSite("admin/index.html"), /cloudflareinsights/);

  const [headers, privacy, image] = await Promise.all([
    readSite("_headers"),
    readSite("privacy/index.html"),
    readSite("og-image.png", null),
  ]);
  assert.match(headers, /Content-Security-Policy:[^\n]*script-src 'self' https:\/\/static\.cloudflareinsights\.com /);
  assert.match(headers, /Content-Security-Policy:[^\n]*connect-src 'self' https:\/\/cloudflareinsights\.com;/);
  if (analytics) assert.match(privacy, /Cloudflare Web Analytics[^<]*no cookies/);
  assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [1200, 630]);
});

test("headers expose evidence JSON safely and keep WebMCP same-origin", async () => {
  const headers = await readSite("_headers");
  const evidenceBlock = headers.match(/\/evidence\.json\n([\s\S]*?)(?=\n\/|$)/)?.[1] || "";
  assert.match(evidenceBlock, /Access-Control-Allow-Origin:\s*\*/i);
  assert.match(evidenceBlock, /Content-Type:\s*application\/json; charset=utf-8/i);
  assert.match(evidenceBlock, /Cache-Control:\s*public, max-age=0, must-revalidate/i);
  assert.match(headers, /Permissions-Policy:[^\n]*tools=\(self\)/i);
  assert.match(headers, /Content-Security-Policy:[^\n]*script-src 'self'/i);
  assert.match(headers, /Content-Security-Policy:[^\n]*frame-ancestors 'none'/i);
});

test("evidence resource access uses the same content-free path telemetry", async () => {
  const [worker, archive] = await Promise.all([read("src/worker.js"), read("src/archive.js")]);
  assert.match(worker, /OBSERVED_RESOURCE_PATHS[\s\S]*["']\/evidence\.json["']/);
  const resourceRecord = archive.match(/export async function storeResourceAccess[\s\S]*?await putExpiringRecord/)?.[0] || "";
  assert.match(resourceRecord, /\bpath\b/);
  assert.doesNotMatch(resourceRecord, /request\.text|request\.json|cf-connecting-ip|x-forwarded-for/i);
});

test("the published design tokens and self-hosted font assets are deployable under the existing CSP", async () => {
  const [canonical, published, styles, headers] = await Promise.all([
    read("tokens.css"), readSite("tokens.css"), readSite("styles.css"), readSite("_headers"),
  ]);
  assert.equal(published, canonical, "sync:data must publish the canonical design tokens");
  assert.match(styles, /@import url\("\/tokens\.css"\)/);
  const fontPaths = [...styles.matchAll(/src:\s*url\("(\/fonts\/[^"/]+\.woff2)"\)/g)].map((match) => match[1]);
  assert.equal(fontPaths.length, 3);
  for (const path of fontPaths) {
    const bytes = await readSite(`.${path}`, null);
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2", `${path} must be a real WOFF2 font`);
    assert.match(await readSite(`.${path.replace("-latin.woff2", "-OFL.txt")}`), /SIL OPEN FONT LICENSE/);
  }
  assert.doesNotMatch(styles, /url\(["']?https?:\/\//);
  assert.match(headers, /font-src 'self'/);
});

test("chat knowledge includes the canonical public CV", async () => {
  const [knowledge, sync, wrangler, packageCheck] = await Promise.all([
    read("src/knowledge.js"),
    read("scripts/sync-public-data.mjs"),
    writeWranglerConfig(),
    read("scripts/check-worker-package.mjs"),
  ]);

  assert.match(knowledge, /import cv from "\.\/data\/cv\.md";/);
  assert.match(knowledge, /\[meta, cv, /);
  assert.match(sync, /const workerFiles = \[[^\]]*"cv\.md"/);
  assert.match(wrangler, /"data\/cv\.md"/);
  assert.match(packageCheck, /"data\/cv\.md"/);
});

test("external links open in a new tab without exposing the opener", async () => {
  const pages = await Promise.all([
    "index.html", "404.html", "about/index.html", "admin/index.html",
    "application/index.html", "contact/index.html", "cv/index.html",
    "experience/index.html", "privacy/index.html", "projects/index.html",
  ].map((path) => readSite(path)));
  const links = pages.flatMap((page) => page.match(/<a\s[^>]*href="https?:\/\/[^"]*"[^>]*>/gi) || []);

  assert.ok(links.length > 0);
  for (const link of links) {
    assert.match(link, /\starget="_blank"/, link);
    assert.match(link, /\srel="[^"]*\bnoopener\b[^"]*"/, link);
  }
});
