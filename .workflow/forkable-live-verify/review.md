Command: workflow review forkable-live-verify
Created: 2026-10-20
Base:    6e32468
Inputs:  .workflow/forkable-live-verify/plan.md @ 6614dd1
Status:  done

## Coverage
- [x] T1 — acceptance 5/5: self-test 6/6 pass (live-check_test.mjs), receipts/live-baseline.md (8 GETs, 0 POSTs)
- [x] T3 — acceptance 5/5 tested and passing (test/sync-owner.test.mjs 15/15; `grep -c` USERGUIDE → 1); C1-1 fixed @ 9c8ee13
- [x] T2 — acceptance 5/5 in receipts/live-verification.md (deploy exit 0, c082c445 at 100% ≠ 833d10d6, 4/4 sha + PDF sha, health, ask completed, compare valid, admin 401 ×2)
- [x] B1…B7 delivered · Outcome observed on johnviklund.com via live-check `--get-only` (receipts/review-live-check.md: PASS) + `wrangler deployments status` → c082c445 at 100% · out of scope untouched
- [x] .workflow/ dependency check — only hits are scripts/check-leaks.mjs:23 and its test, which skip the folder (pre-existing, read nothing)
Size: +1 code · +26 tests · ratio 26 · net +27 (USERGUIDE.md ±1 not counted) · over 1,000: none
Reachability: live-check.mjs → run-folder CLI (by design, F8) · sync-owner allowlist → `npm run deploy` · guards shown failing: filter line, site.json, data, assets, repositories.json, comparison-evidence.json (mutants 2–4 fails each); owner.json (cycle 2: mutant → 1/15 fails, reviewer-run)
Independence: cross-vendor (writer GPT-6.1 Sol · OpenAI; reviewer Opus 5.5 · Anthropic)
Checks: npm test 326 pass · 0 fail · 2 skipped · escape-hatch scan: none · existing test assertions unchanged (diff adds only)

## Resolved
| Finding | Sev | Title | Disposition | Resolved |
|---|---|---|---|---|
| C1-1 | P1 | owner.json allowlist key is untested | fix now | @ 9c8ee13 (cycle 2) |
| C1-2 | P3 | allowlist literal sits inside the loop | defer (stays here) | settled: deferred (cycle 2) |

## Cycle 2 findings
Scope: fix diff 5c84e80..6e32468 (code: test/sync-owner.test.mjs +2 only) plus C1-1's class — every deploy-input key has a failing case.
- C1-1 re-verified: new case rejects with `^Refusing to deploy example content in: owner\.json\.` (anchored, so only owner.json is flagged); `node --test test/sync-owner.test.mjs` 15/15. Reviewer mutant (drop `"owner.json"` from scripts/sync-owner.mjs:31, throwaway worktree, removed) → 1 fail, `Missing expected rejection`. Class: the other five keys failed under cycle 1 mutants; no allowlist code changed since.
- Fix is test-only: scripts/sync-owner.mjs untouched; no existing case or assertion edited (diff adds 2 lines). No regressions: npm test 326 pass · 0 fail · 2 skipped. Escape-hatch scan: none. .workflow/ check: unchanged (check-leaks skip only).
- No new findings.

## Pre-existing / environmental
- Two stale worktrees outside this run remain (/tmp/agent-cv-maintenance-c1, /tmp/agent-cv-review-cycle2); not created here, left alone.
- check-leaks.mjs:23 names `.workflow/` to skip it; not a dependency on run contents.

## Cycle 1 verdict
Acceptance met; B1–B7 and the Outcome hold live. One P1 (C1-1: untested owner.json guard key, test-only fix), one P3 deferred. Patch cycle 1 → C1-T1.

## Cycle 2 verdict
C1-1 fixed and proven by a reviewer-run mutant; C1-2 (P3) stays deferred. No open findings — ship as-is → wrap.
