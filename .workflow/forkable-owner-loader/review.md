Command: workflow review forkable-owner-loader
Created: 2026-10-18
Base: 17687d3
Inputs: plan.md @ a0ec9b9
Status: complete

## Coverage
- [x] T1 — 6/6 acceptance lines pass; unsafe CLI failure path C1-1 remains
- [x] T2 — 5/5 literal acceptance lines pass; broader B4/B6 defects C1-2/C1-3 remain
- [x] T3 — 3/3 receipt checks verified; golden diff empty, private faq.md remains modified
- [x] T4 — 6/6 acceptance lines pass; check and build exit 0
- [x] Outcome observed through npm run golden:diff and generated owner module; no UI change, no verify skill. B1–B3/B5/B7/B8 pass; B4/B6 have findings.
- [x] .workflow/ dependency scan clean; escape-hatch scan clean; out-of-scope surfaces unchanged.
Size: +358 code · +283 tests · ratio 0.79 · net +544 · over 1,000: none
Reachability: golden CLI → snapshot helpers; sync-owner/sync-public-data → owner/schema; knowledge → generated owner. Owner export is the approved U2 packaging bridge.
Verification: npm run check and npm run build exit 0 (219 pass, 1 skipped); npm run golden:diff exit 0. Existing sync tests retain all 6 assertions.
Mutation: invert deploy example equality in a detached temporary worktree; owner test fails as expected (4 pass, 1 fail).
Independence: cross-vendor; Opus 5.5 writer, GPT-6 Astra reviewer (T3 runtime record; current user-selected session differs from ROUTING.md).

## Cycle 1 findings
### P0 — C1-1: A missing snapshot path deletes the working directory
- Evidence: `scripts/golden.mjs:71` defaults a missing `--golden` value to `""`; `writeGolden` at line 49 recursively removes that resolved directory. Running `capture --golden` in a temporary directory exited 0 and deleted its sentinel file. In the normal checkout this targets the checkout itself.
- Remedy: reject missing/empty/unknown arguments before collecting or writing; prevent capture from deleting the engine, owner root or their ancestors.
- Disposition: fix now
- Resolved: —

### P1 — C1-2: Inherited property names bypass strict schema validation
- Evidence: B4; `scripts/owner.mjs:52` reads `schema.properties[key]` through the prototype. Adding `site.constructor`, `site.toString` or `site.__proto__` to valid JSON is accepted despite `additionalProperties: false`.
- Remedy: use own-property lookup, including schema-less dictionaries such as links and deploy.vars; test inherited names at strict and dictionary boundaries.
- Disposition: fix now
- Resolved: —

### P1 — C1-3: Example-owner refusal checks spelling instead of the directory
- Evidence: B6; `scripts/owner.mjs:22` accepts `deploy: true` with AGENT_CV_OWNER_ROOT set to a symlink to examples/owner. `loadOwner({root: examplesPath, deploy: true})` also skips the resolver at line 84.
- Remedy: enforce the deploy check at the loader boundary for explicit and resolved roots, compare canonical paths, and preserve rejection before copying.
- Disposition: fix now
- Resolved: —

## Pre-existing / environmental
MEMORY.md absent; exam Must name entries checked, no matching prior class. Model routing differs from the skill, recorded above. Approved feature-branch workflow retained instead of merging to main before fixes.

## Cycle 1 verdict
Do not ship: 1 P0, 2 P1, 0 P2, 0 P3. Execute patch tickets C1-T1–C1-T3, then re-review. Product code unchanged by review.
