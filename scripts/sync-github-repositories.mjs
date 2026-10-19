import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadOwner, resolveOwnerRoot } from "./owner.mjs";
import { renderRepositoryKnowledge, validateRepositoryManifest } from "./repository-grounding.mjs";

const defaultEngineRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GITHUB_TIMEOUT_MS = 15_000;

// Fetches only the repositories and documents the owner's repositories.json names; local documents
// stay in the engine checkout. There is no engine fallback for the allowlist.
export async function syncRepositories({
  engineRoot = defaultEngineRoot,
  ownerRoot = resolveOwnerRoot({ engineRoot }),
  fetchImpl = fetch,
  token = process.env.GITHUB_TOKEN,
} = {}) {
  const manifest = validateRepositoryManifest(JSON.parse(await readFile(resolve(ownerRoot, "repositories.json"), "utf8")));
  const { owner } = await loadOwner({ root: ownerRoot });
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": `${owner.slug}-agent-cv-repository-sync`,
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  const github = { headers, fetchImpl, engineRoot };

  const repositories = [];
  for (const entry of manifest) {
    repositories.push(await fetchRepository(entry, github));
  }
  await writeFile(resolve(engineRoot, "data", "repositories.md"), renderRepositoryKnowledge(repositories));
  return repositories;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const repositories = await syncRepositories();
  console.log(`Updated repository grounding for ${repositories.length} allowlisted public repositories.`);
}

async function fetchRepository(entry, github) {
  const [owner, repository] = entry.repository.split("/").map(encodeURIComponent);
  const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
  const [metadata, languages] = await Promise.all([
    githubJson(apiRoot, github),
    githubJson(`${apiRoot}/languages`, github),
  ]);
  if (metadata.private) throw new Error(`${entry.repository} is not public.`);

  const documents = new Map();
  for (const path of entry.documents) {
    try {
      documents.set(path, await githubText(`${apiRoot}/contents/${encodePath(path)}`, github));
    } catch (error) {
      console.warn(`Skipped remote ${entry.repository}/${path}: ${error.message}`);
    }
  }
  for (const path of entry.localDocuments) {
    try {
      documents.set(path, await readFile(resolve(github.engineRoot, path), "utf8"));
    } catch (error) {
      throw new Error(`Missing local repository document ${path}: ${error.message}`);
    }
  }

  return {
    project: entry.project,
    repository: entry.repository,
    url: metadata.html_url,
    description: metadata.description,
    updatedAt: metadata.pushed_at || metadata.updated_at,
    defaultBranch: metadata.default_branch,
    license: metadata.license?.spdx_id || null,
    languages,
    documents: [...documents].map(([path, content]) => ({ path, content })),
  };
}

async function githubJson(url, { headers, fetchImpl }) {
  const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${url}`);
  return response.json();
}

async function githubText(url, { headers, fetchImpl }) {
  const response = await fetchImpl(url, {
    headers: { ...headers, accept: "application/vnd.github.raw+json" },
    signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
  return response.text();
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
