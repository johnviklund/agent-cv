import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const retired = ["data", "public", "examples/private-data", "docs", "artifacts", "scripts/bootstrap-example-data.mjs", "test/bootstrap-example-data.test.mjs"];

test("the tracked engine tree excludes owner sources, generated output and retired bootstrap files", () => {
  const tracked = execFileSync("git", ["ls-files", "--", ...retired], { encoding: "utf8" });
  assert.equal(tracked, "");
});

test("owner data and public outputs stay ignored and bootstrap is retired", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(Object.hasOwn(pkg.scripts, "bootstrap:data"), false);
  assert.doesNotMatch(pkg.scripts.check, /bootstrap-example-data/);
  for (const path of ["data/cv.md", "public/cv.md"]) {
    const ignored = execFileSync("git", ["check-ignore", "--no-index", path], { encoding: "utf8" });
    assert.equal(ignored.trim(), path);
  }
});
