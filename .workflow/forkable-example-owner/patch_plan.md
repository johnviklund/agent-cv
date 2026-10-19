Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    8971fcf
Inputs:  .workflow/forkable-example-owner/review.md @ 8971fcf
Status:  complete

## Tickets

### C1-T1 — repository sync and the CV PDF use the owner's `data/`
Delivers: C1-1 · Blocked by: none · Lane: contract
Budget: code +6 · tests +20
Seam: `syncRepositories({ engineRoot, ownerRoot })`; `build-cv-pdf.mjs` `main()`
Accept:
- [ ] `syncRepositories` with a stubbed fetch → writes `<ownerRoot>/data/repositories.md`; a following `syncPublicData` → `public/repositories.md` contains the fetched repository heading (C1-1)
- [ ] `build-cv-pdf.mjs` reads `cv.md` from the selected owner root's `data/`, not the engine's: `grep -n 'resolve(root, "data"' scripts/build-cv-pdf.mjs scripts/sync-github-repositories.mjs` → 0 hits (C1-1)
- [ ] `AGENTS.md:38`, `README.md:84` and `.agents/skills/refresh-agent-cv-projects/SKILL.md:18,39` name `<owner root>/data/` as where public sources are edited (C1-1)
- [ ] Red commit first: the new test fails on 8971fcf; `test/owner-manifests.test.mjs:437` may move to the owner path in that same red commit; the fix commit leaves test files untouched
Verify: `node --test test/owner-manifests.test.mjs test/sync-public-data.test.mjs && npm run check` (pre: new test red)
Skills: none
Status: todo

### C1-T2 — the leak scan's default folders are tested
Delivers: C1-2 · Blocked by: none · Lane: logic
Budget: code +2 · tests +4
Seam: an exported `LEAK_SCAN_DIRS` in `scripts/check-leaks.mjs`, used by `main()`
Accept:
- [ ] `test/check-leaks.test.mjs` asserts the default list is exactly `build/site`, `public`, `src/data` resolved from the engine root; emptying it turns the test red (C1-2)
- [ ] Red commit first: the assertion fails on 8971fcf (export missing); the fix commit leaves test files untouched
Verify: `node --test test/check-leaks.test.mjs` (pre: red)
Skills: none
Status: todo
