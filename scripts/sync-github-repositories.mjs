import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderRepositoryKnowledge, validateRepositoryManifest } from "./repository-grounding.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = validateRepositoryManifest(JSON.parse(
  await readFile(resolve(root, "config", "repositories.json"), "utf8"),
));
const headers = {
  accept: "application/vnd.github+json",
  "user-agent": "johnviklund-agent-cv-repository-sync",
  "x-github-api-version": "2022-11-28",
};
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const repositories = [];
for (const entry of manifest) {
  repositories.push(await fetchRepository(entry));
}

const output = renderRepositoryKnowledge(repositories);
await writeFile(resolve(root, "data", "repositories.md"), output);
console.log(`Updated repository grounding for ${repositories.length} allowlisted public repositories.`);

async function fetchRepository(entry) {
  const [owner, repository] = entry.repository.split("/").map(encodeURIComponent);
  const apiRoot = `https://api.github.com/repos/${owner}/${repository}`;
  const [metadata, languages] = await Promise.all([
    githubJson(apiRoot),
    githubJson(`${apiRoot}/languages`),
  ]);
  if (metadata.private) throw new Error(`${entry.repository} is not public.`);

  const documents = new Map();
  for (const path of entry.documents) {
    try {
      documents.set(path, await githubText(`${apiRoot}/contents/${encodePath(path)}`));
    } catch (error) {
      console.warn(`Skipped remote ${entry.repository}/${path}: ${error.message}`);
    }
  }
  for (const path of entry.localDocuments) {
    try {
      documents.set(path, await readFile(resolve(root, path), "utf8"));
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

async function githubJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${url}`);
  return response.json();
}

async function githubText(url) {
  const response = await fetch(url, {
    headers: { ...headers, accept: "application/vnd.github.raw+json" },
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
  return response.text();
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}
