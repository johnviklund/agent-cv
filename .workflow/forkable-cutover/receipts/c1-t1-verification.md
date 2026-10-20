Command: workflow execute forkable-cutover
Created: 2026-10-20
Base: 009ab1f
Inputs: .workflow/forkable-cutover/patch_plan.md @ 40dd85d
Status: complete

C1-T1 adds two same-line surname cases to the existing no-argument CLI test.
Reuse search found its existing parametrized cases and assertion pair; no helper needed.

- `node --test test/check-leaks.test.mjs`: 3 pass, 0 fail.
- Ada `npm run check`: 320 pass, 3 skipped, 0 fail; leak scan 0; static checks pass for 10 pages.
- Disposable worktree `/tmp/agent-cv-cutover-c1-t1` starts at 3fdf25f.
- Independently widening the LICENSE guard to `/^Copyright .*$/m` or the README guard to `/^Maintained by .*$/m` passes the old no-argument test, exit 0 each.
- The new test fails each mutant, exit 1 each, with `0 !== 1` at the required leak-status assertion. Both mutations restored; nothing committed in the worktree.
- Existing assertions: 17 sites before and after; none changed or removed. Two new inputs use the existing exit-status and stderr-path assertions.
- Raw logs: `/tmp/forkable-cutover-c1-t1-{old,new}-{license,readme}.log`, `/tmp/forkable-cutover-c1-t1-verify.log`, `/tmp/forkable-cutover-c1-t1-check.log`.
- No screen changes. No deviations.
