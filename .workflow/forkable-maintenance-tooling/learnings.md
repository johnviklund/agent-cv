Command: workflow review forkable-maintenance-tooling
Created: 2026-10-19
Base:    8a30e36
Inputs:  none
Status:  done

- [durable→eval → routed → j-skills-evals missed-owner-literal-test-red-on-example-bundle.md]  code-review — writer (GPT-6.1 Sol) removed owner literals from src/comparison-core.js guards but kept a John-literal refusal test bound to the generated owner; green on John's bundle, red on CI's example-owner bundle. Caught by the reviewer (C1-1).
- [process → routed → memory/test-on-example-owner-bundle.md] Execute receipts ran `npm run check` only on the local owner's bundle, and main was pushed with CI red. When a change removes owner literals, run the touched tests once on the example-owner bundle and read CI after the push.
