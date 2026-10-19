Command: workflow review forkable-maintenance-tooling
Created: 2026-10-19
Base:    8a30e36
Inputs:  .workflow/forkable-maintenance-tooling/review.md @ 8a30e36
Status:  complete

## Execution state
Current: C1-T1 committed; local checks pass; push approval and CI pending · writer: GPT-6.1 Sol
C1-T1 @ 539d45c
Uncommitted: execution receipts only; pending decision: approve publishing the two C1-T1 commits to origin/main.

## Tickets

### C1-T1 — John refusal test names its owner, so CI passes for any bundle
Delivers: B4 · Blocked by: none · Lane: logic
Seam: `canonicalizeComparisonDraft(draft, roles, catalog, undefined, owner)` in test/comparison-core.test.mjs "provider conclusions fail closed"
Red: CI run 39264031358 (existing test, example-owner bundle); the fix edits only that test, so no separate red commit
Accept:
- [x] example-owner bundle (`AGENT_CV_OWNER_ROOT=examples/owner` bootstrap, sync:owner, sync:data in a throwaway worktree) → `node --test test/comparison-core.test.mjs` reports 0 failed (B4)
- [x] every John string in that test is canonicalized with the `JOHN` fixture as `owner` and still throws (B4)
- [x] src/comparison-core.js unchanged; `grep -ci john src/comparison-core.js` → 0 (B4)
- [ ] CI on the pushed fix commit → success
Verify: worktree run above, then `npm run check` in the primary checkout (pre: example bundle 20 passed, 1 failed; primary 294 passed, 0 failed)
Skills: none
Status: todo
Writer: GPT-6.1 Sol

## Deviations
- C1-T1 changes the existing refusal assertion to pass JOHN explicitly. Assertion counts stay 72 in the file and 2 in this test. No assertion removed.
- Automatic approval review rejected the combined receipt commit and main push before execution. The fix commit remains local; pushed CI requires explicit approval for this exact publication.
