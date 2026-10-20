Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    5bfcf15
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

## Cycle 1 findings
### P1 — engine `data/` writer and reader left behind after sources moved to the owner root
- Evidence: T1 moved `sync:data` to read `<ownerRoot>/data/` (`scripts/sync-public-data.mjs:25`), but `scripts/sync-github-repositories.mjs:32` still writes engine `data/repositories.md`, and `package.json` `sync:repositories` then runs `sync:data`, which publishes the owner's old copy. Probe: fresh fetch written to engine `data/repositories.md` → after `syncPublicData`, `public/repositories.md` contains it: false. Same class: `scripts/build-cv-pdf.mjs:54` reads engine `data/cv.md` for the deploy PDF while the site reads the owner's, so the two drift after the next edit. Docs still send edits to engine `data/`: `AGENTS.md:38`, `README.md:84`, `.agents/skills/refresh-agent-cv-projects/SKILL.md:18,39`. Concrete failing input: `npm run sync:repositories` after an allowlist change ships nothing.
- Disposition: fix now — reopened cycle 2 at P1; past the two-cycle bound, awaiting human: a) cycle 3 · b) defer to TODO.md
- Resolved: — (cycle 2: fixed at 882b97c for the repository writer, the PDF reader and the three named docs; the same class still has open sites, see C2-1)

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

## Cycle 2 findings
### P1 — C2-1 (reopens C1-1): two more tools still read the engine's `data/` copies
- Evidence: same class as C1-1. (1) `npm run build:evidence` → `writeComparisonEvidence()` with no args reads the owner's manifest but the engine's sources (`scripts/build-comparison-evidence.mjs:84,297`). Probe in a clean worktree: `AGENT_CV_OWNER_ROOT=examples/owner node scripts/build-comparison-evidence.mjs` → exit 1, "overview.focus: missing heading Focus in data/overview.md". On John's root it reads stale engine copies without error. (2) `npm run projects:review` reads `canonicalFiles` from the engine root (`scripts/review-project-sources.mjs:57`), while the refresh skill now says edits go to `<owner root>/data/`; after the next owner edit the review packet shows the old text. (3) Doc: `.agents/skills/review-agent-cv-conversations/SKILL.md:15` still says "currently engine `data/`" (writer noted it, deferred).
- Breaks no B# and not the Outcome: `sync:data` and `npm run check` pass `sourceRoot` correctly (`scripts/sync-public-data.mjs:42`).
- Remedy: default `sourceRoot` to the owner root in `writeComparisonEvidence`; read canonical files from `ownerRoot` in `runProjectReview`; fix the skill line and restore its `maintenance-docs` assertion.
- Disposition: fix now — one decision with C1-1 (cycle bound reached)
- Resolved: —

### P3 — default-folders test depends on the working directory
- Evidence: `test/check-leaks.test.mjs:11` resolves the expected folders from `process.cwd()`, not the engine root; run from another folder it goes red with nothing wrong. Harmless under `npm test`.
- Disposition: defer (stays here)
- Resolved: —

### P3 — the PDF's source path has no runnable test here
- Evidence: reverting `scripts/build-cv-pdf.mjs:54` to engine `data/` leaves the suite green, because `test/cv-pdf.test.mjs` skips without Chromium. The plan accepted a grep for this line; noted only.
- Disposition: defer (stays here)
- Resolved: —

## Cycle 2 verdict
C1-2 resolved. C1-1 fixed at its named sites but reopened as C2-1: `build:evidence` and `projects:review` still read engine `data/`. Open: 1 P1 (C1-1/C2-1), past the two-cycle bound → human decision. P3: 2 new, deferred. P0/P2: 0. Recommend b) defer to TODO.md: it breaks no B# and not the Outcome, and U8 deletes engine `data/`, which ends this class of bug.
