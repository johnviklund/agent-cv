Command: workflow review forkable-maintenance-tooling
Created: 2026-10-19
Base:    55f333a
Inputs:  .workflow/forkable-maintenance-tooling/plan.md @ e32329f
Status:  done

## Coverage
- [x] T1 — acceptance 4/4 tested and passing; mutations (UA, manifest default, folder base, packet name) each go red
- [x] T2 — acceptance 4/4 pass on John's bundle; B4 line fails on the example-owner bundle (C1-1)
- [x] T3 — acceptance 4/4 tested and passing (static test/maintenance-docs.test.mjs)
- [x] C1-T1 — acceptance 4/4: example-bundle refusal test green (receipt), JOHN passed for every John string, src/comparison-core.js untouched, CI 39275011156 and 39275611970 success
- [x] B1–B7 delivered (B4 refusal test green on CI's example-owner bundle) · Outcome observed on packet/brief/UA output via tests, no verify skill (no live surface; deploy is U8) · out of scope untouched (README.md, U7, U8)
- [x] .workflow/ dependency check — 0 hits
Size: +35 code · +90 tests · ratio 2.57 · net +81 (cycle 2 fix: +1/−1 test only) · over 1,000: none
Reachability: test/maintenance-docs.test.mjs → `node --test` · no new modules · guards shown failing: B3 UA, B5 manifest path, local-folder base, admin data-owner attrs, packet and brief owner name
Escape hatches: none added
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI; reviewer Opus 5.5 / Anthropic)

## Resolved
| Finding | Sev | Title | Disposition | Resolved |
|---|---|---|---|---|
| C1-1 | P1 | John refusal test fails for every non-John owner; CI red on main | fix now | @ 539d45c (cycle 2) |
| C1-2 | P2 | Conversation review loads the owner after advancing the cursor | defer → TODO.md | settled (cycle 2) |
| C1-3 | P3 | admin.js `owner: readOwner()` untested · skills cite owner.mjs with no CLI · project-review check-ignore uses process cwd | defer (stays in review.md) | settled (cycle 2) |

## Cycle 2 findings
- C1-1 class re-checked: every John-named string in test/comparison-core.test.mjs (194, 277, 357–362, 387–393) passes on the example bundle — CI runs the suite on it and reports 0 failed; the `ordinary` case names no owner. No other test canonicalizes a John string with the default owner.
- Fix touched only test/comparison-core.test.mjs:401; src/comparison-core.js unchanged (`grep -ci john` → 0); assertions 72 → 72.
- Mutation: dropping `JOHN` reproduces the cycle-1 failure on the example bundle (CI 39264031358, 39273500659 red; executor's worktree mutation red).
- Local `npm run check` at 55f333a: 294 pass, 0 fail, 3 skipped. .workflow/ grep: 0 hits. Escape hatches added: 0.
- No new findings.

## Pre-existing / environmental
- agent-cv-private has an uncommitted `data/faq.md` edit that predates this run (t2 receipt); untouched.
- The writer pushed T1–T3 to main while CI was red: receipts' "full check" ran only on John's bundle.

## Cycle 1 verdict
Patch needed: 1 P1 (C1-1) fix now · 1 P2 deferred to TODO.md · 3 P3 kept here. Everything else meets its acceptance lines and every new guard was shown failing once.

## Cycle 2 verdict
Ship as-is. C1-1 fixed @ 539d45c and CI green on main; C1-2 goes to TODO.md at wrap; C1-3 stays here. 0 P0 · 0 P1 · 0 P2 · 0 P3 new.
