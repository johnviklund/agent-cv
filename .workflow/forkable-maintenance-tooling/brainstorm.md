Command: workflow brainstorm forkable-maintenance-tooling
Created: 2026-10-19
Base:    6375073
Inputs:  none
Status:  done

## Problem
Maintenance tooling and both repo-local skills assume John owns the repo and that content lives in it. Content now lives in the owner repo, so "update the site" spans two repos and a fork's owner must never see "John".

## Outcome
Review scripts, the admin conversation-review brief, the GitHub sync user agent, the score-refusal guards, `AGENTS.md` and both skills use the selected owner's name and the two-repo flow (plan U6). Ada's output has no "John"/"Viklund"; John's published bytes are unchanged (golden diff empty).

## Behaviours
- B1 — project review for owner Ada → packet text says "Ada", never "John"
- B2 — conversation-review brief (script) for Ada → says "Ada"; same for `site/assets/conversation-review.js` brief
- B3 — repository sync → user agent is `<owner slug>-agent-cv-repository-sync`
- B4 — `comparison-core` refusal guards for owner short name X → "X scores 85%" is refused; John still refused (golden)
- B5 — `<owner root>/project-sources.json` exists → project review reads it; missing → error names that path
- B6 — a review run writes packets, briefs and cursor → files land under the engine checkout and `git check-ignore` confirms each is ignored
- B7 — static grep of `AGENTS.md` and `.agents/skills/*/SKILL.md` → no "John"/"Viklund", and skills name: edit owner repo, commit+push its main, engine PR only for engine files, deploy with `AGENT_CV_OWNER_ROOT`

## Decisions
- D1 — manifest moves to owner root (committed); packets/briefs/cursor stay ignored in engine — packets hold visitor transcripts, deleted after review (product call)
- D2 — fold in admin brief and comparison-core regexes — both would fail U7's leak check (product call)
- D3 — engine AGENTS.md and skill text become generic; John's operator rules move in U8 (product call)
- D4 — owner repo ships by direct push to main — private single-owner repo (product call)
- D5 — tests: fictional-owner fixture for scripts + static grep over skills and AGENTS.md (code: test/fixtures/owners.mjs)
- D6 — user agent derives from slug; John's becomes `john-viklund-…` (was `johnviklund-…`), not golden-covered

## Test seams
- `runProjectReview`, review-conversations brief builder, `syncRepositories` headers — observe B1–B3, B5, B6 (existing)
- `comparison-core` exports — B4 (existing)
- static grep test over `AGENTS.md` and `.agents/skills/*/SKILL.md` — B7 (new)

## Out of scope
- README.md:78 stale `config/` text (C1-3) — U7 rewrites the README
- Leak check in `npm run check`, setup command, Ada completion — U7
- Moving John's files, deleting tracked content, deploy — U8

Docs read: none in scope (PRODUCT.md absent; design.md untouched)
