Command: workflow execute forkable-live-verify
Created: 2026-10-20
Base: 4122e58
Inputs: plan.md @ 6614dd1
Status: complete

## T3 result
The deploy guard scans owner.json, site.json, data/, assets/, repositories.json and comparison-evidence.json. It ignores other root entries and still walks nested data and assets. Missing optional inputs need no special handling because the existing directory walk visits only present entries.

Reuse search found only the existing guard walk in scripts/sync-owner.mjs. The fix adds one root-entry filter to that walk. No helper was added. USERGUIDE.md step 4 lists the deploy inputs.

## Proof
- Before edits, npm run build exited 0 outside the sandbox: 321 tests passed, 2 skipped; static checks and Worker packaging passed. The sandbox attempt had file-level test failures; the unrestricted baseline was clean.
- Red: the new docs-only case failed before the fix. Reverting the filter outside the sandbox reproduced the exact failure, naming README.md, docs/plans/x.md and golden/x.html. Mutation command exited 1; the filter was restored.
- Green: node --test --test-reporter=tap test/sync-owner.test.mjs exited 0: 15 passed, 0 failed. The four new cases cover docs-only success and rejection of data/notes/deep.md, repositories.json and comparison-evidence.json. Successful sync returns fixture-owner and copies all six private files. Each rejection names its input path and preserves all six destination files.
- Existing text and image rejection cases passed unchanged. No existing assertion was changed or removed.
- AGENT_CV_OWNER_ROOT=../agent-cv-private npm run sync:owner -- --deploy exited 0 and copied exactly 6 ignored private files for john-viklund. It performed no deployment.
- grep -c "owner.json, site.json, data/" USERGUIDE.md printed 1, exit 0.
- Final npm run build exited 0 outside the sandbox: 326 tests passed, 2 skipped, 0 failed. Static checks passed for 10 pages; Worker dry-run and package checks passed.
- A clean local clone with the three changed files applied, no ignored engine data, and AGENT_CV_OWNER_ROOT=./examples/owner passed all 15 sync tests, exit 0.
- git diff --check exited 0. The code diff adds one line and 24 test lines. Existing test assertions are unchanged.

Raw logs stay outside Git: /tmp/forkable-live-verify-t3-{baseline-full,red,green,mutation,build,clean-example}.log. The disposable clean checkout is /tmp/forkable-live-verify-t3-clean.

## Next operator step
The private owner tree is clean at 15ad8df9c57ed51629b5dec15b71bcc52f7fcac6. T2 must check that again immediately before deployment and record the commit. No deployment, paid request or rollback ran in this session. Re-issue the T2 handoff for fresh exact-scope approval.
