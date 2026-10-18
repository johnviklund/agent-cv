Command: workflow review forkable-owner-loader
Created: 2026-10-18
Base: 17687d3
Inputs: review.md @ 17687d3
Status: complete

## Tickets

### C1-T1 — Reject unsafe snapshot capture destinations
Delivers: C1-1 · Blocked by: none · Lane: logic
Budget: code +35 · tests +45
Seam: scripts/golden.mjs main and writeGolden; reuse strict argument parsing pattern in scripts/sync-owner.mjs
Accept:
- [ ] Missing or empty --golden values and unknown arguments exit 1; temporary working-directory sentinel remains unchanged.
- [ ] Capture refuses engine root, owner root, and their ancestors, including path aliases; ordinary golden directory capture and diff still pass.
Verify: `node --test test/golden.test.mjs` (pre: unsafe CLI invocation exits 0 and deletes sentinel)
Skills: none
Status: todo
Red: pending — commit failing regression tests first; then fix without editing those tests.

### C1-T2 — Validate own schema properties
Delivers: C1-2 · Blocked by: none · Lane: contract
Budget: code +10 · tests +25
Seam: scripts/owner.mjs validate property lookup; all recursive strict objects and dictionaries
Accept:
- [ ] JSON keys constructor, toString and __proto__ are rejected at owner root and strict nested objects with file and field errors.
- [ ] links and deploy.vars apply their additionalProperties schemas to those same keys; invalid values fail, valid dictionary values pass.
Verify: `node --test test/owner.test.mjs` (pre: inherited keys bypass schema validation)
Skills: none
Status: todo
Red: pending — commit failing regression tests first; then fix without editing those tests.

### C1-T3 — Enforce deploy refusal for every owner entry path
Delivers: C1-3 · Blocked by: none · Lane: contract
Budget: code +25 · tests +35
Seam: scripts/owner.mjs resolveOwnerRoot/loadOwner; scripts/sync-owner.mjs syncOwner
Accept:
- [ ] deploy rejects examples/owner through direct root, sourceRoot, both environment variables, sibling/fallback and symlink aliases; destination bytes remain unchanged.
- [ ] Valid non-example roots still load and sync; missing explicit roots remain errors; existing golden diff and build pass.
Verify: `node --test test/owner.test.mjs test/sync-owner.test.mjs && npm run golden:diff && npm run build` (pre: symlink resolution and explicit-root load accept Ada in deploy mode)
Skills: none
Status: todo
Red: pending — commit failing regression tests first; then fix without editing those tests.

## Handoff
Fixes stay on feat/forkable-owner-loader per the approved plan; one PR at the end. C1-T1 is P0 and uses the heavy executor at high effort; C1-T2/C1-T3 are contract fixes at the same seat and effort. No public claims or deployment authorized by this review.
