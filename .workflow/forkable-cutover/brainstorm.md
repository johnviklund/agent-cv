Command: workflow brainstorm forkable-cutover
Created: 2026-10-20
Base:    2df6469
Inputs:  none
Status:  complete

## Problem
The engine repo still tracks John's public sources, docs, operator rules and about 230 John-named test lines. A fork inherits them, and the tree-wide leak check (deferred from forkable-example-owner) does not exist yet.

## Outcome
A fresh clone of the engine at main has no trace of John outside an explicit allowlist, builds and checks as Ada Example, and John's site still builds byte-identically from `agent-cv-private`. Surface: `git ls-files`, `npm run check`, `npm run golden:diff`. Deploy and live checks are the next run.

## Behaviours
- B1 — `git ls-files` after the run → no engine `data/*.md`, no tracked `public/` copies, no `examples/private-data/`, no WebMCP submission/plan or forkable plan under `docs/`; `bootstrap:data` script gone
- B2 — `node scripts/check-leaks.mjs` with no args → scans tracked files plus built output and fails on john/viklund/johnviklund outside the allowlist (LICENSE line, README maintainer credit, `.workflow/`, `WORKLOG.md`)
- B3 — a tracked fixture containing "John" outside the allowlist → the leak check exits 1 and names the file (test)
- B4 — `npm test` and `npm run check` with no owner env and no sibling → pass on Ada with zero John in `test/`
- B5 — `AGENT_CV_OWNER_ROOT=../agent-cv-private npm run golden:diff` after the deletions → empty apart from the accepted exceptions
- B6 — `agent-cv-private` → holds the moved docs and an `AGENTS.md` with "When John asks…" rules, committed and pushed
- B7 — engine `AGENTS.md`, `README.md`, `USERGUIDE.md`, both repo-local skills, `design.md`, `memory/` → say "the owner", no "until U8" or "currently engine data/" clauses
- B8 — `git archive HEAD` into a temp dir, `npm ci`, `npm run check` → passes as Ada

## Decisions
- D1 — two runs: this local cutover, then forkable-live-verify for deploy and live checks — the live step needs the merge and the human (product call)
- D2 — precondition: a prior run builds `npm run setup`, README and USERGUIDE; this run is blocked until it ships, because deleting `bootstrap:data` removes the only fork on-ramp (code: package.json)
- D3 — tests rewritten to Ada; no `test/` allowlist — the plan's rule (product call)
- D4 — allowlist `.workflow/` and `WORKLOG.md` as history; genericise `memory/` and `design.md` — doctrine must read right for a fork (product call)
- D5 — `resolveOwnerRoot` unchanged: env, then sibling, then `examples/owner` (code: scripts/owner.mjs)
- D6 — both repo-local skills stay in the engine; only their "currently engine data/" clause goes (code: .agents/skills)

## Test seams
- `scanForLeaks` and the check-leaks CLI — observes B2, B3 (existing, extend)
- `npm test` / `npm run check` — observes B4, B7 (existing)
- `scripts/golden.mjs` diff — observes B5 (existing)
- `git ls-files` assertion test — observes B1 (new)

## Out of scope
- Deploy, live site, PDF, chat, admin export checks — forkable-live-verify
- `npm run setup`, README "Create your own", USERGUIDE rewrite — precondition run
- Git history rewrite, repo rename — plan open question: don't rewrite
- `.gitignore` edit and `.agents/skills/verify-agent-cv/` — an unfinished verify.create; once it lands it must pass the tree-wide leak check, so plan re-reads git status

Docs read: none in scope (PRODUCT.md, DESIGN.md absent; design.md untouched until the run)
