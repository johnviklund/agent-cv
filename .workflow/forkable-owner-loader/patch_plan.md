Command: workflow review forkable-owner-loader
Created: 2026-10-18
Base: 17687d3
Inputs: review.md @ 17687d3
Status: complete

## Execution state
Current: all patch tickets done; next re-review · baseline at 17583eb: `npm run check` exit 0, 219 pass, 1 skipped
C1-T1 @ 0923a8e (red tests @ 26b4747)
C1-T2 @ 1969b9b (red test @ b114531)
C1-T3 @ 94d61d2 (red tests @ ef9ee03)
Verify at 94d61d2: `npm run check` 224 pass, 1 skipped · golden:diff empty · build exit 0 · `sync:owner -- --deploy` syncs john-viklund
writer: Opus 5.5 (human ran execute on Opus 5.5 instead of GPT-6.1 Sol, as in cycle 0)

## Tickets

### C1-T1 — Reject unsafe snapshot capture destinations
Delivers: C1-1 · Blocked by: none · Lane: logic
Budget: code +35 · tests +45
Seam: scripts/golden.mjs main and writeGolden; reuse strict argument parsing pattern in scripts/sync-owner.mjs
Accept:
- [x] Missing or empty --golden values and unknown arguments exit 1; temporary working-directory sentinel remains unchanged.
- [x] Capture refuses engine root, owner root, and their ancestors, including path aliases; ordinary golden directory capture and diff still pass.
Verify: `node --test test/golden.test.mjs` (pre: unsafe CLI invocation exits 0 and deletes sentinel)
Skills: none
Status: done @ 0923a8e
Writer: Opus 5.5
Red: 26b4747 — 2 new tests failed (exit 0 with the sentinel deleted; ENOENT instead of a refusal)

### C1-T2 — Validate own schema properties
Delivers: C1-2 · Blocked by: none · Lane: contract
Budget: code +10 · tests +25
Seam: scripts/owner.mjs validate property lookup; all recursive strict objects and dictionaries
Accept:
- [x] JSON keys constructor, toString and __proto__ are rejected at owner root and strict nested objects with file and field errors.
- [x] links and deploy.vars apply their additionalProperties schemas to those same keys; invalid values fail, valid dictionary values pass.
Verify: `node --test test/owner.test.mjs` (pre: inherited keys bypass schema validation)
Skills: none
Status: done @ 1969b9b
Writer: Opus 5.5
Red: b114531 — new test failed: root `constructor` accepted (missing expected rejection)

### C1-T3 — Enforce deploy refusal for every owner entry path
Delivers: C1-3 · Blocked by: none · Lane: contract
Budget: code +25 · tests +35
Seam: scripts/owner.mjs resolveOwnerRoot/loadOwner; scripts/sync-owner.mjs syncOwner
Accept:
- [x] deploy rejects examples/owner through direct root, sourceRoot, both environment variables, sibling/fallback and symlink aliases; destination bytes remain unchanged.
- [x] Valid non-example roots still load and sync; missing explicit roots remain errors; existing golden diff and build pass.
Verify: `node --test test/owner.test.mjs test/sync-owner.test.mjs && npm run golden:diff && npm run build` (pre: symlink resolution and explicit-root load accept Ada in deploy mode)
Skills: none
Status: done @ 94d61d2
Writer: Opus 5.5
Red: ef9ee03 — 2 new tests failed: symlinked example accepted by resolver, loader and sync

## Deviations
- C1-T1: tests +57 vs budget +45; the engine-root cases run a temp copy of the CLI so a failing refusal cannot delete this checkout.
- C1-T2: the `required` check still reads `value[key]` through the prototype; no schema requires an inherited name, so it is left as is.
- C1-T3: tests +49 vs budget +35; `syncOwner` now takes its root from `loadOwner`, so `resolveOwnerRoot` is no longer imported there.

## Handoff
Fixes stay on feat/forkable-owner-loader per the approved plan; one PR at the end. C1-T1 is P0 and uses the heavy executor at high effort; C1-T2/C1-T3 are contract fixes at the same seat and effort. No public claims or deployment authorized by this review.
