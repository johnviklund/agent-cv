import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const TOOL_NAMES = [
  "compare_candidate_roles",
  "get_comparison_state",
  "focus_comparison_cell",
  "clear_role_comparison",
];

test("machine-readable discovery documents the comparison surface without presenting WebMCP tools as endpoints", async () => {
  const [llms, agents, contract] = await Promise.all([
    read("public/llms.txt"),
    read("public/AGENTS.md"),
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

test("compatibility notes separate native WebMCP validation from portable fallbacks", async () => {
  const [agents, readme] = await Promise.all([read("public/AGENTS.md"), read("README.md")]);
  for (const resource of [agents, readme]) {
    assert.match(resource, /ChatGPT Work\/Codex/i);
    assert.match(resource, /Chrome[^.]*experimental WebMCP/i);
    assert.match(resource, /Grok/i);
    assert.match(resource, /browser automation|manual UI/i);
    assert.match(resource, /HTTP API/i);
  }
  assert.match(readme, /Production discovery and invocation verified on 30 August/i);
  assert.match(readme, /four-role rejection without state mutation/i);
  assert.match(agents, /Production discovery and invocation were verified/i);
  assert.match(readme, /2026-08-30/);
  assert.match(readme, /WebMCP Challenge/i);
  assert.match(readme, /pre-existing Agent CV/i);
});

test("privacy copy explains transient comparison state, processor retention, and separate persistent features", async () => {
  const privacy = await read("public/privacy/index.html");
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
    /confidential/i,
    /special-category/i,
    /third-part(?:y|ies)/i,
  ]) assert.match(privacy, pattern);
  assert.match(privacy, /https:\/\/platform\.openai\.com\/docs\/models\/default-usage-policies-by-endpoint/);
});

test("headers expose evidence JSON safely and keep WebMCP same-origin", async () => {
  const headers = await read("public/_headers");
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
