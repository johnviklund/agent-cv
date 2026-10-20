Command: workflow execute forkable-cutover
Created: 2026-10-20
Base:    cf0a5fe
Inputs:  .workflow/forkable-cutover/plan.md @ fafec6c
Status:  complete

T3 changes tests only. GRACE replaces the personal identity fixture, with a fictional domain, three hosts, archive namespace, email, worker name and the same variable fields. Existing ADA and ELISE fixtures stay available.
Reuse: existing owner fixture, loadOwner, renderSite, prompt/config builders; no new runtime helper.
Content red: the committed pre-T3 test files contain the forbidden owner names. Green: git grep -qiE 'john|viklund' over test/fixtures and the eleven Verify files exits 1, with no matches.
Exact Verify with private bundle: exit 0, 118 pass / 1 skipped. Log: /tmp/forkable-cutover-t3-sibling.log.
Exact Verify after syncing Ada's Worker bundle: exit 0, 117 pass / 2 skipped. Log: /tmp/forkable-cutover-t3-ada.log. Chromium remains opt-in; Ada publishes no email for the selected-owner guidance test.
Full npm run check with private bundle: exit 0, 321 pass / 2 skipped, static checks pass for 10 pages. Log: /tmp/forkable-cutover-t3-check.log.
The fixture rename also updates four live importers originally assigned to T4: project-review, review-conversations, conversation-review and comparison-core. Ada verification of these plus wrangler-config: 72 pass / 2 skipped. Log: /tmp/forkable-cutover-t3-consumers-ada.log. Remaining T4 owner-specific content stays for T4.
Mutation: change GRACE.deploy.workerName to wrong-worker; the custom-domain config test exits 1. Fixture bytes restored in finally; subsequent wrangler-config verification passes. Log: /tmp/forkable-cutover-t3-mutation.log.
Assertion-site counts changed: wrangler-config 17 -> 21, owner-runtime 12 -> 11, og-image 13 -> 12, site-rendering 58 -> 53. All other touched files keep their counts: worker 233, chat-core 50, contact 17, setup-admin 5, browser-owner 11, golden 33, cv-pdf 31, project-review 43, review-conversations 47, conversation-review 25, comparison-core 72.
Changed assertions: fixed owner names, URLs, email and forbidden second-owner names become Grace or Ada equivalents. Contact cases render Ada with explicit fictional channels and now run with either selected bundle. The personal config digest becomes five concrete config assertions; one personal prompt digest, one optional personal OG byte assertion and five personal snapshot assertions retire under decision 2a. The owner-neutral comparison digest remains.
No production code or visible UI changed. Owner bundle restored to the sibling after Ada verification; private FAQ remains uncommitted and unchanged.
