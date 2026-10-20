Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    cd29b00
Inputs:  .workflow/forkable-example-owner/review.md @ cd29b00
Status:  complete

## Execution state
Patch cycle 2 complete. Next: review cycle 3.
C2-T1 @ dc7a942 · red checkpoint @ 3399f99
writer: GPT-6.1 Sol · high
Baseline: 302 passed, 3 skipped; no failures with subprocess permissions.
Verification: receipts/c2-t1-verification.md. CI success on 62a53d1; pending: none.
Uncommitted: none after this record commits. No private owner files changed.
Cycle 1 tickets: C1-T1 @ 882b97c, C1-T2 @ b16b8bd (see git history of this file).

## Tickets

### C2-T1 — evidence builder and project review read the owner's `data/`
Delivers: C2-1 (reopens C1-1) · Blocked by: none · Lane: logic
Budget: code +4 · tests +30
Seam: `writeComparisonEvidence({ root, ownerRoot, sourceRoot })` in `scripts/build-comparison-evidence.mjs:78`; `runProjectReview({ root, ownerRoot })` in `scripts/review-project-sources.mjs:13,57`
Sites (class search `resolve(root|repositoryRoot|engineRoot, <public source>)` at planning): `build-comparison-evidence.mjs:84` (default `sourceRoot`), `review-project-sources.mjs:57-58` (read + `isWithin` guard), `.agents/skills/review-agent-cv-conversations/SKILL.md:15`. `sync-public-data.mjs:42` already passes `sourceRoot` — leave it.
Accept:
- [x] `writeComparisonEvidence({ root: engine, ownerRoot: owner })` with no `sourceRoot` selects from `<owner>/data/`: engine `data/overview.md` lacks a heading the owner's has → resolves and the catalog cites the owner's text (C2-1)
- [x] `runProjectReview({ root: engine, ownerRoot: owner })` with `canonicalFiles: ["data/projects.md"]` → the packet contains the owner's `data/projects.md` text and not the engine's; a canonical path escaping the owner root still throws (C2-1)
- [x] `AGENT_CV_OWNER_ROOT=examples/owner node scripts/build-comparison-evidence.mjs` in a clean clone → exit 0 (was exit 1 "missing heading Focus") (C2-1)
- [x] `review-agent-cv-conversations/SKILL.md` names `<owner root>/data/`; `test/maintenance-docs.test.mjs` asserts `<owner root>/data/` for both skills, not `skills[0]` only (C2-1)
- [x] Red commit first: the new tests fail on cd29b00; `test/project-review.test.mjs:158` (canonical file under engine `data/`) may move to `<ownerRoot>/data/` in that red commit; the fix commit leaves test files untouched
Verify: `node --test test/comparison-evidence.test.mjs test/owner-manifests.test.mjs test/project-review.test.mjs test/maintenance-docs.test.mjs && npm run check` (pre: new tests red)
Skills: none
Status: done @ dc7a942
Writer: GPT-6.1 Sol
