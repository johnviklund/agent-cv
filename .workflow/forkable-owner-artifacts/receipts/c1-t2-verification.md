# C1-T2 verification — config formatting preserves owner strings

Red @ 4f33a7e (test only): `node --test test/wrangler-config.test.mjs` → 12 pass, 6 fail.
- `[ 1 ]`, `The [ 1, 2 ] cases`, `[ null ]`, `say "[ 1 ]"` changed; `[ 1. ]` threw `Unterminated fractional number`
- the backslash case already passed (its inner quotes are escaped, so the regex never matched); kept as an acceptance case

Green @ 59faacd: same file → 18 pass (test file unchanged).
- `node --test test/wrangler-config.test.mjs test/golden.test.mjs` → 26 pass
- John's digest `sha256:e93980a5…941ce` unchanged; no baseline update
- `npm run check && npm run build && npm run golden:diff` → exit 0; 289 pass, 3 skipped (282 + 7 new)

Mutations:
- `format(config)` → `JSON.stringify(config, null, 2)` → 10 pass, 8 fail (digest and every one-line-array assertion)
- the `item === null ||` guard survived its mutation; removed instead (no config has null array items)
