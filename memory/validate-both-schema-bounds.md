# Test both bounds of a one-of schema rule, not just the happy path
Applies when: a validator requires exactly one of several keys (site.json prose blocks) or an exceptions list that must match a path exactly.
Root cause: the cycle 1 review found empty and multi-key blocks rendered silently, and golden exceptions that did not enforce their own path; the plan's acceptance lines only covered ordinary input.
Fix: write the failing test for each bound (minProperties and maxProperties; wrong path, before, after, prompt) first, then confirm by mutating each guard in a disposable worktree.
Evidence: forkable-site-rendering C1-1 (65a0eaa) · C1-2 (0cec7b1)
Occurrences: 1 · Last confirmed: 2026-10-19 · Status: active
Enforced by: test/site-rendering.test.mjs and test/golden.test.mjs (`npm run check`)
