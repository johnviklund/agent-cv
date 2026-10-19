Command: workflow execute forkable-maintenance-tooling
Created: 2026-10-19
Base: 96cd840
Inputs: .workflow/forkable-maintenance-tooling/plan.md @ e32329f
Status: complete

T1 uses loadOwner and resolveOwnerRoot. Search found the existing helpers and two render callers; no new helper.

- Red: owner manifest lookup and Ada user-agent checks fail against the old code. Reverting packet identity separately also fails.
- Green: `node --test test/project-review.test.mjs test/owner-manifests.test.mjs`: 19 passed.
- Full check: `npm run check`: 291 passed, 3 skipped, 0 failed; static checks pass for 10 pages.
- Mutations: restoring John's packet name, engine-side manifest default or hard-coded sync user agent each makes its targeted test fail. Originals restored.
- Ada's manifest and relative local folder live in a separate owner directory. The packet stays in the engine review directory and canonical Markdown stays unchanged.
- `git check-ignore --quiet` exits 0 for both project-reviews/x.md and conversation-reviews/inbox/x.md.
- Existing assertions preserved: project-review 36 to 40; owner-manifests 13 to 14. No assertion removed or changed.
- Sandbox-only baseline failures: bootstrap-example-data, golden and setup-admin could not capture subprocess stdout/stderr. Outside the sandbox all pass; no baseline code defect.
- Temporary logs: /tmp/forkable-t1-red.log, /tmp/forkable-t1-check.log and /tmp/forkable-t1-mutation-*.log.
- No rendered screen changes; review packet wording is covered by output assertions.
