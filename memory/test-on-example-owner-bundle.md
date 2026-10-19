# Run touched tests on the example-owner bundle when removing owner literals
Applies when: a change removes John-specific literals from engine code or tests, or a test names the owner.
Root cause: forkable-maintenance-tooling kept a John-literal refusal test bound to the generated owner. It passed on John's bundle and failed on CI's example-owner bundle. The execute receipts ran `npm run check` only locally, and main was pushed with CI red.
Fix: bind owner-named test strings to their owner fixture. Run the touched tests once on the example-owner bundle, and read CI after the push.
Evidence: forkable-maintenance-tooling C1-1 (539d45c)
Occurrences: 1 · Last confirmed: 2026-10-19 · Status: active
Enforced by: CI on the example-owner bundle; test/comparison-core.test.mjs
