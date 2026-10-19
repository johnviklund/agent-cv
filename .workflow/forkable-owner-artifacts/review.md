Command: workflow review forkable-owner-artifacts
Created: 2026-10-19
Base: a92f56a9f8162d67097aa1aac18daf8bac96891f
Inputs: plan.md @ c3d344a0c79dcfb368db6ecda7bd4ddbc3c2f6f2
Status: complete

Docs read: design.md §System, §Typography and spacing, §CTA voice and states, §Motion stance, §Notes; PRODUCT.md absent.

## Coverage
- [x] T1 — 4/4 acceptance lines supported by tests and card/golden receipts.
- [x] T2 — 3/3 acceptance lines supported by tests, PDF rendering and text checks.
- [ ] T3 — 2/4 acceptance lines fully met; C1-1 breaks B5, C1-2 breaks owner variable preservation.
- [x] T4 — 4/4 acceptance lines supported by origin/override/rejection tests.
- [x] T5 — 5/5 acceptance lines supported by manifest tests, committed-byte comparison and isolated Ada build.
- [ ] B1–B3, B6–B8 delivered; B4/B5 incomplete. Generated card/PDF/config Outcome observed manually, no verify skill; out of scope untouched.
- [x] Full suite, Worker build, Chromium checks and golden diff pass; three config mutations fail their tests.
- [x] .workflow dependency check: zero tracked code references. Existing test assertions never decrease.
Size: +290 code · +464 tests · ratio 1.60 · net +439 · over 1,000: test/worker.test.mjs 1334 lines
Reachability: chromium.mjs → both artifact CLIs; wrangler-config.mjs → CLI/package checker/golden/tests; evidence fixture → comparison tests; example manifests/card → owner consumers. Guards shown failing: null contact email, workers.dev exclusion, ARCHIVE selector.
Independence: cross-vendor. Opus 5.5 wrote all tickets; GPT-6.1 Sol xhigh independently reviewed code. GPT-6 Astra reproduced findings and ran verification.
Evidence: receipts/review-cycle-1.md. Writer deviations/receipts were checked after the independent first pass.

## Cycle 1 findings
### P1 — C1-1: Admin setup can configure the wrong owner's Worker
- Evidence: B5 requires every Wrangler script to use generated selected-owner config. `package.json:24` calls `scripts/configure-admin-secret.mjs:9–15`, which rotates the local token and invokes Wrangler without generation.
- Reproduction: fake npx, temporary engine, Ada selected; absent config reports `NO-CONFIG`; stale John config reports `selected-worker=john-viklund-agent-cv`. No network or real tokens used.
- Remedy: generate config with deployment validation before local-token writes or Wrangler invocation. Cover absent/stale configs and example/symlink refusal. Correct the secret-setup order in `USERGUIDE.md:108–122`.
- Disposition: fix now
- Resolved: —

### P1 — C1-2: Config formatting changes owner variable strings
- Evidence: B4/T3 require owner vars to override defaults unchanged. `scripts/wrangler-config.mjs:24–28` applies an array regex to serialized strings too.
- Reproduction: valid `deploy.vars.CUSTOM = "[ 1 ]"` becomes `"[1]"`; `"[ 1. ]"` throws `SyntaxError: Unterminated fractional number`.
- Remedy: format actual array nodes without rewriting string contents, preserving John's exact config bytes. Test string roundtrips and the crashing input.
- Disposition: fix now
- Resolved: —

### P3 — C1-3: README describes removed config files
- Evidence: `README.md:78` says config/ holds the allowlist, comparison evidence and admin origin; all three files were removed.
- Remedy: point the repository map at the owner files during documentation upkeep.
- Disposition: defer
- Resolved: —

## Pre-existing / environmental
- The sandbox's first test run failed at file level; the same required checks pass with subprocess access.
- The plan already exceeds its line budget and records three test-ratio waivers; check-run reports warnings only.
- Memory and reviewer exam classes checked; neither P1 repeats a recorded class.

## Cycle 1 verdict
Fix before shipping: 0 P0, 2 P1, 0 P2, 1 P3. Execute C1-T1 and C1-T2, then re-review.
Recommend verify.create separately for repeatable artifact inspection; no deployment was performed.
