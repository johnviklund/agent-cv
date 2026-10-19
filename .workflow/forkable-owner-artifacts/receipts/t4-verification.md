T4 verification · engine 6c5e5b2 · writer Opus 5.5

- `node --test test/admin-origin.test.mjs test/review-conversations.test.mjs`: 16 passed, 0 failed (pre: 12).
- Red: new admin-origin file failed to import (no `adminOrigin` export); review default-origin test failed against HEAD~ (2 failed).
- Owner origin: temp owner.json `https://fork.example` → readAdminOrigin and review requests go only to https://fork.example; John's default root → https://johnviklund.com.
- Rejections before any request: missing owner.json and missing site.origin → "not configured"; malformed JSON → "configuration is invalid"; http, credentialed, path, query, fragment → "valid HTTPS origin"; review with an http owner origin made zero fetch calls.
- Example refusal: examples/owner and a symlink to it → "Refusing…"; `export-conversations.mjs` with a synthetic token and the example root exits 1 with no output file.
- Overrides: `adminOrigin("https://override.example")` returns it; an http override rejects; token handling code untouched.
- Mutation: dropped `deploy: true` from resolveOwnerRoot in readAdminOrigin → both example-refusal tests red; restored.
- `npm run check`: 261 tests, 258 passed, 3 skipped (opt-in Chromium), 0 failed; static checks pass for 10 pages.
