Command: workflow brainstorm forkable-live-verify
Created: 2026-10-20
Base:    90434e2
Inputs:  none
Status:  done

## Problem
The cutover made the engine repo generic, but nothing has shown that the live site still works when built and deployed from the new engine plus `agent-cv-private`. The owner needs that proof before trusting the split.

## Outcome
johnviklund.com is redeployed from the cutover engine and a live check shows the same pages, PDF, chat, comparison and admin guard as before. Surface: the live site and `receipts/live-verification.md`.

## Behaviours
- B1 — `npm run deploy` with the private owner bundle → Worker `john-viklund-agent-cv` deploys; deploy exits 0 (live)
- B2 — after deploy, `/llms.txt`, `/cv.md`, `/sitemap.xml`, `/AGENTS.md` → sha256 equals the local `build/site` copy (live)
- B3 — after deploy, `/john-viklund-cv.pdf` → 200, `application/pdf`, ≤2 pages (live)
- B4 — `/api/health` → `{"ok":true,"configured":true}` (live)
- B5 — one `POST /api/ask` question → SSE stream with sanitized events ending in a final answer, no raw provider events (live)
- B6 — one `POST /api/compare` → a comparison result is returned (live)
- B7 — `GET /api/admin/conversations` and `/api/admin/stats` with no token → 401 (live)

## Decisions
- D1 — deploy once, compare live to local — only proof the new deploy path works (product call)
- D2 — one chat and one comparison — spends two requests of the monthly cap, creates two 90-day records (product call)
- D3 — admin checked unauthenticated only — keeps the token out of the session (product call)
- D4 — one-off script in `scripts/`, not a new verify-agent-cv mode — checks are a few requests (product call)
- D5 — deploy is an operator ticket: runs only after the human approves the exact command (code: package.json `deploy`)

## Test seams
- `npm run deploy` exit code and wrangler output — observes B1 (existing)
- HTTP GETs/POSTs against johnviklund.com — observe B2–B7 (new one-off script, receipts only)

## Out of scope
- Fork deploy to a throwaway Worker — deploy refuses the Ada example owner by design
- Admin export with the token — D3
- Live-target mode for verify-agent-cv — D4
- TODO.md item forkable-maintenance-tooling C1-2 — unrelated to deploy
- Deferred cutover P3s (C1-3, C1-4, C2-1) — stay in the cutover review.md

Docs read: none in scope (no PRODUCT.md/ROADMAP.md; AGENTS.md §Verification, §Generated resources)
