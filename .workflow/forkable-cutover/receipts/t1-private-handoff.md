Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    87fedf0
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

T1 scope approved with 1a on 2026-10-20. Runner: agent after approval. Risk: cheap. Run from /home/john/agent-cv.
Baseline: npm run check exits 0 outside sandbox, 322 pass, 3 skipped; static checks pass for 10 pages. Logs: /tmp/forkable-cutover-baseline-unsandboxed.log.
Golden: AGENT_CV_OWNER_ROOT=../agent-cv-private npm run golden:diff exits 0 with 19 accepted file differences, none unlisted. Log: /tmp/forkable-cutover-baseline-golden.log. Owner approved T2 count correction with 2a.
Before writing, confirm private HEAD ae5d654, main...origin/main, only ` M data/faq.md`, and the draft digest below.
Draft: /tmp/forkable-cutover-t1-AGENTS.md; sha256 b397ae32e3ad0fce99d22faf4cf0e4dedab1f144dadfc9c162f8485260a146f6.
It makes this owner bundle canonical, adds "When John asks" rules, requires golden:diff before engine changes, and selects AGENT_CV_OWNER_ROOT for deployment.
Create ../agent-cv-private/docs/plans, then copy these three engine documents byte-for-byte into matching private paths: docs/webmcp-challenge-submission.md, docs/plans/2026-08-29-1737-feat-webmcp-role-comparison-plan.md, docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md.
Copy the draft to ../agent-cv-private/AGENTS.md. Review `git -C ../agent-cv-private diff -- AGENTS.md` and compare all three documents with `cmp`.
Stage only `AGENTS.md` and those three named docs with `git -C ../agent-cv-private add -- <four named paths>`.
Confirm the staged path list contains exactly those four files. Commit with `git -C ../agent-cv-private commit -m 'docs: move owner plans and operator rules into the owner bundle'`.
Push with `git -C ../agent-cv-private push origin main`. No deploy or engine deletion belongs to T1.
Preserve data/faq.md byte-for-byte; sha256 9fe9708f6326ac4bdabb8efc5e291942fcf433b66935483fd462f55166fb5aec. Keep it unstaged.
Write receipts/t1-private-repo.txt with the private commit SHA, exactly four committed paths, three byte comparisons, FAQ hash/status, and main...origin/main with no ahead count.
Resume by checking each T1 acceptance line against that receipt, committing the execution state, then starting T2.
