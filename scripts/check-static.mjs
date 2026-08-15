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
