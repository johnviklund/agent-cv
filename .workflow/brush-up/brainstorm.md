Command: workflow brainstorm brush-up
Created: 2026-10-21
Base:    3734878
Inputs:  none
Status:  complete

## Problem
John will link this public repo from his CV. A hiring engineer who opens it should see a working, well-explained project that shows his judgment. Today the tracked run history exposes his email, local paths and private-file hashes, and the GitHub metadata and README framing do not match.

## Outcome
On github.com/johnviklund/agent-cv a stranger reads the README first, finds what it is, a live demo link and the decisions behind it, and runs the example owner locally. A scrub scan of the tree and history finds no email, local path or private hash.

## Behaviours
- B1 — scan of tracked files for the selected owner contact email, home-directory paths, and the sha256 of private files → zero hits; the contact email is allowed only where the site publishes it (owner contact page, examples)
- B2 — a clean clone with `AGENT_CV_OWNER_ROOT=examples/owner` → `npm ci && npm run check` exits 0 (also green in CI)
- B3 — README first screen → states what the project is, links johnviklund.com as the demo, and names the key design decisions before the fork guide
- B4 — `gh repo view` → description describes the engine (not "for John Viklund"), topics are set, homepage is the live site
- B5 — `docs/how-this-was-built.md` → explains `.workflow/`, `memory/`, `WORKLOG.md` and `.agents/` in plain words and is linked from the README
- B6 — `README.md`, `AGENTS.md`, `USERGUIDE.md`, `/llms.txt` → every command and path they name exists, and the agent and human entry points agree
- B7 — history secrets scan (token patterns, private keys) → zero hits, recorded in a receipt
- B8 — repo root → no stray `*.proposed` files, no untracked or ignored-by-accident clutter

## Decisions
- D1 — keep `.workflow/`, `WORKLOG.md`, `memory/` public but scrub them — shows the agent workflow as evidence (product call)
- D2 — no history rewrite — current tree is what readers see; rewrite only if B7 finds a real secret (product call; cutover run decided the same)
- D3 — README is written for a hiring engineer first, fork guide after (product call)
- D4 — README and homepage link johnviklund.com as the demo — the rate limit and monthly budget cap the cost (product call)
- D5 — done means the B1–B8 checklist, not an end-to-end fork deploy (product call)

## Test seams
- `node scripts/check-leaks.mjs` (existing, extend with the email and path patterns) — observes B1, B8
- `npm run check` on a clean clone — observes B2, B6
- `gh repo view --json` and the README text — observe B3, B4, B5

## Out of scope
- Throwaway-fork deploy and first-time fork walkthrough — own run (D5)
- Git history rewrite — D2
- Admin export with token, live mode for verify-agent-cv — not part of the brush-up
- TODO.md item C1-2 and deferred cutover P3s — unrelated
- Removing `.workflow/` from Git — rejected (D1)

Docs read: none in scope (no PRODUCT.md; README.md, AGENTS.md, USERGUIDE.md headings, .gitignore, package.json check script)
