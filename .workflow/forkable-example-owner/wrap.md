Command: workflow wrap forkable-example-owner
Created: 2026-10-20
Base:    83bd48d
Inputs:  .workflow/forkable-example-owner/review.md @ 83bd48d
Status:  done

# forkable-example-owner — summary

Outcome: the engine now builds from the selected owner's root. Ada's example owner builds complete in CI, `npm run check` scans her output for any trace of John and fails if one appears, and every page footer credits Agent CV. John's published bytes are unchanged apart from ten accepted footer exceptions. Review: three cycles, ship as-is @ 4cf2630 (cross-vendor: writer GPT-6.1 Sol, reviewer Opus 5.5).

## Shipped
- T1 source bundles built from the selected owner: 023e92f
- T2 footer credit on every page: 95eae04
- T3 Ada CI build and leak scanner: 28d4fc6 (+ privacy-fixture fix 150b701)
- T4 pushes and CI read: 83fbf99, receipts/t4-push-ci.md
- Patch C1-T1 repository sync and CV PDF back on owner data: 882b97c
- Patch C1-T2 leak scanner default folders: b16b8bd
- Patch C2-T1 evidence builder and project review read owner data: dc7a942

## Deferred
- C2-2 default-folders test depends on cwd (P3) and C2-3 PDF path untested without Chromium (P3): stay in review.md.
- C3-1 unreachable owner-root guard in the project-review packet (P3): stays in review.md.
- Out of scope, untouched: engine `data/` and `public/` removal, `bootstrap:data`, repo rename (U8).

## Learnings routed
- memory/test-on-example-owner-bundle (now 2 occurrences), memory/test-cli-default-arguments (new), eval case missed-moved-source-leaves-writer-on-old-path (j-skills-evals 825438c).

## Receipts and records
- receipts/ (t1–t3, c1-t1, c1-t2, c2-t1 verification, t4 push and CI), screens/ (T2 before/after, 10 pages), brainstorm.md, plan.md, review.md, learnings.md.
- Product docs: design.md no change; PRODUCT.md and ROADMAP.md absent. No verify skill exists; `verify.create` recommended.
Retired: none — the engine `data/` and `public/` copies are kept until U8.
