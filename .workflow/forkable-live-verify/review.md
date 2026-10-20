Command: workflow review forkable-live-verify
Created: 2026-10-20
Base:    5c84e80
Inputs:  .workflow/forkable-live-verify/plan.md @ 6614dd1
Status:  complete

## Coverage
- [x] T1 — acceptance 5/5: self-test 6/6 pass (live-check_test.mjs), receipts/live-baseline.md (8 GETs, 0 POSTs)
- [x] T3 — acceptance 5/5 tested and passing (test/sync-owner.test.mjs 15/15; `grep -c` USERGUIDE → 1); C1-1 open
- [x] T2 — acceptance 5/5 in receipts/live-verification.md (deploy exit 0, c082c445 at 100% ≠ 833d10d6, 4/4 sha + PDF sha, health, ask completed, compare valid, admin 401 ×2)
- [x] B1…B7 delivered · Outcome observed on johnviklund.com via live-check `--get-only` (receipts/review-live-check.md: PASS) + `wrangler deployments status` → c082c445 at 100% · out of scope untouched
- [x] .workflow/ dependency check — only hits are scripts/check-leaks.mjs:23 and its test, which skip the folder (pre-existing, read nothing)
Size: +1 code · +24 tests · ratio 24 · net +25 (USERGUIDE.md ±1 not counted) · over 1,000: none
Reachability: live-check.mjs → run-folder CLI (by design, F8) · sync-owner allowlist → `npm run deploy` · guards shown failing: filter line, site.json, data, assets, repositories.json, comparison-evidence.json (mutants 2–4 fails each); owner.json mutant survives (C1-1)
Independence: cross-vendor (writer GPT-6.1 Sol · OpenAI; reviewer Opus 5.5 · Anthropic)
Checks: npm test 326 pass · 0 fail · 2 skipped · escape-hatch scan: none · existing test assertions unchanged (diff adds only)

## Cycle 1 findings
### P1 — C1-1 owner.json allowlist key is untested
- Evidence: removing `"owner.json"` from scripts/sync-owner.mjs:31 in a throwaway worktree → test/sync-owner.test.mjs 15/15 still pass; every other key fails 2–4 tests. owner.json is where the example name most likely survives (`name.full`), and owner.mjs:100 `refuseExample` checks only the path, so the mutant would deploy "Ada Example" as the owner. Repeat of memory/validate-both-schema-bounds.md.
- Disposition: fix now → patch_plan.md C1-T1
- Resolved: —

### P3 — allowlist literal sits inside the loop
- Evidence: scripts/sync-owner.mjs:31 rebuilds a 6-item array per root entry; a named `deployInputs` const beside `privateDataFiles` would read better and give the test one list to iterate.
- Disposition: defer (stays here)
- Resolved: —

## Pre-existing / environmental
- check-leaks.mjs:23 names `.workflow/` to skip it; not a dependency on run contents.

## Cycle 1 verdict
Acceptance met; B1–B7 and the Outcome hold live. One P1 (C1-1: untested owner.json guard key, test-only fix), one P3 deferred. Patch cycle 1 → C1-T1.
