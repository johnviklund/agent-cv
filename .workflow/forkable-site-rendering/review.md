Command: workflow review forkable-site-rendering
Created: 2026-10-19
Base: 1552a265f02d62ff17231ffac334069f256b14ae
Inputs: plan.md @ 7e923462686a794061dbbdcfb23f3988fb080d9b
Status: done

## Coverage
Docs read: AGENTS.md; design.md §§System, Typography and spacing, CTA voice and states, Motion stance, Notes.
- [x] T1 — 2/2 acceptance lines pass; path, before, after and prompt mutations fail in cycle 2.
- [x] T2 — 3/3 acceptance lines tested; runtime owner flow verified.
- [x] T3 — 3/3 acceptance lines satisfied; empty and multi-key blocks rejected in cycle 2.
- [x] T4 — 3/3 ordinary-input acceptance lines pass; shared malformed-block defect is C1-1.
- [x] T5 — 2/2 acceptance lines tested; John chat label observed in browser.
- [x] T6 — 3/3 acceptance lines supported by checks, golden diff and T6 receipts.
- [x] B1–B6 delivered; cycle 2 closes the B1/B3/B4 gaps. Outcome observed on local Wrangler using manual browser checks, no verify skill.
- [x] Out of scope preserved, including deferred owner-driven PDF/OG content and live deployment.
- [x] .workflow/ dependency check: no production references.
Size: +1568 code · +672 tests · ratio 0.43 · net +1400 · over 1,000: site/assets/styles.css 1484, test/worker.test.mjs 1330.
Reachability: templates → build-site → package scripts/golden/tests; html → templates/cv-pdf; moved assets → HTML/module imports; fixtures → tests. One-off migration scripts remain historical run artifacts.
Guards shown failing: unsafe links, required fields, prompt exceptions, exact path, both digests and both block-cardinality bounds. No added type/lint escape hatches.
Existing test assertion counts: unchanged except golden 20 → 30; John-only skips and replacement golden parity documented in approved T6 deviations.
Independence: cross-vendor; writer Opus 5.5, reviewer GPT-6 Astra; read-only OpenAI runtime/browser breadth review independently checked.
Evidence: receipts/c1-review.md; existing receipts/t6-verification.md and screens/T6-*.

## Resolved
| Finding | Sev | Title | Disposition | Resolved |
|---|---|---|---|---|
| C1-1 | P1 | Reject empty prose blocks before rendering | fix now | @ 65a0eaa (cycle 2) |
| C1-2 | P1 | Golden tests do not enforce the exception path | fix now | @ 0cec7b1 (cycle 2) |

## Pre-existing / environmental
MEMORY.md and PRODUCT.md are absent. Reviewer exam classes checked; neither finding repeats a listed class.
Local browser shows analytics CORS and WebMCP origin-trial warnings. No provider key is configured; successful paid responses were not exercised.
No repository verify skill exists; recommend `verify.create` for repeatable browser coverage.

## Cycle 2 findings
No open findings. Counts: P0 0, P1 0, P2 0, P3 0.
- C1-1: 15 renderer tests and 27 additional schema cases pass across about, CV and privacy; red-to-fix test diff is empty.
- C1-2: all eight golden tests pass; independent removal of path, before, after and prompt guards fails the intended test.
- Independent removal of minProperties and maxProperties validation also fails the intended test. All six mutations were isolated in a disposable worktree; unmutated suites pass.
- npm run check: 249 passed, 1 skipped; ten static pages pass. npm run build passes Worker dry-run and package validation.
- Golden diff accepts the same nine approved exceptions with no unlisted changes.
- Patch size: +7 code/-2 code; +48 tests/-1 tests; net +52. No assertion removals, new modules, production workflow dependencies or added escape hatches.
Evidence: receipts/c2-review.md. No production code changed during review.

## Cycle 2 verdict
Ship as-is. Both cycle 1 findings are resolved; proceed to wrap.
The sandbox drops captured subprocess output; the same probe and full checks pass outside it. This environmental blocker is resolved for verification.
No live deployment performed. Existing browser evidence remains applicable because the patch changes validation and tests only.
