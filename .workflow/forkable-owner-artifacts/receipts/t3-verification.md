# T3 verification — generated Wrangler config

Commit: c6a1a04 · Writer: Opus 5.5 · 2026-10-19

| Check | Result |
|---|---|
| `node --test test/wrangler-config.test.mjs test/contact.test.mjs test/comparison-fixtures.test.mjs test/static-contract.test.mjs test/golden.test.mjs` | 39 pass, 0 fail (pre: 28 pass, new file absent) |
| Same, `AGENT_CV_OWNER_ROOT=examples/owner` | 35 pass, 4 skip (John-only), 0 fail |
| John's generated `wrangler.jsonc` sha256 | `e93980a5…941ce`, equal to the committed file it replaces and to golden-exceptions.json `after` |
| `npm run golden:diff` | exit 0; 9 accepted (existing exceptions, incl. wrangler.jsonc), 0 unlisted; baseline not recaptured |
| `npm run check` | exit 0; 269 pass, 3 skip (baseline 258/3) |
| `npm run build` | exit 0; Wrangler dry-run + package check cover 23 modules |
| Owner switch | `examples/owner` → name `ada-example-agent-cv`; back to John → `john-viklund-agent-cv` |
| `git ls-files wrangler*` | `wrangler.base.jsonc` only; `/wrangler.jsonc` ignored (.gitignore:32) |
| Mutation: drop `CONTACT_EMAIL` from the destructure | 2 fail |
| Mutation: keep `*.workers.dev` hosts | 2 fail |
