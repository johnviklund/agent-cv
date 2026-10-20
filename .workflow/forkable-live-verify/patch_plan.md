Command: workflow review forkable-live-verify
Created: 2026-10-20
Base:    5c84e80
Inputs:  .workflow/forkable-live-verify/review.md @ 5c84e80
Status:  complete

## Tickets

### C1-T1 — test the owner.json deploy-guard key
Delivers: C1-1 · Blocked by: none · Lane: logic
Budget: code +0 · tests +6
Seam: `syncOwner({ sourceRoot, destinationRoot, deploy: true })` in test/sync-owner.test.mjs
Accept:
- [ ] valid owner.json with `name.full` "Ada Example" → rejects with "Refusing to deploy example content in: owner.json"; engine `data/` unchanged
  (assert the guard text: an invalid-JSON error also names owner.json)
- [ ] mutant check: with `"owner.json"` removed from scripts/sync-owner.mjs:31 in a throwaway worktree, the new case fails; nothing committed from the worktree
- [ ] scripts/sync-owner.mjs untouched; no existing test case edited
Verify: `node --test test/sync-owner.test.mjs` (pre: 15 passed; owner.json mutant 15 passed)
Skills: none
Status: todo
Writer: —
