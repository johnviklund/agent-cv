import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";

test("CI builds the complete example owner without bootstrapping or comparing generated sources", async () => {
  const workflow = parse(await readFile(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"));
  const steps = workflow.jobs.verify.steps;
  const build = steps.find((step) => step.run === "npm run build");
  assert.equal(build.env?.AGENT_CV_OWNER_ROOT, "examples/owner");
  assert.equal(steps.some((step) => /bootstrap:data|git\s+diff/.test(step.run ?? "")), false);
});
