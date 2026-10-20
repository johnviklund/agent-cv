Command: workflow wrap forkable-cutover
Created: 2026-10-20
Base:    230538f
Inputs:  review.md @ 230538f
Status:  done

## Outcome
The engine repo no longer tracks John's sources, generated files, docs or personal test literals. They live in `agent-cv-private`; a fork inherits Ada Example only. A new tracked-tree leak check (`scanTrackedFiles`, part of `npm run check`) fails on any owner trace outside an exact allowlist. A clean clone builds and checks as Ada; John's golden diff still shows only the 19 accepted exceptions. Deploy and live checks are the next run (forkable-live-verify).

## Shipped
T1 private repo handoff @ 70887fd · T2 tree cutover @ 129f4c7 · T3 Worker/deploy fixtures @ cbce676 · T4 maintenance and comparison tests @ d859042 · T5 docs and skills @ 636f2d9 · T6 tracked-tree leak check @ a652048 · T7 push and CI @ a7f2a86 (run 39446308069 success) · patch C1-T1 @ 009ab1f · C1-T2 @ 648a24d

## Review
Cross-vendor (writer GPT-6.1 Sol, reviewer Opus 5.5, then Sonnet 5.5 fallback). 2 cycles, ship as-is @ 6f83574. Fixed: C1-1 (P1, credit-line exceptions), C1-2 (P2, real employer fixtures). `npm run check` 321 pass / 2 skipped / 0 fail; leak scan 0.

## Deferred (stay in review.md)
P3 C1-3 output scan skips NUL files · C1-4 tracked scan uses cwd, not engine root · C2-1 rendered-page owner markers no longer catch John's real employer. No P2 deferrals, so nothing added to TODO.md.

## Learnings
Exact-text allowlists need a leak case on the line they exempt → memory/validate-both-schema-bounds.md (2 occurrences). A name-only grep cannot prove "no trace"; grep private CV headings too (kept in learnings.md).

## Receipts
`receipts/`: t1–t7 and c1 verification files, private-repo and CI handoffs, t6 and c1 clean-clone proofs.

Product docs: PRODUCT.md, DESIGN.md, ROADMAP.md absent; no statement changed. Feature map: no feature changed (no user-facing change).
Retired: none — the run itself removed the obsolete files; nothing further found.
