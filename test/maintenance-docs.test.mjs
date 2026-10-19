import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("maintenance instructions use the owner and the two-repo shipping flow", async () => {
  const agents = await read("AGENTS.md");
  const skills = await Promise.all(["refresh-agent-cv-projects", "review-agent-cv-conversations"].map((name) => (
    read(`.agents/skills/${name}/SKILL.md`)
  )));
  for (const text of [agents, ...skills]) assert.doesNotMatch(text, /John|Viklund|johnviklund/i);
  for (const text of skills) {
    for (const phrase of ["commit and push the owner repo's main", "engine PR only for engine files", "AGENT_CV_OWNER_ROOT"]) {
      assert.ok(text.includes(phrase), phrase);
    }
  }
  assert.ok(skills[0].includes("<owner root>/data/"));
  assert.ok(agents.includes("<owner root>/project-sources.json"));
  assert.doesNotMatch(agents, /config\/project-sources\.private\.json/);
});
