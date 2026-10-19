Command: workflow review forkable-site-rendering
Created: 2026-10-19
Base: 0835333de21e5385e3b5d8a423c95b4254976122
Inputs: review.md @ 0835333de21e5385e3b5d8a423c95b4254976122
Status: complete

## Patch cycle 1
Fix C1-1 and C1-2. Keep the frozen snapshot and John's content unchanged.
Reuse: blocks at site/templates/html.mjs:92; validate at scripts/owner.mjs:41; golden test helpers at test/golden.test.mjs:151.

### C1-T1 — Reject empty prose blocks with a field error
Delivers: B3, B4 · Blocked by: none · Lane: contract
Budget: code +15 · tests +30
Seam: existing block validation and renderer; schemas/site.schema.json if schema cardinality is enforced there.
Accept:
- [ ] Empty blocks in pages.about.body, pages.cv.body and pages.privacy.sections fail with site.json and the exact field path.
- [ ] Multiple block keys fail; each of p, h2, h3, kicker, quote and list still renders its supported markup.
- [ ] John's golden diff remains limited to the same nine approved exceptions.
Verify: `node --test test/site-rendering.test.mjs && npm run check && npm run golden:diff` (pre: 13 renderer tests pass; empty block reproduction incorrectly renders undefined)
Red: pending. Commit a failing empty-block regression test first; commit the fix separately without changing those tests.
Skills: none
Status: todo

### C1-T2 — Make golden tests enforce path identity
Delivers: B1 · Blocked by: none · Lane: logic
Budget: code +0 · tests +35
Seam: test/golden.test.mjs and reviewGolden's existing path/before/after predicate.
Accept:
- [ ] Wrong-path exceptions with matching digests leave changed, added and removed paths unlisted; matching paths are accepted.
- [ ] Independently removing path, before and after comparisons makes the relevant tests fail; removing prompt rejection also fails.
Verify: `node --test test/golden.test.mjs && npm run check` (pre: seven golden tests pass; path-removal mutation passes all seven)
Mutation: repeat in a throwaway worktree; keep the production predicate unchanged. This ticket fixes test coverage, not runtime behaviour.
Skills: none
Status: todo
