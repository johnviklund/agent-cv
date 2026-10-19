Command: workflow execute forkable-example-owner
Created: 2026-10-19
Base: c6c85f7
Inputs: .workflow/forkable-example-owner/plan.md @ e1a571b
Status: complete

## Current result
Writer: GPT-6.1 Sol · high
T2 is committed as 95eae04; private golden exceptions are ae5d654. No repository was pushed.
Owner approved adding target="_blank" and rel="noopener noreferrer" and updating T2's acceptance on 2026-10-19.
The existing external-link test is unchanged. The owner approved the UI and commits on 2026-10-20.

## Verification
- Baseline `npm run check`: exit 0, 297 passed, 3 skipped. Tests run outside the sandbox because sandboxed child commands return empty output.
- New footer regression, before implementation: exit 1, missing credit on Ada's homepage.
- Final `node --test test/site-rendering.test.mjs`: exit 0, 16 passed. The new test checks all ten rendered HTML pages for Ada and John locally, including the approved attributes.
- `npm run golden:diff`: exit 0. Exactly ten accepted HTML exceptions have the U7 footer reason; no unlisted change remains.
- Every current rendered page, after removing only the new credit markup, equals its baseline HTML exactly. Private golden-exceptions.json updates three existing HTML entries and adds seven. It is committed as ae5d654.
- Mutation: returning an empty credit fails the regression. Removing only the approved attributes also fails it, exit 1; implementation restored exactly after each probe.
- Initial full check failed only the existing external-link test. The owner approved matching that rule; the test was preserved.
- Final John's `npm run check`: exit 0, 298 passed, 3 skipped; static checks pass for ten pages.
- Final `AGENT_CV_OWNER_ROOT=examples/owner npm run check`: exit 0, 289 passed, 12 skipped; static checks pass for ten pages.
- John's generated data, site and Wrangler config were restored afterward. Tracked public sources and evidence.json have no diff.
- Updated all ten golden digests for the approved attributes. Each page differs from the earlier T2 render only by those attributes; appearance is unchanged.
- URL-definition search in site/templates and scripts returns exactly one hit, in site/templates/html.mjs.
- Both repositories pass git diff --check. The private owner's existing faq.md edit remains untouched.

## Screens and reuse
Ten before/after pairs are in screens/T2-<page>-{before,after}.jpg. Each uses John's data, the same route, 1280×800, and the page bottom. Pages are home, about, experience, projects, cv, contact, privacy, application, admin and 404.
Browser checks found the credit and upstream href on all ten pages and no horizontal overflow. Home, admin and 404 images were visually checked. The 404 after image was recaptured after its compositor caught up with the DOM. The final home screenshot confirms the approved attributes, a 44-pixel link height and no horizontal overflow.
Preview is a local static server at http://127.0.0.1:8765/. It does not run the chat API.
Reused the existing footer CSS. sourceLink is owner-specific, so credit() and the shared upstream constant sit beside it and serve home.mjs and pages.mjs.
Two existing identity assertions now remove only the exact upstream URL before matching. Their deny patterns are unchanged. Assertion count is 56 before, 58 after; no assertions removed.
Docs read: design.md §System, §Typography and spacing, §CTA voice and states. No design document changes.

## Handoff
T2 is complete. Continue with T3 at the same model and effort. Pushes and CI remain T4's operator step.
Full command outputs and reviewed HTML diffs remain in /tmp/forkable-example-owner-t2-*; no private exception content was copied into the public repo.
