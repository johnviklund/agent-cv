# Cycle 1 verification

Reviewed a92f56a against plan base c3d344a on 2026-10-19. GPT-6.1 Sol xhigh performed independent read-only code review; GPT-6 Astra reproduced both findings and ran these checks.

## Checks
- `npm run check`: 276 passed, 3 skipped, 0 failed; static checks pass for 10 pages. First sandbox run failed two test files without useful diagnostics; rerun with subprocess access passes.
- `npm run build`: passes, including tests, Wrangler dry-run and 23-module package validation. No deployment.
- `AGENT_CV_CHROMIUM_TESTS=1 node --test test/og-image.test.mjs test/cv-pdf.test.mjs`: 11 passed, 0 skipped. John's regenerated card equals his committed card byte for byte.
- `npm run golden:diff`: passes, nine existing accepted differences, no unlisted difference. No baseline or exceptions edits.
- Disposable detached worktree at a92f56a, under /tmp without a sibling owner checkout: `npm run bootstrap:data` then `npm run build` pass using Ada's owner and empty manifests.
- Compared `git show c3d344a:config/{repositories,comparison-evidence}.json` with private commit f2bdbf7: both byte-identical. Private commit 739738e contains the social card migration. Private data/faq.md was already dirty and was not edited or staged.
- Generated temporary John and fictional Ada PDFs through buildCvPdf, then rendered every page with `pdftoppm -scale-to 1000 -png`: John two pages, Ada one page, no clipping/overlap; owner headings and contacts correct. Inspected committed Ada card: name, headline and ada.example visible.
- T1 receipt's zero-Chromium check and T2 receipt's pre/post John PDF text parity corroborate the current checks; no browser call was added to the normal check path.

## Mechanical review
- Diff excluding workflow and prose: code +290/-283; tests +464/-32; net +439, added-test/code ratio 1.60. Only touched file above 1,000 lines: test/worker.test.mjs, 1334.
- Existing assertion counts: admin-origin 5→10, comparison-core 72→72, comparison-evidence 21→21, comparison-fixtures 16→16, contact 17→17, cv-pdf 18→31, golden 31→33, owner-runtime 12→12, repository-grounding 24→24, review-conversations 42→45, static-contract 78→78, worker 233→233.
- Escape-hatch scan: one text match for “unsafe” in a test title; no added type/lint suppression.
- Tracked non-prose code outside .workflow/: zero references into .workflow/.
- New modules/exports have live CLI, build or test consumers. No confirmed duplicate helper or dead branch.

## Mutation tests
In the disposable worktree, changed one condition at a time in scripts/wrangler-config.mjs, ran `node --test test/wrangler-config.test.mjs`, restored the original after each test. All three mutations failed the suite:
- Invert the contact.email presence condition.
- Invert the workers.dev host exclusion.
- Invert the ARCHIVE binding selector.
No mutation or production edit was committed.

## Reproductions
C1-1: copied configure-admin-secret.mjs and admin-secret-file.mjs into a temporary engine. Prepended a fake npx executable that reads only the config name, consumes stdin and makes no network call. Selected Ada's owner root. With no config it printed `NO-CONFIG`; with `{ "name": "john-viklund-agent-cv" }` it printed `selected-worker=john-viklund-agent-cv`. Generated temporary tokens were never printed and were deleted with the fixture.

C1-2: call `buildWranglerConfig({ ...ADA, deploy: { ...ADA.deploy, vars: { CUSTOM: value } } }, base)` and inspect `JSON.parse(result).vars.CUSTOM`:
- `[ 1 ]` → `[1]`
- `The [ 1, 2 ] cases` → `The [1, 2] cases`
- `[ null ]` → `[null]`
- `[ 1. ]` → SyntaxError: Unterminated fractional number in JSON at position 3.

Search of scripts, package.json and .github found dev/build/deploy and configure-admin-secret as all executable Wrangler call sites. USERGUIDE's secret instructions have the same generation-order gap. README's config/ row is stale.
