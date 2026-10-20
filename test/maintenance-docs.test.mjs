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
    assert.ok(text.includes("<owner root>/data/"));
    for (const phrase of ["commit and push the owner repo's main", "engine PR only for engine files", "AGENT_CV_OWNER_ROOT"]) {
      assert.ok(text.includes(phrase), phrase);
    }
  }
  assert.ok(agents.includes("<owner root>/project-sources.json"));
  assert.doesNotMatch(agents, /config\/project-sources\.private\.json/);
});

test("fork instructions follow setup, private owner storage, content review and deploy", async () => {
  const [readme, guide] = await Promise.all([read("README.md"), read("USERGUIDE.md")]);
  const section = (text, heading) => {
    const body = text.split(`## ${heading}\n`)[1]?.split(/\n## /)[0];
    assert.ok(body, `Missing section: ${heading}`);
    return body;
  };
  const fork = section(readme, "Create your own Agent CV");
  for (const command of ["npm run setup", "gh repo create", "--private", "AGENT_CV_OWNER_ROOT", "npm run deploy", "git pull upstream main"]) {
    assert.ok(fork.includes(command), command);
  }
  const local = section(guide, "Set up a local checkout");
  const deploy = section(guide, "Deploy your fork");
  for (const body of [local, deploy]) {
    assert.ok(body.includes("npm run setup"));
    assert.ok(body.includes("content-rewrite prompt"));
  }
  assert.match(local, /> .*reviewed.*owner.*data\//);
  for (const body of [section(readme, "Run it locally"), fork, local, deploy]) {
    assert.doesNotMatch(body, /bootstrap:data/);
  }
});
