Command: workflow review forkable-site-rendering
Created: 2026-10-19
Base: 0835333de21e5385e3b5d8a423c95b4254976122
Inputs: plan.md @ 7e923462686a794061dbbdcfb23f3988fb080d9b
Status: complete

## Coverage
Docs read: AGENTS.md; design.md §§System, Typography and spacing, CTA voice and states, Motion stance, Notes.
- [ ] T1 — 2/2 existing acceptance cases pass; path mutation survives, C1-2.
- [x] T2 — 3/3 acceptance lines tested; runtime owner flow verified.
- [ ] T3 — 2/3 acceptance lines satisfied; invalid-section rejection misses empty blocks, C1-1.
- [x] T4 — 3/3 ordinary-input acceptance lines pass; shared malformed-block defect is C1-1.
- [x] T5 — 2/2 acceptance lines tested; John chat label observed in browser.
- [x] T6 — 3/3 acceptance lines supported by checks, golden diff and T6 receipts.
- [ ] B1/B3/B4 have the gaps above; B2/B5/B6 delivered. Outcome observed on local Wrangler using manual browser checks, no verify skill.
- [x] Out of scope preserved, including deferred owner-driven PDF/OG content and live deployment.
- [x] .workflow/ dependency check: no production references.
Size: +1568 code · +672 tests · ratio 0.43 · net +1400 · over 1,000: site/assets/styles.css 1484, test/worker.test.mjs 1330.
Reachability: templates → build-site → package scripts/golden/tests; html → templates/cv-pdf; moved assets → HTML/module imports; fixtures → tests. One-off migration scripts remain historical run artifacts.
Guards shown failing: unsafe links, required fields, prompt exceptions and digest checks; exact-path mutation survives. No added type/lint escape hatches.
Existing test assertion counts: unchanged except golden 20 → 30; John-only skips and replacement golden parity documented in approved T6 deviations.
Independence: cross-vendor; writer Opus 5.5, reviewer GPT-6 Astra; read-only OpenAI runtime/browser breadth review independently checked.
Evidence: receipts/c1-review.md; existing receipts/t6-verification.md and screens/T6-*.

## Cycle 1 findings
### P1 — C1-1: Reject empty prose blocks before rendering
- Evidence: T3 invalid-section acceptance, B3/B4. `schemas/site.schema.json:185` permits `{}` in every blocks array; `site/templates/html.mjs:92` only rejects multiple keys.
- Reproduction: validate example site with `pages.about.body=[{}]`, then renderSite; validation passes and HTML contains `<undefined>undefined</undefined>`.
- Remedy: enforce exactly one supported block key and report the site.json field; cover about, CV and privacy block arrays.
- Disposition: fix now
- Resolved: —

### P1 — C1-2: Golden tests do not enforce the exception path
- Evidence: T1 exact-record acceptance, B1. Removing `entry.path === path` at `scripts/golden.mjs:104` leaves all seven golden tests passing in the throwaway worktree.
- The digest checks cannot distinguish two files with identical before/after bytes. An exception for one path could approve another without a regression failure.
- Remedy: add a negative case with matching digests but the wrong path, including changed/added/removed entries; keep production path matching intact.
- Disposition: fix now
- Resolved: —

## Pre-existing / environmental
MEMORY.md and PRODUCT.md are absent. Reviewer exam classes checked; neither finding repeats a listed class.
Local browser shows analytics CORS and WebMCP origin-trial warnings. No provider key is configured; successful paid responses were not exercised.
No repository verify skill exists; recommend `verify.create` for repeatable browser coverage.

## Cycle 1 verdict
Fix C1-1 and C1-2 before wrap. Counts: P0 0, P1 2, P2 0, P3 0.
The normal John build preserves the frozen output with nine authorized exceptions. The malformed-content and verification gaps need patches.
Patch tickets are in patch_plan.md. No application code changed during this review.
