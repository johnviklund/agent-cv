# Patch cycle 1 verification

C1-T1 — red 6c7dc2b: new prose-block test failed "Missing expected rejection" (14 pass, 1 fail).
Fix 65a0eaa: node --test test/site-rendering.test.mjs 15 pass; npm run check 248 pass, 1 skipped, exit 0;
npm run golden:diff exit 0, 9 accepted, 0 unlisted. Mutations: drop the minProperties line → 1 fail; drop maxProperties → 1 fail.

C1-T2 — 0cec7b1: node --test test/golden.test.mjs 8 pass; npm run check 249 pass, 1 skipped, exit 0.
Throwaway detached worktree at HEAD (removed afterwards), scripts/golden.mjs mutated one at a time:
- drop `entry.path === path` → new path-identity test fails (7 pass, 1 fail)
- drop `entry.before === before` → "accepts each exactly recorded…" fails
- drop `entry.after === after` → "accepts each exactly recorded…" fails
- drop the prompt rejection → "rejects prompt exceptions…" fails
- unmutated → 8 pass
