Command: workflow execute brush-up
Created: 2026-10-21
Base: 5fe0bfa
Inputs: .workflow/brush-up/plan.md @ ef7b4d1
Status: complete

The no-argument CLI now checks all tracked files for the selected owner's email,
Linux and macOS home-directory paths, private-file SHA256 prefixes, and proposals.
Only the pre-existing owner-name rule retains its workflow and worklog exemptions.
Private hash inputs are owner AGENTS.md, golden-exceptions.json, and unpublished data Markdown.
The four published data Markdown files are excluded from private hash inputs.
Scrubbed 15 tracked workflow records. Git history remains unchanged.

Red: seven new rejection cases failed against the old scanner; three clean cases passed.
Green: node --test test/check-leaks.test.mjs passes 14 tests, including 10 new cases.
Default CLI: Leak scan: 0 findings, exit 0.
Mutation: setting the selected-owner email to null makes the email rejection case fail.
Restored the guard before verification and commit.
Owner npm run check: 337 pass, 2 skipped, 0 fail; 10 static pages pass.
Example-owner npm run check: 336 pass, 3 skipped, 0 fail; 10 static pages pass.
Existing assertions are unchanged; the new test uses the CLI's default arguments.
Reuse: listFiles, resolveOwnerRoot, and scanTrackedFiles' existing git loop;
node:crypto supplies hashing. No new abstraction or walker.
Noticed: none. No website or public content change.
