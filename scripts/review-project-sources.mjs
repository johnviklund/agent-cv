import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderProjectReview, validateProjectSourceManifest } from "./project-review.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GITHUB_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT_SOURCES = 4;
const MAX_SOURCE_BYTES = 24_000;

export async function runProjectReview({
  root = repositoryRoot,
  manifestPath = resolve(root, "config", "project-sources.private.json"),
  outputPath,
  now = new Date(),
  fetchImpl = fetch,
} = {}) {
  const reviewRoot = resolve(root, "project-reviews");
  const resolvedOutput = resolve(outputPath || resolve(reviewRoot, `project-review-${now.toISOString().slice(0, 10)}.md`));
  if (!isWithin(reviewRoot, resolvedOutput) || dirname(resolvedOutput) !== reviewRoot) {
    throw new Error("Project review output must stay inside the private project-reviews directory.");
  }
  await mkdir(reviewRoot, { recursive: true, mode: 0o700 });
  if ((await lstat(reviewRoot)).isSymbolicLink()) {
    throw new Error("The private project-reviews directory must not be a symbolic link.");
  }
  const privateReviewRoot = await realpath(reviewRoot);
  if (privateReviewRoot !== resolve(await realpath(root), "project-reviews")) {
    throw new Error("The private project-reviews directory must resolve inside the repository.");
  }
  const privateOutput = resolve(privateReviewRoot, relative(reviewRoot, resolvedOutput));
  if (await isSymbolicLink(privateOutput)) {
    throw new Error("Project review output must not be a symbolic link.");
  }

  const resolvedManifest = resolve(manifestPath);
  let manifestSource;
  try {
    manifestSource = await readFile(resolvedManifest, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Missing private source manifest at ${resolvedManifest}. Copy config/project-sources.example.json, keep the private copy ignored, and add only approved sources.`);
    }
    throw error;
  }
  const manifest = validateProjectSourceManifest(JSON.parse(manifestSource));
  const canonicalPaths = [...new Set([
    ...manifest.publicRepositories,
    ...manifest.privateRepositories,
    ...manifest.localFolders,
  ].flatMap((source) => source.canonicalFiles))];
  const canonical = new Map(await Promise.all(canonicalPaths.map(async (path) => {
    const absolute = resolve(root, path);
    if (!isWithin(root, absolute)) throw new Error(`Canonical path escapes the repository: ${path}`);
    return [path, await readFile(absolute, "utf8")];
  })));

  const headers = githubHeaders();
  await ensureGithubBudget(manifest, headers, fetchImpl);
  const sourceRequests = [
    ...manifest.publicRepositories.map((entry) => ({ entry, kind: "publicRepository" })),
    ...manifest.privateRepositories.map((entry) => ({ entry, kind: "privateRepository" })),
    ...manifest.localFolders.map((entry) => ({ entry, kind: "localFolder" })),
  ];
  const sources = await mapWithConcurrency(sourceRequests, MAX_CONCURRENT_SOURCES, ({ entry, kind }) => (
    kind === "localFolder"
      ? readLocalFolder(entry, dirname(resolvedManifest))
      : fetchRepository(entry, kind, headers, fetchImpl)
  ));
  const report = renderProjectReview({
    manifest,
    canonical,
    sources,
    generatedAt: now.toISOString(),
  });

  await writePrivateReport(privateReviewRoot, privateOutput, report);
  return resolvedOutput;
}

async function fetchRepository(entry, kind, headers, fetchImpl) {
  const [owner, repository] = entry.repository.split("/").map(encodeURIComponent);
  const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
  const metadata = await githubJson(apiRoot, headers, fetchImpl);
  const expectedPrivate = kind === "privateRepository";
  if (Boolean(metadata.private) !== expectedPrivate) {
    throw new Error(`${entry.repository} does not match its ${expectedPrivate ? "private" : "public"} manifest section.`);
  }
  const [languages, tree] = await Promise.all([
    githubJson(`${apiRoot}/languages`, headers, fetchImpl),
    githubJson(`${apiRoot}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`, headers, fetchImpl),
  ]);
  if (tree.truncated) throw new Error(`${entry.repository} tree is too large for a complete review snapshot.`);
  if (typeof tree.sha !== "string" || !tree.sha) {
    throw new Error(`${entry.repository} tree did not identify a review snapshot.`);
  }
  const documents = await Promise.all(entry.documents.map(async (path) => ({
    path,
    content: await githubText(`${apiRoot}/contents/${encodePath(path)}?ref=${encodeURIComponent(tree.sha)}`, headers, fetchImpl),
  })));

  return {
    ...entry,
    kind,
    url: metadata.html_url,
    description: metadata.description,
    defaultBranch: metadata.default_branch,
    updatedAt: metadata.pushed_at || metadata.updated_at,
    trackedFiles: Array.isArray(tree.tree) ? tree.tree.filter((item) => item.type === "blob").length : null,
    languages: Object.keys(languages || {}),
    documents,
  };
}

async function readLocalFolder(entry, manifestDirectory) {
  const folder = isAbsolute(entry.path) ? resolve(entry.path) : resolve(manifestDirectory, entry.path);
  const approvedFolder = await realpath(folder);
  const documents = await Promise.all(entry.documents.map(async (path) => {
    const absolute = resolve(folder, path);
    if (!isWithin(folder, absolute)) throw new Error(`Local document escapes its approved folder: ${path}`);
    const resolvedDocument = await realpath(absolute);
    if (!isWithin(approvedFolder, resolvedDocument)) {
      throw new Error(`Local document escapes its approved folder through a symbolic link: ${path}`);
    }
    const [content, metadata] = await Promise.all([readTextPrefix(resolvedDocument), stat(resolvedDocument)]);
    return { path, content, updatedAt: metadata.mtime };
  }));
  const updatedAt = documents.reduce(
    (latest, document) => document.updatedAt > latest ? document.updatedAt : latest,
    new Date(0),
  ).toISOString();

  return {
    ...entry,
    kind: "localFolder",
    path: folder,
    updatedAt,
    documents: documents.map(({ path, content }) => ({ path, content })),
  };
}

async function ensureGithubBudget(manifest, headers, fetchImpl) {
  const repositories = [...manifest.publicRepositories, ...manifest.privateRepositories];
  if (repositories.length === 0) return;
  if (manifest.privateRepositories.length > 0 && !headers.authorization) {
    throw new Error("GITHUB_TOKEN is required to review private GitHub repositories.");
  }
  const required = repositories.reduce((total, entry) => total + 3 + entry.documents.length, 0);
  const rate = await githubJson("https://api.github.com/rate_limit", headers, fetchImpl);
  const remaining = rate?.resources?.core?.remaining;
  if (!Number.isInteger(remaining) || remaining < required) {
    throw new Error(`GitHub API allowance is insufficient for this review (${remaining ?? "unknown"} remaining; ${required} required). Set GITHUB_TOKEN and retry.`);
  }
}

async function githubJson(url, headers, fetchImpl) {
  const response = await fetchImpl(url, {
    headers,
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${url}`);
  return response.json();
}

async function githubText(url, headers, fetchImpl) {
  const response = await fetchImpl(url, {
    headers: { ...headers, accept: "application/vnd.github.raw+json" },
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${url}`);
  if (!response.body) return (await response.text()).slice(0, MAX_SOURCE_BYTES);
  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  try {
    while (bytesRead < MAX_SOURCE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = MAX_SOURCE_BYTES - bytesRead;
      const chunk = value.subarray(0, remaining);
      chunks.push(chunk);
      bytesRead += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readTextPrefix(path) {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.allocUnsafe(MAX_SOURCE_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

async function writePrivateReport(reviewRoot, outputPath, content) {
  const temporaryPath = resolve(reviewRoot, `.project-review-${randomUUID()}.tmp`);
  const handle = await open(temporaryPath, "wx", 0o600);
  try {
    await handle.writeFile(content);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporaryPath, outputPath);
    await chmod(outputPath, 0o600);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function isSymbolicLink(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function githubHeaders() {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "agent-cv-private-project-review",
    "x-github-api-version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function isWithin(parent, candidate) {
  const path = relative(resolve(parent), resolve(candidate));
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== "--manifest" && argument !== "--output") {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value) throw new Error(`${argument} requires a path.`);
    options[argument === "--manifest" ? "manifestPath" : "outputPath"] = resolve(repositoryRoot, value);
    index += 1;
  }
  return options;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const output = await runProjectReview(parseArguments(process.argv.slice(2)));
    console.log(`Wrote proposal-only private project review to ${relative(repositoryRoot, output)}. Canonical sources unchanged.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
