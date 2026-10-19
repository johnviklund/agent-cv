Command: workflow plan forkable-maintenance-tooling
Created: 2026-10-19
Base:    e32329f
Inputs:  .workflow/forkable-maintenance-tooling/brainstorm.md @ 6375073
Status:  complete

Docs read: none in scope (PRODUCT.md absent; DESIGN.md untouched); docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md §U6–U8
Size: code 2558 · tests 1610 · ratio 0.63 · largest touched site/templates/pages.mjs 453, src/comparison-core.js 436, site/assets/admin.js 414 · over 1,000: none
Decisions: 1a (skills say "the owner's public sources, currently engine `data/`"; U8 drops the clause) · 2a ticket list approved

## Execution state
<filled by execute>

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | src/comparison-core.js:48 `ownerScreen` already rewrites the owner's full and short name to "the candidate" before the guards; test/owner-runtime.test.mjs:72 refuses "Ada scores 99%". | B4 is delivered except the literal `john` alternatives in 8 regexes (lines 32–44); the ticket deletes them and keeps every existing refusal test green. |
| F2 | scripts/project-review.mjs:57,185,191 hard-code "John" and "his contribution". | renderProjectReview takes the owner; text uses the short name, no pronoun. |
| F3 | scripts/review-project-sources.mjs:14 defaults the manifest to `config/project-sources.private.json`; local folder paths resolve against the manifest's folder (line 68). John has no private manifest today. | Default becomes `<owner root>/project-sources.json`; relative folder paths then resolve against the owner root. Nothing of John's to migrate. |
| F4 | Canonical files (project-review.mjs:3) resolve against the engine root; the four public sources live only in engine `data/` until U8. | The packet still reads engine `data/`; skills name the owner's public sources as currently engine `data/` (decision 1a). |
| F5 | scripts/review-conversations.mjs:101–102 and site/assets/conversation-review.js:105,108 hard-code "John". | Packet and brief builders take the owner. |
| F6 | site/templates/pages.mjs:349 `renderAdmin` emits `<html lang>` without the data-owner-* attributes that `readOwner` (site/assets/dom.js:17) reads; site/templates/html.mjs:50 `htmlAttributes` builds them. | Admin page switches to `htmlAttributes(owner)`; admin.js passes `readOwner()` to the brief. |
| F7 | golden covers built site bytes; `golden:diff` accepts only exact entries in the owner's golden-exceptions.json (precedent: forkable-site-rendering, approved 1a). | Changed site/admin/index.html, site/admin.js, site/conversation-review.js need reviewed exceptions committed in agent-cv-private. Outcome "golden diff empty" reads "0 unlisted". |
| F8 | scripts/sync-github-repositories.mjs:21 hard-codes the user agent; syncRepositories already takes `ownerRoot`. | Load owner.json from that root for the slug. |
| F9 | test/codex-conversation-review.test.mjs:26,30 assert "Do not ask John" and "Awaiting John approval". | Those asserts change with the skill text in T3. |
| F10 | `.gitignore` already lists `conversation-reviews/` and `project-reviews/`; agent-cv-private has a stray `conversation-reviews/proposals/` folder, untracked by its .gitignore. | B6 is a test of the engine paths only; the stray folder is out of scope, noted under Risks. |
| Reuse | `loadOwner` (scripts/owner.mjs:97), `resolveOwnerRoot` (owner.mjs:18), `readOwner` (dom.js:17), `htmlAttributes` (html.mjs:50), fixtures `ADA`/`ELISE` (test/fixtures/owners.mjs). | Every ticket reuses these; no new helper. |

## Tickets

### T1 — Project review and repository sync use the owner
Delivers: B1, B3, B5, B6 · Blocked by: none · Lane: logic
Budget: code +35 · tests +45 · why: four seams share one owner-root fixture
Seam: `runProjectReview({ ownerRoot })`, `renderProjectReview({ owner })`, `syncRepositories` request headers
Accept:
- [ ] Ada owner root with a manifest → packet contains "requires Ada's review" and 0 matches of /John|Viklund/ (B1)
- [ ] `<ada root>/project-sources.json` with one local folder → packet lists that folder; missing file → error message contains `<ada root>/project-sources.json` (B5)
- [ ] syncRepositories with Ada root → every fetch sends user-agent `ada-example-agent-cv-repository-sync` (B3)
- [ ] engine paths `project-reviews/x.md` and `conversation-reviews/inbox/x.md` → `git check-ignore` exits 0 for both (B6)
Verify: `node --test test/project-review.test.mjs test/owner-manifests.test.mjs` (pre: 17 passed)
Skills: none
Status: todo

### T2 — Conversation packet, admin brief and comparison guards use the owner
Delivers: B2, B4 · Blocked by: none · Lane: logic
Budget: code +30 · tests +40 · why: script and browser builders each get an Ada and a John case
Seam: `renderConversationCandidatePacket({ owner })`, `buildConversationReviewBrief({ owner })`, rendered admin page, `canonicalizeComparisonDraft`
Accept:
- [ ] Ada packet and Ada brief → each contains "Interview Ada" and 0 matches of /John|Viklund/ (B2)
- [ ] renderAdmin for Ada → `<html>` carries `data-owner-short-name="Ada"` (B2)
- [ ] `grep -ci john src/comparison-core.js` → 0; "Ada scores 99%" for Ada and every John prohibited string for John still throw `draft_hiring_conclusion` (B4)
- [ ] `npm run golden:diff` → 0 unlisted; three new exceptions in agent-cv-private name admin/index.html, admin.js, conversation-review.js (B2)
Verify: `node --test test/review-conversations.test.mjs test/conversation-review.test.mjs test/comparison-core.test.mjs test/owner-runtime.test.mjs test/site-rendering.test.mjs && npm run golden:diff` (pre: 43 passed, 1 skipped; golden 0 unlisted)
Skills: none
Status: todo

### T3 — AGENTS.md and both skills are owner-neutral and two-repo
Delivers: B7 · Blocked by: T1 · Lane: logic
Budget: code +40 · tests +30
Seam: `test/maintenance-docs.test.mjs` static read of AGENTS.md and `.agents/skills/*/SKILL.md`
Accept:
- [ ] AGENTS.md and both SKILL.md files → 0 matches of /John|Viklund|johnviklund/i (B7)
- [ ] both skills contain "commit and push the owner repo's main", "engine PR only for engine files" and "AGENT_CV_OWNER_ROOT" (B7)
- [ ] both skills contain "currently engine `data/`" for the four public sources (B7, decision 1a)
- [ ] AGENTS.md names `<owner root>/project-sources.json` and no longer names `config/project-sources.private.json` (B7)
Verify: `node --test test/maintenance-docs.test.mjs test/codex-conversation-review.test.mjs test/codex-project-refresh.test.mjs` (pre: 2 passed; new maintenance-docs file absent)
Skills: /home/john/.claude/skills/agent-docs/SKILL.md
Status: todo

## Coverage
- Outcome → T1, T2 (Ada output with no John), T2 golden line (John's bytes), T3 (docs)
- B1 → T1 · B2 → T2 · B3 → T1 · B4 → T2 · B5 → T1 · B6 → T1 · B7 → T3
- Out of scope: README.md:78 stale config text → untouched (U7) · leak check, setup, Ada completion → untouched (U7) · moving John's files, deploy → untouched (U8)

## Risks
- T2 is riskiest: it changes John's admin page bytes and needs a commit in agent-cv-private for the golden exceptions.
- F4: U8 must delete the "currently engine `data/`" clause from both skills when the sources move.
- agent-cv-private/conversation-reviews/proposals/ is untracked but not ignored there; left for U8.

## TODO impacts
none

## Product doc impacts
- PRODUCT.md, DESIGN.md, ROADMAP.md: no changes.
