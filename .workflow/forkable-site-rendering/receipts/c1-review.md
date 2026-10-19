# Cycle 1 review evidence

Reviewed 0835333 on 2026-10-19. Writer Opus 5.5; reviewer GPT-6 Astra.

## Verification
- `npm run build`: exit 0, includes `npm run check`; 247 tests, 246 passed, 1 skipped; static checks pass for ten pages; Wrangler dry-run and package check pass.
- `npm run golden:diff`: exit 0; nine exact authorized exceptions, zero unlisted differences. Frozen snapshot unchanged.
- `node --test test/site-rendering.test.mjs`: 13 passed.
- Read-only runtime/browser breadth review: 62 passed, 1 skipped; parent checked the reported call-site conclusions.
- Example-owner build in detached worktree with safe bootstrap data: `AGENT_CV_OWNER_ROOT=<worktree>/examples/owner npm run build` exits 0; 238 passed, 9 skipped.
- Existing changed test files retain their assertion counts; golden increases from 20 to 30. Approved skip/fixture changes checked against T6 deviations.
- No production `.workflow/` references or added type/lint suppression escapes.

## C1-1 reproduction
Run this from the repository root:
```js
// node --input-type=module
import { readFile } from 'node:fs/promises';
import { loadOwner, validate } from './scripts/owner.mjs';
import { renderSite } from './scripts/build-site.mjs';
const { owner, site } = await loadOwner({ root: 'examples/owner' });
const schema = JSON.parse(await readFile('schemas/site.schema.json', 'utf8'));
site.pages.about.body = [{}];
validate(schema, site, 'site.json');
console.log(renderSite({ owner, site })['about/index.html'].match(/<undefined>.*<\/undefined>/)?.[0]);
```
Observed `<undefined>undefined</undefined>`, with no validation error. Shared consumers are About, CV and each Privacy section.

## C1-2 mutation
Detached worktree at 0835333, bootstrapped safe data, generated owner module; no committed mutations.
For each mutation, restore scripts/golden.mjs, change only the named predicate, then run `node --test test/golden.test.mjs`:
- Delete `entry.path === path &&`: exit 0, all seven tests pass.
- Delete `entry.before === before &&`: exit 1, exact-record test fails.
- Replace `entry.after === after` with `true`: exit 1, exact-record test fails.
- Replace prompt-path rejection condition with `false`: exit 1, prompt-exception test fails.
All three matching keys and prompt rejection checked. Production predicate was never changed.

## Local browser
T3 collaborative preview, local Wrangler at port 8787; generated build/site.
- Desktop home inspected at 1280×800; expected copy, fonts, controls and layout present.
- Suggested-question click enters conversation; label is JOHN'S AGENT; unconfigured service displays its error and full-CV link.
- Comparison entry opens the expected role editor with two roles.
- Home and CV at 320, 414 and 768 CSS pixels: document width equals viewport width.
- Comparison at 320, 375, 414 and 768: document width equals viewport width.
- Nine existing page routes return 200; unknown route returns 404.
- Existing T6 receipt supplies twenty before/after image pairs, PDF/OG checks and comparison error-path coverage. Paths exist.
- Successful provider responses and an active application record were not exercised here. Automated application/runtime tests pass.
- Browser analytics CORS and WebMCP origin-trial warnings are environmental; no repository verify skill is available.

## Scope and state
Only review artifacts were written. Public claims, private data and frozen snapshots were not edited.
Owner checkout retains its pre-existing data/faq.md edit. No deployment occurred.
