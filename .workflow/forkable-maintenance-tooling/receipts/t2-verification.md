Command: workflow execute forkable-maintenance-tooling
Created: 2026-10-19
Base: 7e1febe
Inputs: .workflow/forkable-maintenance-tooling/plan.md @ e32329f
Status: complete

T2 reuses loadOwner, readOwner and htmlAttributes. All packet and brief callers were found with rg and updated; no new helper.

- Red: the Ada packet, Ada brief and admin owner-attribute cases each fail on the old code.
- Green: the five Verify test files pass 60 tests with 1 skipped. The plan's pre-count of 43 passed was stale; no behavior or target depends on it.
- Full check: `npm run check` passes 293 tests, 3 skipped, 0 failed; static checks pass for 10 pages.
- `npm run golden:diff` exits 0 with 0 unlisted changes. Before exceptions it names exactly site/admin/index.html, site/admin.js and site/conversation-review.js.
- The three reviewed exceptions are committed separately in the owner repo; the engine does not store that private manifest. The pre-existing owner data/faq.md edit remains uncommitted.
- The rendered admin change only adds data-owner-* attributes. The script reads those attributes and passes the owner into the downloaded brief; there is no visible layout or copy change on the page.
- A fixed John fixture produces a downloaded brief with identical bytes before and after. Both frozen prompt digest tests remain green.
- `grep -ci john src/comparison-core.js` prints 0; existing Ada, Unicode-name and John prohibited-conclusion cases still reject with draft_hiring_conclusion.
- Mutations: hard-code John in the packet or brief, or remove admin owner attributes; each targeted test goes red. Originals restored.
- Existing assertions preserved: review-conversations 45 to 47, conversation-review 23 to 25, site-rendering 55 to 56.
- Logs remain in /tmp/forkable-t2-*.log; no transcript or credential was read.
