Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    83bd48d
Inputs:  .workflow/forkable-example-owner/plan.md @ e1a571b
Status:  complete

## Coverage
- [x] T1 — acceptance 5/5 tested and passing (sync-public-data.test 3 tests; golden:diff exit 0 on John's root)
- [x] T2 — acceptance 3/3 (site-rendering footer test, 10 pages × 2 owners; 1 UPSTREAM_URL hit; golden 10 footer exceptions); screens/ before/after for all 10 pages
- [x] T3 — acceptance 5/5 passing, but the CLI's default folder list is untested (C1-2)
- [x] T4 — receipts/t4-push-ci.md; CI success on 83fbf99 and 8971fcf (gh run list)
- [x] B1…B8 delivered · Outcome observed via manual, no verify skill: clean worktree `AGENT_CV_OWNER_ROOT=examples/owner npm run check` exit 0, "Leak scan: 0 findings", 291 pass / 12 skip / 0 fail · out of scope untouched (setup, README, USERGUIDE, bootstrap:data, examples/private-data)
- [x] .workflow/ dependency check — 0 hits
Size: +108 code · +138 tests · ratio 1.28 · net +205 · over 1,000: none
Reachability: check-leaks.mjs → `npm run check` · `listFiles` export → check-leaks · `syncPublicData` → its CLI · `credit`/`UPSTREAM_URL` → 10 pages · guards shown failing: skip guard (inverted → test red), admin footer credit (removed → test red), leak default folders (emptied → stays green, C1-2)
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI · reviewer Opus 5.5 / Anthropic)
Escape hatches: none added

## Resolved
| Finding | Sev | Title | Disposition | Resolved |
|---|---|---|---|---|
| C1-2 | P1 | leak scan's default folder list survives mutation | fix now | @ b16b8bd (cycle 2) |
| C1-3 | P3 | `yaml` devDependency for one test | defer (stays here) | settled cycle 2 |
| C1-1 / C2-1 | P1 | engine `data/` writers and readers left behind after the move | fix now | @ 882b97c (cycle 2), @ dc7a942 (cycle 3) |
| C2-2 | P3 | default-folders test depends on the working directory | defer (stays here) | settled cycle 3 |
| C2-3 | P3 | the PDF's source path has no runnable test without Chromium | defer (stays here) | settled cycle 3 |

## Pre-existing / environmental
- 12 tests skip without Chromium (same count in the T4 receipt's clean clone).
- Initial T4 push went out with CI red (4fcdb59); corrected at 150b701 before handoff. Second occurrence of memory `test-on-example-owner-bundle` → learnings.md.

## Cycle 1 verdict
Fix now: 2 P1 (C1-1, C1-2) · P3: 1 deferred · P0/P2: 0. The Ada build, footer and CI work as agreed; the repository-sync regression and the untested default scan folders must be fixed before wrap. Patch cycle 1 in patch_plan.md. No verify skill exists; recommend `verify.create` after this run.

## Cycle 2 coverage
- [x] C1-T1 — acceptance 4/4: round-trip test passes; mutation (writer back to `engineRoot`) → owner-manifests 5 pass / 2 fail; grep 0 hits; docs updated; red b518c28 + 2f96f27, `git diff 2f96f27 882b97c -- test` empty
- [x] C1-T2 — acceptance 2/2: mutation (`LEAK_SCAN_DIRS = []`) → check-leaks 1 pass / 1 fail; `git diff 7f7d85d b16b8bd -- test` empty
- [x] Class sweep of C1-1 (readers/writers of engine `data/` public sources): 2 open code sites + 1 doc site (C2-1)
- [x] Clean worktree at 5bfcf15: `AGENT_CV_OWNER_ROOT=examples/owner npm run check` exit 0, Leak scan 0 findings, 293 pass / 12 skip / 0 fail
- [x] Escape hatches in fix diff: 0 · `.workflow/` references outside: 0
Size (plan Base e1a571b..HEAD): +112 code · +160 tests · ratio 1.43 · net +225 · over 1,000: none
Reachability: `LEAK_SCAN_DIRS` → check-leaks `main()` (`npm run check`) · guards shown failing: C1-T1 writer, C1-T2 defaults
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI · reviewer Opus 5.5 / Anthropic)

## Cycle 2 verdict
C1-2 resolved. C1-1 fixed at its named sites but reopened as C2-1: `build:evidence` and `projects:review` still read engine `data/`. Open: 1 P1 (C1-1/C2-1), past the two-cycle bound → human decision. P3: 2 new, deferred. P0/P2: 0. Recommend b) defer to TODO.md: it breaks no B# and not the Outcome, and U8 deletes engine `data/`, which ends this class of bug.
Cycle 3 approved by human: 2026-10-20 (chat: "run a third fix round please"). Patch cycle 2 in patch_plan.md (C2-T1).

## Cycle 3 coverage
- [x] C2-T1 — acceptance 5/5: evidence default and packet tests pass; clean worktree `AGENT_CV_OWNER_ROOT=examples/owner node scripts/build-comparison-evidence.mjs` exit 0; both skills asserted; red 3399f99, `git diff 3399f99 dc7a942 -- test` empty
- [x] Mutations at 83bd48d: evidence default → engine root 28 pass / 1 fail · packet read → engine root 27 / 2 · skill line reverted 28 / 1 · `isWithin` guard removed 29 / 0 (C3-1)
- [x] Class sweep (readers/writers of the four public sources under the engine root): 0 open. Remaining engine `data/` writes are `bootstrap:data` (out of scope) and `sync:owner`'s private imports (intended)
- [x] Clean worktree at 83bd48d: `AGENT_CV_OWNER_ROOT=examples/owner npm run check` exit 0, Leak scan 0 findings, 294 pass / 12 skip / 0 fail; CI success on 62a53d1 and 83bd48d
- [x] Escape hatches in fix diff: 0 · `.workflow/` references outside: 0
Size (plan Base e1a571b..HEAD): +116 code · +186 tests · ratio 1.60 · net +248 · over 1,000: none
Reachability: none new · guards shown failing: C2-T1 evidence default, packet read
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI · reviewer Opus 5.5 / Anthropic)

## Cycle 3 findings
### P3 — C3-1: the packet's owner-root containment guard cannot fire
- Evidence: `scripts/review-project-sources.mjs:58`. The manifest validator only accepts the four fixed `data/*.md` names (`scripts/project-review.mjs:133`), so an escaping path is rejected before the guard runs; deleting the guard leaves every test green. The guard predates this run; the new test's `/canonical file path/` matches the validator's message. Harmless defence in depth.
- Disposition: defer (stays here)
- Resolved: —

## Cycle 3 verdict
C1-1/C2-1 resolved @ dc7a942: `build:evidence` and `projects:review` now read the owner's `data/`, and no other tool reads the engine copies of the four public sources. Open fix-now: 0. P0/P1/P2: 0 · P3: 1 new, deferred. Ship as-is → wrap. No verify skill exists; recommend `verify.create` after this run.
