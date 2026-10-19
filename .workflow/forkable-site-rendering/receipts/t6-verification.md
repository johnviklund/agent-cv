# T6 verification

Checked on 2026-10-19 against the uncommitted T6 tree on top of f9af39f.

- `npm run check`: 247 tests, 246 passed, 1 skipped; static checks passed for 10 pages.
- `npm run build`: exit 0, including the Wrangler dry-run with `assets.directory` `./build/site`.
- `npm run golden:diff`: exit 0; 9 accepted (8 from T5 plus `wrangler.jsonc`), nothing unlisted. `experience/index.html` matches the frozen snapshot after the ampersand rule (decision 1b).
- Owner-less CI simulation: a copy of the tree with no sibling owner root, `npm run bootstrap:data && npm run build`: exit 0; 247 tests, 238 passed, 9 skipped (John-content tests); static checks passed for the example owner.
- `npm run build:cv-pdf`: built build/site/john-viklund-cv.pdf, 2 pages, 79 KB.
- `npm run build:og-image`: rebuilt site/assets/og-image.png byte-identical to the committed file.
- Mutation: dropping the site/assets copy from buildSite turns 2 site-rendering tests red.

## Browser (npm run dev on build/site, no OpenAI key, no paid calls)

- 24 routes and assets return 200 (ten pages, fonts, tokens, scripts, evidence, contract, OG image, favicon, template, Markdown, discovery); /no-such-page returns 404.
- Screens: 10 routes × desktop 1280×800 and mobile 375×812, before (public/) and after (build/site). All 20 pairs differ by 0 pixels at 2% fuzz. Files: screens/T6-<route>-<desktop|mobile>-<before|after>.jpg; script: scripts/screens.sh.
- Chat: question submitted; agent label renders `<span aria-hidden="true"></span><strong>JOHN'S AGENT</strong>`; /api/ask 503 shows "The chat service is not configured yet." with the full-CV link.
- Comparison: one role submitted; /api/compare 503 shows "Comparison unavailable" and "The comparison service is not configured yet." with Try again. An empty second role is stopped client-side first, as before.
- Application: /a/<unknown slug> returns the Worker's 410 "expired or revoked"; /application/ serves with the data-owner-* attributes and application.js. A live application link needs an admin-created record, not available locally.
