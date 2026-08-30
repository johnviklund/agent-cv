import { access, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const pages = await collectHtml(publicDir);
const failures = [];

await checkApiResourceParity();
await checkInlineScriptCsp();
await checkDiscoveryResources();
await checkFreshnessParity();
await checkComparisonContractParity();

for (const page of pages) {
  const html = await readFile(page, "utf8");
  const relative = page.slice(publicDir.length) || "/index.html";
  const checks = [
    [/<html\s[^>]*lang="en"/i, "missing lang=en"],
    [/<title>[^<]+<\/title>/i, "missing title"],
    [/<meta\s+name="description"/i, "missing meta description"],
    [/<nav\s[^>]*aria-label=/i, "missing labelled navigation"],
    [/<main(?:\s|>)/i, "missing main landmark"],
    [/<h1(?:\s|>)/i, "missing h1"],
  ];

  for (const [pattern, message] of checks) {
    if (!pattern.test(html)) failures.push(`${relative}: ${message}`);
  }

  if (!["/404.html", "/admin/index.html", "/application/index.html"].includes(relative)) {
    if (!/<link\s+rel="canonical"\s+href="https:\/\/johnviklund\.com\//i.test(html)) {
      failures.push(`${relative}: missing canonical URL`);
    }
    if (!/<link\s+rel="describedby"\s+href="\/llms\.txt"/i.test(html)) {
      failures.push(`${relative}: missing llms.txt describedby link`);
    }
  }

  if (/href="[^"]*[?&]ask=/i.test(html)) {
    failures.push(`${relative}: prompt embedded in a navigation URL`);
  }

  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = match[1].split(/[?#]/)[0];
    if (!href || href.startsWith("/api/") || href === "/") continue;
    const target = extname(href)
      ? resolve(publicDir, `.${href}`)
      : resolve(publicDir, `.${href}`, "index.html");
    try {
      await access(target);
    } catch {
      failures.push(`${relative}: broken internal link ${href}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Static checks passed for ${pages.length} pages.`);
}

async function collectHtml(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectHtml(path) : path.endsWith(".html") ? [path] : [];
  }));
  return nested.flat();
}

async function checkApiResourceParity() {
  const worker = (await Promise.all([
    readFile(resolve(root, "src/index.js"), "utf8"),
    readFile(resolve(root, "src/worker.js"), "utf8"),
  ])).join("\n");
  const resources = ["llms.txt", "AGENTS.md"];
  const resourceContents = await Promise.all(resources.map(async (name) => ({
    name,
    content: await readFile(resolve(publicDir, name), "utf8"),
  })));
  const routes = new Set(
    [...worker.matchAll(/url\.pathname\s*===\s*["'](\/api\/[a-z0-9/_-]+)["']/gi)]
      .map((match) => match[1]),
  );

  for (const route of routes) {
    for (const resource of resourceContents) {
      if (!resource.content.includes(route)) {
        failures.push(`${resource.name}: missing public API route ${route}`);
      }
    }
  }
}

async function checkInlineScriptCsp() {
  const [home, headers] = await Promise.all([
    readFile(resolve(publicDir, "index.html"), "utf8"),
    readFile(resolve(publicDir, "_headers"), "utf8"),
  ]);
  const inlineScripts = [...home.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

  for (const [, source] of inlineScripts) {
    const hash = `sha256-${createHash("sha256").update(source).digest("base64")}`;
    if (!headers.includes(`'${hash}'`)) failures.push(`_headers: missing CSP hash ${hash}`);
  }
}

async function checkDiscoveryResources() {
  const [home, robots, sitemap] = await Promise.all([
    readFile(resolve(publicDir, "index.html"), "utf8"),
    readFile(resolve(publicDir, "robots.txt"), "utf8"),
    readFile(resolve(publicDir, "sitemap.xml"), "utf8"),
  ]);
  if (!/"@type":\s*"ProfilePage"/.test(home) || !/"mainEntity":\s*\{/.test(home)) {
    failures.push("index.html: missing ProfilePage JSON-LD with mainEntity");
  }
  if (!/"@id":\s*"https:\/\/johnviklund\.com\/#john-viklund"/.test(home)
    || !/"name":\s*"John Viklund"/.test(home)) {
    failures.push("index.html: JSON-LD public identity is inconsistent");
  }
  if (!/Sitemap:\s*https:\/\/johnviklund\.com\/sitemap\.xml/.test(robots)) {
    failures.push("robots.txt: missing canonical sitemap declaration");
  }
  for (const path of ["/", "/projects/", "/cv/", "/privacy/", "/AGENTS.md", "/llms.txt", "/overview.md", "/repositories.md"]) {
    const url = `https://johnviklund.com${path}`;
    if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`sitemap.xml: missing ${path}`);
  }
}

async function checkFreshnessParity() {
  const [chatCore, agents, llms, cv, sitemap] = await Promise.all([
    readFile(resolve(root, "src", "chat-core.js"), "utf8"),
    readFile(resolve(publicDir, "AGENTS.md"), "utf8"),
    readFile(resolve(publicDir, "llms.txt"), "utf8"),
    readFile(resolve(publicDir, "cv.md"), "utf8"),
    readFile(resolve(publicDir, "sitemap.xml"), "utf8"),
  ]);
  const dates = [
    chatCore.match(/buildSystemPrompt\(knowledge, updatedAt = "(\d{4}-\d{2}-\d{2})"\)/)?.[1],
    llms.match(/Data last updated: (\d{4}-\d{2}-\d{2})/)?.[1],
    toIsoDate(agents.match(/Public data last updated: ([^.]+)\./)?.[1]),
    toIsoDate(cv.match(/Data last updated: ([^.]+)\./)?.[1]),
    ...[...sitemap.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/g)].map((match) => match[1]),
  ];
  if (dates.some((date) => !date) || new Set(dates).size !== 1) {
    failures.push("public freshness metadata is inconsistent");
  }
}

async function checkComparisonContractParity() {
  const [contract, evidence, agents, llms, webmcp, privacy, headers, worker] = await Promise.all([
    readFile(resolve(root, "config/comparison-contract.json"), "utf8").then(JSON.parse),
    readFile(resolve(publicDir, "evidence.json"), "utf8").then(JSON.parse),
    readFile(resolve(publicDir, "AGENTS.md"), "utf8"),
    readFile(resolve(publicDir, "llms.txt"), "utf8"),
    readFile(resolve(publicDir, "webmcp.js"), "utf8"),
    readFile(resolve(publicDir, "privacy", "index.html"), "utf8"),
    readFile(resolve(publicDir, "_headers"), "utf8"),
    readFile(resolve(root, "src", "worker.js"), "utf8"),
  ]);
  const discovery = [agents, llms];

  for (const value of ["/#compare", "/evidence.json", "POST /api/compare"]) {
    for (const resource of discovery) {
      if (!resource.includes(value)) failures.push(`comparison discovery: missing ${value}`);
    }
  }

  const toolBlock = webmcp.match(/const TOOL_NAMES = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] || "";
  const toolNames = [...toolBlock.matchAll(/:\s*"([a-z][a-z0-9_]*)"/g)].map((match) => match[1]);
  if (toolNames.length !== 4 || new Set(toolNames).size !== 4) {
    failures.push("webmcp.js: expected exactly four unique page tool names");
  }
  for (const name of toolNames) {
    if (!agents.includes(`\`${name}\``) || !llms.includes(`\`${name}\``)) {
      failures.push(`comparison discovery: missing WebMCP tool ${name}`);
    }
    if (new RegExp(`(?:GET|POST|PUT|PATCH|DELETE)\\s+/${name}`).test(`${agents}\n${llms}`)) {
      failures.push(`comparison discovery: page tool documented as HTTP endpoint ${name}`);
    }
  }

  const documentedLimits = [
    contract.limits.minRoles,
    contract.limits.maxRoles,
    contract.limits.maxTitleCharacters,
    contract.limits.maxCompanyCharacters,
    contract.limits.maxDescriptionCharacters,
    contract.limits.maxCombinedRoleCharacters,
    contract.limits.maxBodyBytes,
    contract.limits.maxRows,
    contract.limits.maxRequirementsPerRole,
  ];
  for (const value of documentedLimits) {
    const formatted = Number(value).toLocaleString("en-US");
    if (!agents.includes(formatted) && !agents.includes(String(value))) {
      failures.push(`AGENTS.md: missing comparison limit ${formatted}`);
    }
  }
  for (const value of [...contract.coverageStates, ...Object.values(contract.reasonCodes).flat()]) {
    if (!agents.includes(`\`${value}\``)) failures.push(`AGENTS.md: missing comparison enum ${value}`);
  }
  if (evidence.schemaVersion !== contract.schemaVersion || !/^sha256:[a-f0-9]{64}$/.test(evidence.digest || "")) {
    failures.push("evidence.json: comparison schema version or digest is invalid");
  }

  const evidenceHeaders = headers.match(/\/evidence\.json\n([\s\S]*?)(?=\n\/|$)/)?.[1] || "";
  for (const value of [
    "Access-Control-Allow-Origin: *",
    "Content-Type: application/json; charset=utf-8",
    "Cache-Control: public, max-age=0, must-revalidate",
  ]) {
    if (!evidenceHeaders.includes(value)) failures.push(`_headers: evidence.json missing ${value}`);
  }
  if (!/Permissions-Policy:[^\n]*tools=\(self\)/.test(headers)) {
    failures.push("_headers: WebMCP tools are not restricted to self");
  }
  if (!/Content-Security-Policy:[^\n]*script-src 'self'[^\n]*frame-ancestors 'none'/.test(headers)) {
    failures.push("_headers: comparison page must preserve self-hosted scripts and frame blocking");
  }

  for (const pattern of [
    /same-origin <code>sessionStorage<\/code>/i,
    /does not archive or persist[^.]*role comparison/i,
    /<code>store: false<\/code>/i,
    /<code>background: false<\/code>/i,
    /up to 30 days/i,
    /90 days/i,
  ]) {
    if (!pattern.test(privacy)) failures.push(`privacy: missing comparison disclosure ${pattern}`);
  }
  if (!worker.match(/OBSERVED_RESOURCE_PATHS[\s\S]*["']\/evidence\.json["']/)) {
    failures.push("worker: evidence.json is missing path-only resource telemetry");
  }
}

function toIsoDate(value) {
  const match = String(value || "").match(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/);
  if (!match) return "";
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const month = months.indexOf(match[2].toLowerCase()) + 1;
  return month ? `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}
