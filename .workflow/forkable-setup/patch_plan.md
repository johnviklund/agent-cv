Command: workflow review forkable-setup
Created: 2026-10-20
Base:    b230b3a
Inputs:  .workflow/forkable-setup/review.md @ b230b3a
Status:  complete

## Execution state
Current: C1-T1 ready · writer: —

## Tickets

### C1-T1 — a cloud failure prints the retry for the failed step and every later step
Delivers: B5 (fixes C1 P2 retry message) · Blocked by: none · Lane: logic
Budget: code +12 · tests +8
Seam: `runSetup` with an injected `run` (`test/setup.test.mjs` cloud failure cases)
Accept:
- [ ] kv fails → message contains the kv retry, `npx wrangler secret put OPENAI_API_KEY` and `npm run setup:admin`, in that order (B5)
- [ ] OPENAI_API_KEY fails → message contains its retry and `npm run setup:admin`, and no kv retry (B5)
- [ ] ADMIN_API_TOKEN fails → message contains only `npm run setup:admin` (B5)
- [ ] each failure message still names the step and the owner directory, and ends with the original error's message (folds in the P3 cause finding) (B5)
Verify: `node --test test/setup.test.mjs` (pre: 14 passed)
Red: the test commit first, run and seen to fail; then the fix, test files untouched
Skills: none
Status: todo
