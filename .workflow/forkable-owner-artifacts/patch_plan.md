Command: workflow review forkable-owner-artifacts
Created: 2026-10-19
Base: a92f56a
Inputs: review.md @ a92f56a
Status: complete

## Cycle 1 fixes
Two contract tickets address C1-1 and C1-2. Each requires a failing regression-test commit before its implementation commit; implementation leaves test files untouched.

### C1-T1 — Generate selected-owner config before admin setup
Delivers: B5 · Blocked by: none · Lane: contract
Budget: code +20 · tests +60
Seam: setup:admin → selected-owner config validation → local token write → fake Wrangler secret command.
Accept:
- [ ] A real temporary owner tested with both absent and other-owner configs reaches fake Wrangler with its own worker name and namespace; regression tests first fail on the reviewed code.
- [ ] Example owner and its symlink fail before both local-token writes and Wrangler invocation; existing local token remains unchanged.
- [ ] All Wrangler entry points use selected-owner config: dev, build, deploy, check:worker-package and setup:admin. USERGUIDE secret setup generates validated config before remote secret commands.
Verify: `node --test test/admin-secret-file.test.mjs test/wrangler-config.test.mjs` plus the new setup-admin regression file; `npm run check && npm run build` (pre: 276 passed, 3 skipped; safe probe selects stale John config).
Skills: none
Status: todo
Red: pending
Search: `rg -n wrangler scripts package.json .github USERGUIDE.md` found setup:admin as the only uncovered executable caller; reuse writeWranglerConfig with deploy validation. Document explicit config generation after namespace setup and before OPENAI_API_KEY/admin token setup.

### C1-T2 — Preserve strings while formatting config arrays
Delivers: B4, B8 · Blocked by: C1-T1 · Lane: contract
Budget: code +30 · tests +25
Seam: buildWranglerConfig → serialized JSON → exact owner vars and John golden bytes.
Accept:
- [ ] Owner var strings `[ 1 ]`, `The [ 1, 2 ] cases`, `[ null ]`, `[ 1. ]`, quotes and backslashes roundtrip unchanged; regression tests first fail on the reviewed code.
- [ ] Actual arrays retain required formatting; John's existing digest and golden diff pass without baseline updates; CONTACT_EMAIL and binding behavior stay covered.
Verify: `node --test test/wrangler-config.test.mjs test/golden.test.mjs`; `npm run check && npm run build && npm run golden:diff` (pre: current suite passes; `[ 1 ]` changes and `[ 1. ]` throws).
Skills: none
Status: todo
Red: pending
Search: current formatter is local to scripts/wrangler-config.mjs. Replace its string-blind regex; avoid a general formatting package or a second config serializer.
