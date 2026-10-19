Command: workflow review forkable-owner-artifacts
Created: 2026-10-19
Base: a92f56a
Inputs: review.md @ a92f56a
Status: complete

## Execution state
C1-T1 @ 1ae2871 (red 709d202) · C1-T2 @ 59faacd (red 4f33a7e) · all fixes done; next review · writer: Opus 5.5 (human-approved swap, as cycle 0; re-review cross-vendor by GPT-6.1 Sol)
Baseline 276/3 skip → C1-T1 282/3 → C1-T2 289/3.

## Cycle 1 fixes
Two contract tickets address C1-1 and C1-2. Each requires a failing regression-test commit before its implementation commit; implementation leaves test files untouched.

### C1-T1 — Generate selected-owner config before admin setup
Delivers: B5 · Blocked by: none · Lane: contract
Budget: code +20 · tests +60
Seam: setup:admin → selected-owner config validation → local token write → fake Wrangler secret command.
Accept:
- [x] A real temporary owner tested with both absent and other-owner configs reaches fake Wrangler with its own worker name and namespace; regression tests first fail on the reviewed code.
- [x] Example owner and its symlink fail before both local-token writes and Wrangler invocation; existing local token remains unchanged.
- [x] All Wrangler entry points use selected-owner config: dev, build, deploy, check:worker-package and setup:admin. USERGUIDE secret setup generates validated config before remote secret commands.
Verify: `node --test test/admin-secret-file.test.mjs test/wrangler-config.test.mjs` plus the new setup-admin regression file; `npm run check && npm run build` (pre: 276 passed, 3 skipped; safe probe selects stale John config).
Skills: none
Status: done @ 1ae2871
Writer: Opus 5.5
Red: 709d202 (6 fail) → green 1ae2871; receipts/c1-t1-verification.md
Search: `rg -n wrangler scripts package.json .github USERGUIDE.md` found setup:admin as the only uncovered executable caller; reuse writeWranglerConfig with deploy validation. Document explicit config generation after namespace setup and before OPENAI_API_KEY/admin token setup.

### C1-T2 — Preserve strings while formatting config arrays
Delivers: B4, B8 · Blocked by: C1-T1 · Lane: contract
Budget: code +30 · tests +25
Seam: buildWranglerConfig → serialized JSON → exact owner vars and John golden bytes.
Accept:
- [x] Owner var strings `[ 1 ]`, `The [ 1, 2 ] cases`, `[ null ]`, `[ 1. ]`, quotes and backslashes roundtrip unchanged; regression tests first fail on the reviewed code.
- [x] Actual arrays retain required formatting; John's existing digest and golden diff pass without baseline updates; CONTACT_EMAIL and binding behavior stay covered.
Verify: `node --test test/wrangler-config.test.mjs test/golden.test.mjs`; `npm run check && npm run build && npm run golden:diff` (pre: current suite passes; `[ 1 ]` changes and `[ 1. ]` throws).
Skills: none
Status: done @ 59faacd
Writer: Opus 5.5
Red: 4f33a7e (5 of 6 cases fail; backslash case already passed) → green 59faacd; receipts/c1-t2-verification.md
Search: current formatter is local to scripts/wrangler-config.mjs. Replace its string-blind regex; avoid a general formatting package or a second config serializer.

## Deviations
- Ratio waived: C1-T1 — tests +70 against code +6: the fix is one guarded call, while the plan's +60 test budget buys two config states and two example-root spellings through a real subprocess with a fake Wrangler.
- Budget waived: C1-T1 — tests +70 against +60: the extra lines are the shared engine-copy fixture and fake npx.
