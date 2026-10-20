Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    30caf65
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

T2 removes the tracked owner sources, generated public resources, retired bootstrap, migrated documents and obsolete QA artifacts. Private canonical sources remain in the owner repo. Generated public output stays on disk and is ignored.
Reuse: the existing content.root fixture and resolveOwnerRoot select canonical sources. No new helper or runtime abstraction.
Red: tracked-tree.test.mjs has two failures before implementation; /tmp/forkable-cutover-t2-red.log.
Green, exact Verify: sibling 29 pass / 1 skipped; Ada 26 pass / 4 skipped. Remaining owner-only skips are scheduled for T3/T4; Chromium is opt-in.
Full npm run check: exit 0, 323 pass / 3 skipped, 10 static pages pass; /tmp/forkable-cutover-t2-check.log.
Extra fixture found by the full check: owner-manifests.test.mjs copied engine data. It now copies its existing Ada fixture instead. Its assertions are unchanged; Ada verification with tracked-tree is 10 pass / 0 skipped.
Golden: before and after npm run golden:diff exit 0 with the same 19 accepted entries and no unlisted differences. cmp of complete logs exits 0; /tmp/forkable-cutover-t2-golden-{before,after}.log.
Exception manifest unchanged, sha256 8fb34630ba97f44e0ae48f9a8f084efaec54ddce42ba60c894b58a2cd98660bd.
git ls-files for all retired paths returns empty. npm run sync:data leaves git status byte-identical; public/ and data/ are ignored.
Mutation: temporarily restore package.json scripts.bootstrap:data; tracked-tree exits 1. Original package bytes restored in finally; rerun is green. /tmp/forkable-cutover-t2-mutation.log.
Assertion counts: cv-pdf 31 -> 31, project-refresh 14 -> 14, comparison-fixtures 16 -> 12, static-contract 78 -> 72, retired bootstrap test 8 -> 0. New tracked-tree test adds four assertion sites.
Changed assertions: selected-owner CV identity/footer replace fixed identity expectations; capability assertion moves to its synthetic capability fixture. Repository evidence checks its selected source's heading instead of owner-specific README prose. Four submission and six README/submission assertion sites retire with those documents. Public machine-discovery assertions remain.
Noticed: F3 missed owner-manifests' dynamically assembled data path; fixed its fixture input, with no assertion changes. No user-visible change.
