Command: workflow brainstorm forkable-owner-artifacts
Created: 2026-10-19
Base:    23da4d9a078faa14c10ec64e4d5aa71c896b1571
Inputs:  none
Status: done

## Problem
A fork cannot build its own card, PDF or deploy config. The OG card, PDF filename and CV header email, `wrangler.jsonc`, and three `config/` files still hold John's details in the engine repo. This is unit U5 of docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md.

## Outcome
`npm run check` and `deploy` build John's card, PDF and Wrangler config from his owner repo, unchanged. Ada's example builds the same artifacts with no trace of John. Surfaces: `build/site/og-image.png`, `build/site/<slug>-cv.pdf`, generated `wrangler.jsonc`.

## Behaviours
- B1 — `build-og-image` with John's owner → PNG byte-identical to today's committed card; with Ada → her name, headline and domain, no "John".
- B2 — `build:og-image` run for an owner → `<owner>/assets/og-image.png` exists, and `build:site` copies it to `build/site/`; a missing card fails with a message naming `npm run build:og-image`.
- B3 — `build:cv-pdf` writes `build/site/<slug>-cv.pdf` (John: `john-viklund-cv.pdf`) with the header email from `contact.email`; a null email → no email in the header.
- B4 — Wrangler config generated for John → equals today's file in content; routes are `site.hosts` as `custom_domain` entries, skipping `*.workers.dev`; `CONTACT_EMAIL` comes from `contact.email` and is absent when null.
- B5 — Any Wrangler script, `check-worker-package` or config-reading test run → uses the generated, gitignored `wrangler.jsonc`; the tracked engine file is `wrangler.base.jsonc`.
- B6 — Admin scripts take the trusted origin from `owner.json` `site.origin`; `config/admin-origin.json` is gone; an owner with no origin → the existing "not configured" error.
- B7 — `sync:repositories` and the comparison-evidence build run → they read `repositories.json` and `comparison-evidence.json` from the owner root; the engine `config/` copies are deleted; John's files are committed in `agent-cv-private`; Ada has a minimal valid pair.
- B8 — `golden:diff` run for John → covers the PNG bytes and the Wrangler config, with no unlisted differences for John.

## Decisions
- D1 — New optional `owner.json` `tagline` is the card's top line ("<tagline> · <location>", or location alone) — keeps John's card identical (product call)
- D2 — The card is committed in the owner repo and copied by `build:site`, so `check` needs no Chromium (product call)
- D3 — Generated config is the ignored root `wrangler.jsonc`; paths stay valid (code: scripts/check-worker-package.mjs)
- D4 — Admin origin derived from `site.origin`; still a file in the owner repo, never env or chat (code: scripts/admin-origin.mjs)
- D5 — Owner-root only for the two manifests; no engine fallback (product call)
- D6 — PDF is checked by pages, text and filename, not bytes: Chromium stamps dates (prototype: P1)

## Test seams
- `collectOutputs` / `golden:diff` in scripts/golden.mjs — observes B1, B4, B8 (existing)
- new `buildWranglerConfig(owner)` — observes B4, B5 (new)
- `buildCvPrintHtml` and the PDF output path — observes B3 (existing)
- new card-HTML builder exported from scripts/build-og-image.mjs — observes B1, B2 (new)
- scripts/admin-origin.mjs — observes B6 (existing)
- `loadOwner` / `resolveOwnerRoot` consumers — observes B7 (existing)

## Out of scope
- `npm run setup`, leak check, completed Ada content: U7.
- John's name in review scripts, skills, user agent, docs: U6.
- Cutover, deleting John-specific docs, live deploy and verification: U8.
- A Chromium-free generic fallback card: the owner supplies the card.

Docs read: none in scope (no PRODUCT.md; design.md untouched)
