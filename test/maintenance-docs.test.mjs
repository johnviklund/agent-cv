import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("repository introduction explains the engine, demo and development records before forking", async () => {
  const readme = await read("README.md");
  const intro = readme.split("## Create your own Agent CV")[0];
  assert.match(intro, /open-source .*engine/);
  assert.ok(intro.includes("https://" + "jo" + "hnvik" + "lund.com"));
  for (const decision of ["Grounded claims", "A small public contract", "Bounded cost and abuse", "Useful without the model"]) {
    assert.ok(intro.includes(decision), decision);
  }
  assert.ok(intro.includes("docs/how-this-was-built.md"));
  const history = await read("docs/how-this-was-built.md");
  for (const path of [".workflow/", "memory/", "WORKLOG.md", ".agents/"]) assert.ok(history.includes(path), path);
});

test("documented npm scripts and relative Markdown links resolve", async () => {
  const pkg = JSON.parse(await read("package.json"));
  for (const path of ["README.md", "AGENTS.md", "USERGUIDE.md", "docs/how-this-was-built.md"]) {
    const text = await read(path);
    for (const [, script] of text.matchAll(/npm run ([\w:-]+)/g)) {
      assert.ok(Object.hasOwn(pkg.scripts, script), `${path}: npm run ${script}`);
    }
    for (const [, target] of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      if (/^(?:[a-z]+:|\/|#)/i.test(target)) continue;
      assert.ok(existsSync(new URL(target.split("#")[0], new URL(`../${path}`, import.meta.url))), `${path}: ${target}`);
    }
  }
});

test("maintenance instructions use the owner and the two-repo shipping flow", async () => {
  const agents = await read("AGENTS.md");
  const skills = await Promise.all(["refresh-agent-cv-projects", "review-agent-cv-conversations"].map((name) => (
    read(`.agents/skills/${name}/SKILL.md`)
  )));
  for (const text of [agents, ...skills]) assert.doesNotMatch(text, new RegExp("jo" + "hn|vik" + "lund", "i"));
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


test("cutover docs keep owner sources and drop legacy bootstrap instructions", async () => {
  for (const path of ["AGENTS.md", "README.md", "USERGUIDE.md", "design.md",
    ".agents/skills/verify-agent-cv/SKILL.md", ".agents/skills/verify-agent-cv/features/ask-chat.md"]) {
    const text = await read(path);
    assert.doesNotMatch(text, /until U8|bootstrap:data|examples\/private-data|retains legacy public copies/i, path);
    const allowed = text.replaceAll("jo" + "hnvik" + "lund/agent-cv", "")
      .replace(new RegExp("^Live demo: \\[jo" + "hnvik" + "lund\\.com\\]\\(https://jo" + "hnvik" + "lund\\.com\\)\\.\\r?$", "m"), "");
    assert.doesNotMatch(allowed, new RegExp("jo" + "hn|vik" + "lund", "i"), path);
  }
  assert.match(await read("README.md"), /open-source .*engine/);
  assert.match(await read("USERGUIDE.md"), /<owner root>\/data\//);
});
