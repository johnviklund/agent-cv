Command: workflow execute forkable-cutover
Created: 2026-10-20
Base: 648a24d
Inputs: .workflow/forkable-cutover/patch_plan.md @ 40dd85d
Status: complete

C1-T2 replaces real employer and role literals in four test files. Nested evidence now uses Example Motors, Regional platform rollout, and fictional rollout text. The PDF fixture uses Sample Co.
Reuse search found only local literal fixtures and the existing nested-selector test; no helper needed.

- Before edits, the four-file Verify runs 30 pass / 1 skipped, but the forbidden-literal grep makes the composite command exit 1 with eight matching lines.
- After edits, Verify exits 0: 30 pass / 1 skipped / 0 fail; forbidden-literal grep has no matches.
- Ada `npm run check`: 320 pass / 3 skipped / 0 fail; leak scan 0; static checks pass for 10 pages.
- Sibling `sync:data` and `build:site`, then `npm test`: 321 pass / 2 skipped / 0 fail.
- Read-only comparison with the sibling CV's employer headings confirms all six names are absent from tracked files outside `.workflow/` and `WORKLOG.md`. Individual `git grep -i` calls exit 1 for Volvo, Tajitsu, Axient, Saltside, StreamServe and OpenText.
- Content mutation in the disposable worktree restores the real employer in the PDF fixture: the forbidden-literal grep finds that file, making the negated acceptance check exit 1. Restored afterward; nothing committed there.
- Assertion sites before/after: comparison-evidence 21/21, cv-pdf 31/31, og-image 12/12, site-rendering 53/53. No assertions added or removed. Two comparison expectations track the renamed fixture ID and text; three negative match patterns use the fictional employer marker.
- Raw logs: `/tmp/forkable-cutover-c1-t2-{before,verify,ada-check,sibling-test,mutation}.log`.
- No screen changes. Assertion literal updates are recorded under patch-plan Deviations.
