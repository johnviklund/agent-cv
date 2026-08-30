import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateComparisonPayload } from "../src/comparison-core.js";

const fixture = JSON.parse(await readFile(
  new URL("./fixtures/comparison-roles.json", import.meta.url),
  "utf8",
));

test("challenge fixtures provide valid synthetic one-, two-, and three-role requests", () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.synthetic, true);
  assert.deepEqual(Object.keys(fixture.fixtures), ["oneRole", "twoRoles", "threeRoles"]);

  for (const [name, request] of Object.entries(fixture.fixtures)) {
    const expectedCount = { oneRole: 1, twoRoles: 2, threeRoles: 3 }[name];
    const normalized = validateComparisonPayload(request);
    assert.equal(normalized.roles.length, expectedCount);
    assert.equal(normalized.roles.every(({ company }) => company.endsWith("(fictional)")), true);
    assert.equal(JSON.stringify(request).includes("@"), false);
    assert.equal(JSON.stringify(request).includes("http"), false);
  }
});

test("the three-role video fixture stays compact and has distinct comparison columns", () => {
  const request = fixture.fixtures.threeRoles;
  const serialized = JSON.stringify(request);
  assert.ok(Buffer.byteLength(serialized) < 4_000);
  assert.equal(new Set(request.roles.map(({ title }) => title)).size, 3);
  assert.equal(new Set(request.roles.map(({ company }) => company)).size, 3);
});

test("the documented challenge cost ceiling matches the enforced request caps", async () => {
  const [config, submission] = await Promise.all([
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../docs/webmcp-challenge-submission.md", import.meta.url), "utf8"),
  ]);
  assert.deepEqual(config.vars, {
    ...config.vars,
    OPENAI_MODEL: "gpt-5.6-luna",
    MAX_OUTPUT_TOKENS: "700",
    MONTHLY_REQUEST_CAP: "1000",
    COMPARISON_MODEL: "gpt-5.6-luna",
    COMPARISON_MAX_OUTPUT_TOKENS: "8000",
    COMPARISON_MONTHLY_REQUEST_CAP: "60",
  });

  const worstCaseCost = (1_000 * 320_000 * 0.20 / 1_000_000)
    + (1_000 * 700 * 1.20 / 1_000_000)
    + (60 * 100_000 * 0.20 / 1_000_000)
    + (60 * 8_000 * 1.20 / 1_000_000);
  assert.equal(worstCaseCost, 66.616);
  assert.match(submission, /Worst-case configured total: \$66\.616/);
  assert.match(submission, /24,000-character private application job description/i);
  assert.match(submission, /These are billing-safety bounds, not expected English usage/i);
});
