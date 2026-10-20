Command: workflow review forkable-cutover
Created: 2026-10-20
Base:    40dd85d
Inputs:  .workflow/forkable-cutover/review.md @ 40dd85d
Status:  complete

## Execution state
Current: C1-T1 next. Patch cycle 1 · fix C1-1, C1-2.

## Tickets

### C1-T1 — the credit-line exceptions exempt only their exact text
Delivers: C1-1 (B2, B3) · Blocked by: none · Lane: logic
Budget: code +0 · tests +6 · why: missing assertions, not a behaviour bug; the code is right, so one test-only commit
Seam: no-argument CLI test in `test/check-leaks.test.mjs`
Accept:
- [ ] leak cases add `LICENSE` = the copyright line plus the surname on the same line, and `README.md` = the credit line plus the surname on the same line; each → exit 1, stderr names the file (C1-1)
- [ ] in a throwaway worktree, widening scripts/check-leaks.mjs:28 to `/^Copyright .*$/m` and :29 to `/^Maintained by .*$/m` each turns the test red; nothing committed from the worktree (C1-1)
Verify: `node --test test/check-leaks.test.mjs` (pre: 3 pass; both mutants green)
Skills: none
Status: todo

### C1-T2 — test fixtures carry no real employer or role of the owner
Delivers: C1-2 (B4, Outcome) · Blocked by: none · Lane: logic
Budget: code +0 · tests +0 · why: literal swaps only
Seam: `test/comparison-evidence.test.mjs`, `test/cv-pdf.test.mjs`, `test/og-image.test.mjs`, `test/site-rendering.test.mjs`
Accept:
- [ ] `git grep -niE 'volvo|axient|americas crm' -- test` → no output; replacements are fictional (`Example Motors`, `Sample Co`) (C1-2)
- [ ] each private `../agent-cv-private/data/cv.md` `###` employer name (Volvo, Tajitsu, Axient, Saltside, StreamServe, OpenText) is absent from `git grep -i` over the tracked tree outside `.workflow/` and `WORKLOG.md` (C1-2)
- [ ] the four files keep their assertion-site counts; Ada `npm run check` and sibling `npm test` → 0 failures (C1-2)
Verify: `node --test test/comparison-evidence.test.mjs test/cv-pdf.test.mjs test/og-image.test.mjs test/site-rendering.test.mjs && ! git grep -qiE 'volvo|axient|americas crm' -- test` (pre: grep finds 8 lines)
Skills: none
Status: todo
