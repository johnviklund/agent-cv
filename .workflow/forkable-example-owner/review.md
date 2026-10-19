Command: workflow review forkable-example-owner
Created: 2026-10-20
Base:    8971fcf
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

## Cycle 1 findings
### P1 — engine `data/` writer and reader left behind after sources moved to the owner root
- Evidence: T1 moved `sync:data` to read `<ownerRoot>/data/` (`scripts/sync-public-data.mjs:25`), but `scripts/sync-github-repositories.mjs:32` still writes engine `data/repositories.md`, and `package.json` `sync:repositories` then runs `sync:data`, which publishes the owner's old copy. Probe: fresh fetch written to engine `data/repositories.md` → after `syncPublicData`, `public/repositories.md` contains it: false. Same class: `scripts/build-cv-pdf.mjs:54` reads engine `data/cv.md` for the deploy PDF while the site reads the owner's, so the two drift after the next edit. Docs still send edits to engine `data/`: `AGENTS.md:38`, `README.md:84`, `.agents/skills/refresh-agent-cv-projects/SKILL.md:18,39`. Concrete failing input: `npm run sync:repositories` after an allowlist change ships nothing.
- Disposition: fix now
- Resolved: —

### P1 — leak scan's default folder list survives mutation
- Evidence: B3/B4 gate. Emptying the default list at `scripts/check-leaks.mjs:28` (`["build/site", "public", "src/data"]` → `[]`) leaves `test/check-leaks.test.mjs` green (1 pass) and the no-arg CLI prints "Leak scan: 0 findings", exit 0. The test always passes folders as arguments, so the path CI actually runs is unchecked.
- Disposition: fix now
- Resolved: —

### P3 — `yaml` devDependency for one 12-line test
- Evidence: `package.json` adds `yaml@2.9.1` only for `test/ci-workflow.test.mjs`. Recorded in Deviations; acceptable, noted.
- Disposition: defer (stays here)
- Resolved: —

## Pre-existing / environmental
- 12 tests skip without Chromium (same count in the T4 receipt's clean clone).
- Initial T4 push went out with CI red (4fcdb59); corrected at 150b701 before handoff. Second occurrence of memory `test-on-example-owner-bundle` → learnings.md.

## Cycle 1 verdict
Fix now: 2 P1 (C1-1, C1-2) · P3: 1 deferred · P0/P2: 0. The Ada build, footer and CI work as agreed; the repository-sync regression and the untested default scan folders must be fixed before wrap. Patch cycle 1 in patch_plan.md. No verify skill exists; recommend `verify.create` after this run.
