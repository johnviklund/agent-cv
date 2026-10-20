# Test a CLI's default arguments, not only explicit ones
Applies when: a script has default folders or paths and its tests call it with explicit arguments.
Root cause: forkable-example-owner's leak scanner tests always passed folders, so its default list (the one `npm run check` and CI use) was untested and could silently scan nothing.
Fix: export the defaults and assert them, or run the no-argument path in a test.
Evidence: forkable-example-owner C1-2 (b16b8bd)
Occurrences: 1 · Last confirmed: 2026-10-20 · Status: active
Enforced by: test/check-leaks.test.mjs
