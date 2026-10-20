Command: workflow review forkable-setup
Created: 2026-10-20
Base:    4872ec6
Inputs:  .workflow/forkable-setup/plan.md @ eb6247a
Status:  complete

## Coverage
- [x] T1 — acceptance 6/6 tested and passing (`test/setup.test.mjs`; B6 via receipts/t1-b6-check.txt)
- [x] T2 — acceptance 5/5 tested and passing (`test/setup.test.mjs` cloud cases; setup-admin unchanged)
- [x] T3 — acceptance 4/4 tested and passing (`test/sync-owner.test.mjs` text/image/clean)
- [x] T4 — acceptance 3/3 tested and passing (`test/maintenance-docs.test.mjs`)
- [x] B1…B8 delivered (B4 title is `<worker>-archive` per plan F6) · Outcome observed on the real CLI and deploy sync of its output, manual (verify-agent-cv drives the site, not the CLI): receipts/review-outcome.txt · out of scope untouched (`bootstrap:data`, `examples/private-data/`, TODO.md not in the diff)
- [x] .workflow/ dependency check — no hits
Size: +154 code · +205 tests · ratio 1.33 · net +326 · over 1,000: none
Reachability: `scripts/setup.mjs` → `npm run setup`; `configureAdminSecret`/`runCommand` → setup.mjs and `npm run setup:admin` · guards shown failing: deploy text scan, og-image byte check, non-TTY flag guard, key stripped from child env, archive id write, git init, wrangler env option (mutations M1–M8, all killed)
Escape hatches: none · Full suite: `npm test` 325 tests, 322 pass, 3 skipped · assertions removed from existing tests: 0
Independence: cross-vendor. Cycle 1: writer GPT-6.1 Sol / reviewer Opus 5.5. Cycle 2: patch writer Opus 5.5 / reviewer GPT-6 Astra, confirmed by T3 runtime catalog.

## Resolved
| Finding | Sev | Title | Disposition | Resolved |
|---|---|---|---|---|
| C1 retry message | P2 | Later cloud steps missing from retries | fix now | @ 136c1f3 (cycle 2) |
| C1 cause | P3 | Underlying step cause omitted | fixed with C1-T1 | @ 136c1f3 (cycle 2) |

## Cycle 1 findings
### P3 — schema read from the module root, not `engineRoot`
- Evidence: `scripts/setup.mjs:42` uses `root`, while every other read uses `engineRoot`. Harmless today.
- Disposition: defer
- Resolved: —

### P3 — `setup:admin` no longer shows Wrangler's stdout
- Evidence: `runCommand` pipes stdout (`scripts/configure-admin-secret.mjs:14`); previously inherited. The success line still prints.
- Disposition: defer
- Resolved: —

### P3 — the deploy gate misses Ada's headline and location in `owner.json`
- Evidence: `examples/owner/owner.json:5-6`; only the literal "Ada Example" and the og-image bytes are refused (B7 as agreed, D3).
- Disposition: defer
- Resolved: —

## Pre-existing / environmental
- Sandboxed runs fail the five child-process test files (plan Baseline); suite run unsandboxed.

## Cycle 1 verdict
No P0/P1. One small P2 (retry message covers only the failed step) → patch cycle 1, ticket C1-T1. Four P3s deferred, kept here.

## Cycle 2 findings
None.

## Cycle 2 coverage
- [x] C1-T1 acceptance 4/4: kv, missing id, OpenAI and admin failures preserve state, list only remaining retries in order, and retain the received cause.
- [x] Outcome: inspected messages from injected cloud failures and missing-key input; receipts/review-cycle-2-outcome.txt. Site verification recipes contain no CLI entry point.
- [x] Regression: npm run check passes, 325 tests / 322 pass / 3 skipped; 10 pages pass static checks.
- [x] Six mutations fail at the intended assertions; baseline setup suite passes 14/14 in a disposable worktree.
- [x] No new module, unused branch, escape hatch, removed assertion, out-of-scope edit or code reference to .workflow/.
- [x] Red-to-fix test diff inspected: one expectation corrected for the pre-existing admin wrapper; seven callback assertions remain. Documented exception to the unchanged-test rule, not a weakened retry assertion.
Evidence: receipts/review-cycle-2.md. Original T1–T4 coverage carries forward; only setup retry code and its tests changed.

## Cycle 2 verdict
Ship as-is. No P0/P1/P2 findings remain. Three prior P3 findings stay deferred. Both patched cycle 1 findings are resolved; next: workflow wrap forkable-setup.
