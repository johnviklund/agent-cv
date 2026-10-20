Command: workflow review forkable-cutover
Created: 2026-10-20
Base:    40dd85d
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

## Coverage
- [x] T1 — acceptance 3/3: private 4ec3ba4 pushed, ahead 0, `faq.md` ` M`; 3 docs `cmp`-equal to fafec6c; AGENTS.md:23-27 "When John asks", owner-root deploy and golden rules, no "canonical in the public" line
- [x] T2 — acceptance 5/5: tracked-tree.test passes; golden:diff on sibling exit 0, 19 accepted, nothing else
- [x] T3 — acceptance 3/3: `git grep -iE 'john|viklund' -- test` empty; GRACE keeps 3 hosts/custom domain; Ada check and sibling `npm test` 0 fail
- [x] T4 — acceptance 3/3 (same runs); assertion drops match receipts t2/t3/t4 under decision 2a and F4
- [x] T5 — acceptance 4/4: stale-clause grep rc=1; John only on README:5, README:54/USERGUIDE:16 slug; WebMCP section gone
- [x] T6 — acceptance 5/5 tested; 8 guard mutations, 2 survive (C1-1); clean-clone receipt t6 exit 0
- [x] T7 — `gh run view 39446308069` → success @ a7f2a86; follow-up run 39446522462 success @ 40dd85d
- [x] B1…B8 delivered · Outcome observed on `git grep` of the tree, `npm run check` (Ada), `golden:diff` (sibling) via manual run (no user surface changed; verify-agent-cv not needed) · out of scope untouched (deploy, setup.mjs, history) · Outcome "no trace of John" partly unmet beyond the name: C1-2
- [x] .workflow/ dependency check: 2 hits, both the B2-approved skip prefix (scripts/check-leaks.mjs:23, test/check-leaks.test.mjs:67); neither reads `.workflow/`
Size: +38 code · +287 tests · ratio 7.6 · net -438 code/tests (-3,065 incl. deleted docs/data) · over 1,000: test/worker.test.mjs (1,334, literal swaps only)
Reachability: test/tracked-tree.test.mjs → `npm test`; `scanTrackedFiles` → check-leaks CLI → `npm run check` · guards shown failing: `.workflow/`, WORKLOG, NUL, slug, LICENSE line, symlink, output gate; README and LICENSE line bounds survive (C1-1)
Escape hatches: none added
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI · reviewer Opus 5.5 / Anthropic)
Runs: Ada `npm run check` 320 pass / 3 skipped / 0 fail, Leak scan 0 · sibling `npm test` 321 / 2 / 0

## Cycle 1 findings
### P1 — C1-1 the credit-line exceptions are not pinned to their exact text
- Evidence: B2/T6 acceptance 3 ("LICENSE copyright line, README credit line"). In a throwaway worktree, widening scripts/check-leaks.mjs:29 to `/^Maintained by .*$/m` or :28 to `/^Copyright .*$/m` keeps test/check-leaks.test.mjs green. The leak cases at test/check-leaks.test.mjs:81-83 only add the name on a *separate* line, so a credit line carrying extra owner text (`Maintained by … deployment. Viklund`) is never tried. Repeat of memory validate-both-schema-bounds (exact-match guard bound untested)
- Disposition: fix now
- Resolved: —

### P2 — C1-2 the owner's real employer and role remain in test fixtures
- Evidence: Outcome "no trace of John outside an explicit allowlist". The name grep is clean, but John's CV entries survive: test/comparison-evidence.test.mjs:70-88 (`experience.volvo-americas-crm-transformation`, "Volvo Cars › Americas CRM transformation", matching private cv.md:12,26) · test/cv-pdf.test.mjs:46 (`Axient`, private cv.md:58) · `Volvo` used as an owner marker in test/og-image.test.mjs:34 and test/site-rendering.test.mjs:45,135. Pre-existing lines, missed by T3/T4 because the B2/B4 detector only matches the name. Small: about 10 test lines, no contract change
- Disposition: fix now
- Resolved: —

### P3 — C1-3 output scan now skips NUL-byte files
- Evidence: scripts/check-leaks.mjs:42 adds the binary skip to `scanForLeaks`, which F8 asked only for the tracked scan; built PNG/PDF text chunks are no longer read. Ada-only scan, low risk
- Disposition: defer (stays in review.md)
- Resolved: —

### P3 — C1-4 tracked scan uses the working directory, not the engine root
- Evidence: scripts/check-leaks.mjs:15 `dir = process.cwd()`; run from `scripts/` it scans only that subtree and flags `check-leaks.mjs` (allowlist keys are root-relative). A tracked file deleted from the work tree crashes on `lstat` with a stack, not a "Leak scan" line. `npm run check` always runs from the root
- Disposition: defer (stays in review.md)
- Resolved: —

## Pre-existing / environmental
- Two worktrees from other runs remain: /tmp/agent-cv-maintenance-c1 (3d2a653), /tmp/agent-cv-review-cycle2 (4872ec6)
- After the sibling `golden:diff`, the ignored engine `data/` and `public/` hold John's synced files until the next `sync:data`

## Cycle 1 verdict
Fix two, then wrap. P0 0 · P1 1 · P2 1 · P3 2. Patch cycle 1 fixes C1-1 and C1-2 (test-only, logic lane); C1-3 and C1-4 stay deferred here.
