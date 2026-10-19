# C1-T1 verification — setup:admin uses the selected owner's config

Red @ 709d202 (test only): `node --test test/setup-admin.test.mjs` → 0 pass, 6 fail.
- no config → fake npx read nothing (`Unexpected end of JSON input`)
- John's config present → fake npx saw `john-viklund-agent-cv`
- example owner (directory, symlink) → no rejection; token rewritten

Green @ 1ae2871: same file → 6 pass, 0 fail (test file unchanged).
- `node --test test/admin-secret-file.test.mjs test/wrangler-config.test.mjs test/setup-admin.test.mjs` → 19 pass
- `npm run check && npm run build` → exit 0; 285 tests, 282 pass, 3 skipped (baseline 276/3 + 6 new)

Mutations:
- generation line removed → 0 pass, 6 fail
- `deploy: true` → `deploy: false` → 3 pass, 3 fail (both refusal cases and their parent go red)

Fake npx only copies `wrangler.jsonc` and drains stdin; no network, no real token printed.
Entry-point search: `rg -n wrangler scripts package.json` — dev/deploy/build/check already generate (test/wrangler-config.test.mjs); setup:admin was the only gap.
