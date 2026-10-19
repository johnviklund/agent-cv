Command: workflow wrap forkable-maintenance-tooling
Created: 2026-10-19
Base:    55f333a
Inputs:  .workflow/forkable-maintenance-tooling/review.md @ 55f333a
Status:  done

## Outcome
Project review, repository sync, the conversation packet, the admin brief, the GitHub sync user agent and the score-refusal guards now use the selected owner. `AGENTS.md` and both repo-local skills describe the two-repo flow in owner-neutral words. Ada's output carries no "John" or "Viklund"; John's published bytes are unchanged (golden: 0 unlisted exceptions).

## What shipped
- T1 project review and repository sync use the owner @ 7e1febe
- T2 conversation packet, admin brief and refusal guards @ 5d296b4 (golden exceptions in agent-cv-private @ bab16db)
- T3 AGENTS.md and both skills owner-neutral and two-repo @ 10bff27
- C1-T1 John refusal test bound to its owner fixture @ 539d45c

## Review
2 cycles, ship as-is @ 7024e58. Cycle 1 found one P1 (C1-1: test red on CI's example-owner bundle), fixed in cycle 2. Independence: cross-vendor (GPT-6.1 Sol wrote, Opus 5.5 reviewed).

## Deferred
- C1-2 (P2): conversation review loads the owner after advancing the cursor → TODO.md `## Review deferrals` (TODO.md is gitignored here)
- C1-3 (P3): admin.js `owner: readOwner()` untested, skills cite owner.mjs with no CLI, project-review check-ignore uses process cwd → stay in review.md
- U8 must drop the "currently engine `data/`" clause from both skills when sources move.

## Receipts
`receipts/`: t1, t2, t3, c1-t1 verification. Learnings: 1 routed to `memory/test-on-example-owner-bundle.md`, 1 eval case deposited in j-skills-evals.

Retired: none — nothing in the product tree became obsolete; the change edited the owner-specific code in place.
