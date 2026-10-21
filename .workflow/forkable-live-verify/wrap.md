Command: workflow wrap forkable-live-verify
Created: 2026-10-21
Base:    6e32468
Inputs:  .workflow/forkable-live-verify/review.md @ 6e32468
Status:  done

## Outcome
The live site johnviklund.com was redeployed from the cutover engine plus the private owner repo and proven working: Worker version c082c445 at 100% (not the old 833d10d6), four discovery files and the PDF byte-equal to the local build, health OK, chat stream completed, role comparison valid, admin routes 401. A prefactor narrowed the deploy example-content guard to real deploy inputs after the first deploy preflight failed on historical docs.

## Shipped
- T1 read-only live-check script + baseline @ bb6f3f4
- T3 deploy guard scans only deploy inputs @ baff4c1
- T2 deploy and live verification @ f1311ed
- C1-T1 owner.json guard test (review C1-1) @ 9c8ee13

## Review
Cross-vendor (writer GPT-6.1 Sol, reviewer Opus 5.5). 2 cycles; ship as-is @ 6e32468. C1-1 (P1) fixed; C1-2 (P3, allowlist literal inside loop) deferred and stays in review.md.

## Deferred
C1-2 P3 only (stays in review.md). No TODO changes. Product docs: no PRODUCT/DESIGN/ROADMAP exist; design.md no changes; USERGUIDE step 4 updated in T3. Feature map: no feature changed.

## Receipts (in the run folder)
receipts/ (baseline, live-verification, review-live-check, deploy handoffs, preflight failure, push block, per-ticket verification); scripts/live-check.mjs and live-check_test.mjs (code, left in place; outside npm test).

Learnings: 1 routed → memory/validate-both-schema-bounds.md (occurrences 3).
Final checks: npm run check pass (326 pass, 0 fail, 2 skipped).
Retired: none — the run added no replaced paths; the run scripts are kept as evidence.
