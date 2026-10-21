# Test both bounds of a one-of schema rule, not just the happy path
Applies when: a validator requires exactly one of several keys (site.json prose blocks), or an exceptions list or allowlist must match a path or line exactly, or an allowlist has several keys (one failing case per key).
Root cause: the cycle 1 review found empty and multi-key blocks rendered silently, and golden exceptions that did not enforce their own path; the plan's acceptance lines only covered ordinary input.
Fix: an exact-text exemption (leak-check LICENSE and README credit lines) needs a leak case on the very line it exempts, so widening it to any `Copyright` line fails a test. Write the failing test for each bound (minProperties and maxProperties; wrong path, before, after, prompt) first, then confirm by mutating each guard in a disposable worktree.
Evidence: forkable-site-rendering C1-1 (65a0eaa) · C1-2 (0cec7b1) · forkable-cutover C1-1 (009ab1f) · forkable-live-verify C1-1 (9c8ee13: deploy guard tested five of six keys, owner.json missed)
Occurrences: 3 · Last confirmed: 2026-10-21 · Status: active
Enforced by: test/site-rendering.test.mjs, test/golden.test.mjs and test/check-leaks.test.mjs (`npm run check`)
