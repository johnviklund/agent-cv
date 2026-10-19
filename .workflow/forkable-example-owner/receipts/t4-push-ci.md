Command: workflow execute forkable-example-owner
Created: 2026-10-20
Base: 150b701
Inputs: .workflow/forkable-example-owner/plan.md @ e1a571b
Status: drafting

## Approval and pushes
The owner approved the exact T4 handoff with "1a, push both" on 2026-10-20.
Private main pushed from bab16db to ae5d65464cee010c794e361e7397706aa692e009, exit 0.
Its committed diff contains exactly data/cv.md, data/overview.md, data/projects.md, data/repositories.md and golden-exceptions.json. data/faq.md is absent and its existing working edit remains unstaged.
Private workflow and run inventories are empty; no private CI workflow exists.
Engine main initially pushed from f71f34e to 4fcdb59c4c34592bca8009bfe835384ac4411be6, exit 0.

## Initial CI failure and correction
Initial engine CI failed: https://github.com/johnviklund/agent-cv/actions/runs/39337828210.
Only one test failed: the site privacy test tried to read ignored engine data/experience.md after CI stopped bootstrapping those files. Local ignored files masked the wrong path.
Reproduced the same ENOENT in a clean clone under /tmp/forkable-example-owner-t4-clean.
Correction 150b701 makes that test read examples/owner/data, matching the owner it builds. All 58 assertions in site-rendering.test.mjs remain unchanged.
Clean-clone `AGENT_CV_OWNER_ROOT=examples/owner npm run build`: exit 0, 291 passed, 12 skipped, zero leak findings, ten static pages checked, Wrangler dry-run and 23-module Worker package verification passed. No ignored engine private files were supplied.
John's `npm run check`: exit 0, 300 passed, three skipped, ten static pages checked.
Local logs remain under /tmp/forkable-example-owner-t4-*; no private data is copied into this receipt.

## Pending
Automatic approval review rejected the combined checkpoint commit and push. Its stated reason: the original approval covered the earlier T4 push scope, not an additional post-failure change to protected main.
The fixture correction 150b701 is committed locally; this receipt and plan remain uncommitted. Neither the correction nor the pending records were pushed.
The owner then explicitly approved: "Push the CI fix and records (Recommended)". This approval covers correction 150b701, its verification receipt and plan checkpoints.
Push the approved fix and records, wait for CI on the pushed SHA, then mark T4 done only on success.
