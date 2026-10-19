Command: workflow execute forkable-maintenance-tooling
Created: 2026-10-19
Base: 3d2a653
Inputs: .workflow/forkable-maintenance-tooling/patch_plan.md @ 8a30e36
Status: drafting

C1-T1 fixes the existing refusal test in commit 539d45c. Search found the imported JOHN fixture; no helper or production change needed.

- Baseline outside the sandbox: `npm run check` passes, 294 passed, 3 skipped, 0 failed; static checks pass for 10 pages.
- Red in detached worktree `/tmp/agent-cv-maintenance-c1`: example-owner bundle gives 20 passed, 2 skipped, 1 failed. The refusal assertion reports `Missing expected exception`.
- Preparation: `AGENT_CV_OWNER_ROOT=examples/owner npm run bootstrap:data`; copy the six safe `examples/private-data/*.md` files into the throwaway owner's `examples/owner/data/`; run `sync:owner` and `sync:data` with the same owner variable. The copy is needed because bootstrap writes engine data, while sync:owner reads owner data. No primary private data touched.
- Green on that example bundle: `node --test test/comparison-core.test.mjs` gives 21 passed, 2 skipped, 0 failed.
- Primary `npm run check` after the fix: 294 passed, 3 skipped, 0 failed; static checks pass for 10 pages.
- Mutation: remove `undefined, JOHN` in the throwaway worktree; the same test fails with `Missing expected exception`. Restore the fixed file afterward.
- Existing assertions: 72 before and after in the file, 2 before and after in the refusal test. The loop still checks all 10 prohibited conclusions. Its owner now matches its John examples.
- `src/comparison-core.js` has no diff and zero case-insensitive `john` matches. No new runtime code or screen changes.
- Sandbox-only baseline failures affect subprocess output in bootstrap-example-data, golden, project-review and setup-admin. The full check outside the sandbox passes.
- Temporary logs: `/tmp/forkable-maintenance-{baseline-unsandboxed,example-red,example-green,mutation,check}.log`.
- Pushed-commit CI: pending.
- Publication: automatic approval review rejected the combined receipt commit and `git push origin main` before execution. Its reason is that a default-branch push is a high-impact mutation without explicit authorization for these exact commits. No push occurred. Await approval to publish the fix and execution record, then verify CI before marking C1-T1 done.
