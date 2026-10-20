Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    d859042
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

Reuse: existing GRACE fixture, loadOwner and renderSite. No new runtime helper.
Content red: pre-T4 git grep finds personal literals in test/. Green: the same grep exits 1 with no matches.
Exact Verify: exit 0, 136 pass / 1 skipped. /tmp/forkable-cutover-t4-verify.log.
Ada npm run check: exit 0, 318 pass / 3 skipped; ten static pages pass. /tmp/forkable-cutover-t4-check.log.
Sibling npm test after sync:data: exit 0, 319 pass / 2 skipped. /tmp/forkable-cutover-t4-private.log.
Mutation: replace the first repository fixture with example/wrong-repository; repository-grounding test exits 1. Restored before final checks. /tmp/forkable-cutover-t4-mutation.log.
The career-subrole and curated repository-list snapshots retire under decision 2a; Ada has neither equivalent. The source/action layout test runs on Ada's two projects instead of four personal projects. Privacy uses Ada's real rendered copy; confidential, special-category and third-party phrase cases retire because Ada does not carry them. Protected-trait and named refusal inputs read GRACE.name.short. Other assertions retain their behavior with fictional literals; leak deny-list names are assembled without embedding forbidden text.
Assertion-site counts:
test/check-leaks.test.mjs: 9 -> 9
test/comparison-controller.test.mjs: 75 -> 75
test/comparison-core.test.mjs: 72 -> 67
test/comparison-state.test.mjs: 30 -> 30
test/comparison-view-model.test.mjs: 76 -> 76
test/conversation-review.test.mjs: 25 -> 25
test/maintenance-docs.test.mjs: 11 -> 11
test/project-review.test.mjs: 43 -> 43
test/repository-grounding.test.mjs: 24 -> 17
test/review-conversations.test.mjs: 47 -> 47
test/static-contract.test.mjs: 72 -> 72
test/sync-public-data.test.mjs: 10 -> 10
test/webmcp.test.mjs: 64 -> 64
No production code or visible UI changed. Private bundle restored.
