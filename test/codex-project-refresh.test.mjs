import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("makes project freshness an implicitly invoked Codex workflow", async () => {
  const [agents, skill, metadata, readme, userGuide, repositoryEvidence] = await Promise.all([
    read("AGENTS.md"),
    read(".agents/skills/refresh-agent-cv-projects/SKILL.md"),
    read(".agents/skills/refresh-agent-cv-projects/agents/openai.yaml"),
    read("README.md"),
    read("USERGUIDE.md"),
    read("data/repositories.md"),
  ]);

  assert.match(agents, /use the repo-local `refresh-agent-cv-projects` skill automatically/i);
  assert.match(skill, /Treat Codex as the user interface/i);
  assert.match(skill, /Removing or privatizing repository evidence does not remove the corresponding project/i);
  assert.match(skill, /ask at most three related questions at a time/i);
  assert.match(skill, /Treat dirty canonical files as pending user work, not approved claims/i);
  assert.match(skill, /never rely on an older packet/i);
  assert.match(skill, /Ask before adding any other repository, folder, document/i);
  assert.match(skill, /Keep private repository names, absolute paths, and unnecessary source excerpts out of user-facing summaries/i);
  assert.match(skill, /commit, push, open and merge a PR, then deploy/i);
  assert.match(metadata, /allow_implicit_invocation: true/);
  assert.match(readme, /Review my project and repository updates, ask me what changed, and update the site/i);
  assert.match(userGuide, /You do not need to remember a script, manifest format, Git command, or deployment command/i);
  assert.match(repositoryEvidence, /Review my project and repository updates, ask me what changed, and update the site/i);
  assert.doesNotMatch(repositoryEvidence, /Copy `config\/project-sources\.example\.json`/i);
});
