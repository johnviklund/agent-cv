T1 verification · engine 90cba12 · agent-cv-private 739738e · writer Opus 5.5

- John card parity: engine HEAD~ site/assets/og-image.png sha256 23e27186c987e54df80d34728379c10b76d33fe42608f33a4ba0dcd6dd9245a3; `node scripts/build-og-image.mjs` with John's owner rewrote agent-cv-private/assets/og-image.png with the same sha256.
- `AGENT_CV_CHROMIUM_TESTS=1 node --test test/owner.test.mjs test/site-rendering.test.mjs test/og-image.test.mjs test/golden.test.mjs`: 34 passed, 0 failed, 0 skipped (pre: 30).
- Ada card: `AGENT_CV_OWNER_ROOT=examples/owner node scripts/build-og-image.mjs` → examples/owner/assets/og-image.png, 38 KB; viewed: "Lisbon, Portugal" / "Ada Example." / "Staff engineer, distributed systems." / "ada.example".
- Mutation: buildSite card path → examples/owner card → og-image CLI test and golden coverage test red (2 failed, 9 passed); restored.
- Zero Chromium launches: `npm run check` with chromium, chromium-browser, google-chrome-stable, google-chrome and CHROME_PATH shimmed to a logger → exit 0, 0 launches; 254 tests, 252 passed, 2 skipped, static checks pass for 10 pages.
- `npm run golden:diff` (John) → exit 0, only previously accepted exceptions; site/og-image.png unchanged.
- Machine note: two mutation runs were OOM-killed (systemd-oomd, 7.7 GB host) because a failing assert.deepEqual on PNG Buffers diffs every byte; asserts now use Buffer.equals.
