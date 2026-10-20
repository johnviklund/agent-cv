Command: workflow review forkable-setup
Created: 2026-10-20
Base:    b230b3a
Inputs:  .workflow/forkable-setup/plan.md @ eb6247a
Status:  complete

## Coverage
- [x] T1 — acceptance 6/6 tested and passing (`test/setup.test.mjs`; B6 via receipts/t1-b6-check.txt)
- [x] T2 — acceptance 5/5 tested and passing (`test/setup.test.mjs` cloud cases; setup-admin unchanged)
- [x] T3 — acceptance 4/4 tested and passing (`test/sync-owner.test.mjs` text/image/clean)
- [x] T4 — acceptance 3/3 tested and passing (`test/maintenance-docs.test.mjs`)
- [x] B1…B8 delivered (B4 title is `<worker>-archive` per plan F6) · Outcome observed on the real CLI and deploy sync of its output, manual (verify-agent-cv drives the site, not the CLI): receipts/review-outcome.txt · out of scope untouched (`bootstrap:data`, `examples/private-data/`, TODO.md not in the diff)
- [x] .workflow/ dependency check — no hits
Size: +146 code · +198 tests · ratio 1.36 · net +311 · over 1,000: none
Reachability: `scripts/setup.mjs` → `npm run setup`; `configureAdminSecret`/`runCommand` → setup.mjs and `npm run setup:admin` · guards shown failing: deploy text scan, og-image byte check, non-TTY flag guard, key stripped from child env, archive id write, git init, wrangler env option (mutations M1–M8, all killed)
Escape hatches: none · Full suite: `npm test` 325 tests, 322 pass, 3 skipped · assertions removed from existing tests: 0
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI; reviewer Opus 5.5 / Anthropic)

## Cycle 1 findings
### P2 — a cloud failure's retry message omits the steps that never ran
- Evidence: `scripts/setup.mjs:54-74` — `step` throws on the first failure, so the later steps never run, but the message names only the failed step's retry. Input: kv create fails → message is `Retry: … npx wrangler kv namespace create …`; following it leaves OPENAI_API_KEY and ADMIN_API_TOKEN unset, and setup cannot be rerun (B2). README step 1 tells the user to "use its printed retry command". Outcome "secrets set" stays false. B5's literal is met, so P2.
- Remedy: the failure message lists the retry for the failed step and for each later step (kv → key → admin), one line each. About 10 lines plus one assertion per failure case.
- Disposition: fix now (small)
- Resolved: —

### P3 — `step` drops the underlying cause
- Evidence: `scripts/setup.mjs:59` `catch {` throws away `error.message`, so with no terminal and no key the user sees `OPENAI_API_KEY failed.` instead of `Provide OPENAI_API_KEY or run in a terminal.` (:70); the same happens to kv's `Namespace response has no id.`
- Disposition: defer (folds into C1-T1 for free if the fixer appends the cause)
- Resolved: —

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
