Command: workflow execute brush-up
Created: 2026-10-21
Base: c675f95
Inputs: .workflow/brush-up/plan.md @ ef7b4d1
Status: complete

T3 copy approved by the owner with 1a; see t3-copy-approval.txt. Commit: ced78db.
README puts the demo and four design decisions before the architecture and fork guide.
The new guide explains workflow records, memory, worklog, local skills and data boundaries.
No website page, route or owner content changes.

Red: the two new documentation tests fail on the missing demo link and guide.
Green: the exact ticket Verify command passes all 21 tests.
Owner npm run check: 339 pass, 2 skipped, 0 fail; 10 static pages pass.
Candidate clean clone: npm ci and npm run check exit 0; see t3-clean-clone.txt.
Tracked-file leak scanner: 0 findings. git diff --check passes.
Mutation: broadening the README exception to any Live demo line fails the bounded-credit test.
Restored the exact exception before full checks and candidate verification.

Existing test changes: tracked-tree permits only docs/how-this-was-built.md under docs/.
Its four assertion statements remain four; the tracked-tree expectation changes in one.
Maintenance-docs has 15 assertion statements before and 22 after; previous assertions remain.
The maintenance demo-line filter and CLI fixture now use the new exact demo line.
Check-leaks retains 21 assertion statements. No existing assertion was removed.
Reuse: existing document tests, tracked-tree guard, and bounded-credit CLI fixture.
Noticed: no unrequested visible changes; one existing tracked-tree expectation narrowed.

Approved commit fresh clone: 338 pass, 3 skipped, 0 fail; 10 static pages pass.
T3 done. T4's GitHub metadata and CI receipt remain.
