Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    a652048
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

Reuse: scanForLeaks, listFiles and resolveOwnerRoot; execFileSync follows existing script conventions. scanTrackedFiles is used by the CLI; no runtime fetching or dependencies added.
Red: no-argument CLI test fails before implementation because outside-Git invocation exits 0. /tmp/forkable-cutover-t6-red.log.
Green: exact Verify exits 0; three tests pass, tracked scan reports zero findings while sibling output scan is skipped. /tmp/forkable-cutover-t6-verify.log.
The CLI fixture covers every approved credit exception, an upstream bare slug, binary data, untracked data, tracked directory symlinks, outside-Git failure, tracked notes leak, and extra leaks below both allowed credit lines. Existing output-folder variants remain covered.
The initial green run exposed EISDIR on the tracked .claude skill symlink. The scanner now reads stored symlink text, which matches what Git tracks, and the fixture includes a directory link.
Mutation: disable the tracked-file findings condition; the tracked notes leak case exits 1. Restored before final verification. /tmp/forkable-cutover-t6-mutation.log.
Ada npm run check: exit 0, 320 pass / 3 skipped, ten static pages pass. /tmp/forkable-cutover-t6-check.log.
Sibling golden:diff: exit 0, the same 19 accepted differences, no new difference. /tmp/forkable-cutover-t6-golden.log.
Clean clone of a652048 without owner env or sibling: npm ci and npm run check exit 0; receipts/t6-clean-clone.txt.
Assertion sites: check-leaks 9 -> 19; nine added, one original skip-message expectation changes to output-scan-skipped because tracked scanning now always runs. Existing output assertions preserved. No production UI changed.
