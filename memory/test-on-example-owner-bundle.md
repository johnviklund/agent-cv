# Run touched tests on the example-owner bundle when removing owner literals
Applies when: a change removes John-specific literals from engine code or tests, or a test names the owner.
Root cause: forkable-maintenance-tooling kept a John-literal refusal test bound to the generated owner. It passed on John's bundle and failed on CI's example-owner bundle. The execute receipts ran `npm run check` only locally, and main was pushed with CI red.
Fix: bind owner-named test strings to their owner fixture. Run the touched tests once on the example-owner bundle, and read CI after the push. Ignored local files (engine `data/`) can hide a wrong path, so run them in a clean clone with no ignored files before pushing.
Evidence: forkable-maintenance-tooling C1-1 (539d45c) · forkable-example-owner T4 (4fcdb59 pushed red, fixed 150b701)
Occurrences: 2 · Last confirmed: 2026-10-20 · Status: active
Enforced by: CI on the example-owner bundle; test/comparison-core.test.mjs
