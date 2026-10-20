# Agent CV feature map

User-facing features of the site and how to prove each one with `scripts/control`.

## Baseline preconditions
- `control up` has run and `control doctor` exits 0. The site serves the default owner's content.
- No `OPENAI_API_KEY`, so AI answers are unreachable; error paths are driven instead.

## Driving conventions
- Start every recipe at `control open <path>` from the baseline. Use ARIA role and name, not CSS or position.
- Commands are literal. After a conversation or comparison, `Start over` / `Clear comparison` returns to the baseline, or reopen the page.

## Proof rules
- UI proof is a `shot` plus a `snapshot` (or an `eval` read of the visible text).
- Server proof is `control api` on the route.
- Every artifact name starts with the feature id. An unreachable path is reported with the command tried and the missing precondition, never as verified through another path.

## Features
- [site-pages](site-pages.md) — home, CV, contact, admin sign-in, not-found page
- [ask-chat](ask-chat.md) — the home-page question box and conversation
- [compare-roles](compare-roles.md) — the side-by-side role comparison workspace

Last maintained: 2026-10-20 @ a5d5f0f
