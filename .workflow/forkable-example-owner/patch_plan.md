Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    8971fcf
Inputs:  .workflow/forkable-example-owner/review.md @ 8971fcf
Status:  complete

## Execution state
C1-T1 and C1-T2 done; next cross-vendor review.
C1-T1 @ 882b97c · red checkpoints b518c28, 2f96f27
C1-T2 @ b16b8bd · red checkpoint 7f7d85d
writer: GPT-6.1 Sol · C1-T2 high
Baseline C1-T2: npm run check passed, 301 pass / 3 skip; no pre-existing failures with permitted child processes.
Verification: receipts/c1-t1-verification.md, receipts/c1-t2-verification.md.
Uncommitted files: none. Pending decision: none.

## Tickets

### C1-T1 — repository sync and the CV PDF use the owner's `data/`
Delivers: C1-1 · Blocked by: none · Lane: contract
Budget: code +6 · tests +20
Seam: `syncRepositories({ engineRoot, ownerRoot })`; `build-cv-pdf.mjs` `main()`
Accept:
- [x] `syncRepositories` with a stubbed fetch → writes `<ownerRoot>/data/repositories.md`; a following `syncPublicData` → `public/repositories.md` contains the fetched repository heading (C1-1)
- [x] `build-cv-pdf.mjs` reads `cv.md` from the selected owner root's `data/`, not the engine's: `grep -n 'resolve(root, "data"' scripts/build-cv-pdf.mjs scripts/sync-github-repositories.mjs` → 0 hits (C1-1)
- [x] `AGENTS.md:38`, `README.md:84` and `.agents/skills/refresh-agent-cv-projects/SKILL.md:18,39` name `<owner root>/data/` as where public sources are edited (C1-1)
- [x] Red commit first: the new test fails on 8971fcf; `test/owner-manifests.test.mjs:437` may move to the owner path in that same red commit; the fix commit leaves test files untouched
Verify: `node --test test/owner-manifests.test.mjs test/sync-public-data.test.mjs && npm run check` (pre: new test red)
Skills: none
Status: done @ 882b97c
Writer: GPT-6.1 Sol

### C1-T2 — the leak scan's default folders are tested
Delivers: C1-2 · Blocked by: none · Lane: logic
Budget: code +2 · tests +4
Seam: an exported `LEAK_SCAN_DIRS` in `scripts/check-leaks.mjs`, used by `main()`
Accept:
- [x] `test/check-leaks.test.mjs` asserts the default list is exactly `build/site`, `public`, `src/data` resolved from the engine root; emptying it turns the test red (C1-2)
- [x] Red commit first: the assertion fails on 8971fcf (export missing); the fix commit leaves test files untouched
Verify: `node --test test/check-leaks.test.mjs` (pre: red)
Skills: none
Status: done @ b16b8bd
Writer: GPT-6.1 Sol

## Deviations
- C1-T1: an existing maintenance-docs test required the obsolete engine path. Corrected it in a second red checkpoint before the fix commit. Source assertions 4 to 5; expanded assertions 13 to 12 because the unrelated conversation skill's obsolete-path assertion was removed. Owner-manifests assertions 14 to 16; its two existing output assertions now read the owner path. No tests changed in 882b97c.
- C1-T1: the conversation-review skill still names engine data; recorded for later scope rather than editing another skill in this ticket.
