Command: workflow plan forkable-example-owner
Created: 2026-10-19
Base:    e1a571b
Inputs:  .workflow/forkable-example-owner/brainstorm.md @ 7c1c018
Status:  complete

Docs read: design.md §System (footer Ft2: inline credits and links) · PRODUCT.md absent
Size: code 1,329 · tests 743 · ratio 0.56 · largest touched pages.mjs 453, build-comparison-evidence.mjs 299, home.mjs 281 · over 1,000: none
Decisions: 1a drop CI git-diff step, accept dirty public/ locally until U8 · 2a admin and 404 get a credit-only footer · 3a leak scan runs only for examples/owner, else prints skipped · 4a tickets approved

## Execution state
T1–T4 done; patch C1-T1 done. Next: C1-T2 at high effort, then review.
Pending: none. C1-T1 checkpoint 418ac00 pushed; CI success, receipt c1-t1-verification.md.
T1 @ 023e92f · private source copy @ 5699413
T2 @ 95eae04 · private golden exceptions @ ae5d654
T3 @ 28d4fc6
T3 @ 150b701 · CI privacy-fixture correction
T4 @ 83fbf99
writer: GPT-6.1 Sol · T1 xhigh; T2–T4 high
Session 1: T1
Session 2: T2, T3, T4 handoff
Session 3: T4
Session 4: C1-T1
Verification receipts: t1-verification.md, t2-verification.md, t3-verification.md, t4-push-ci.md, c1-t1-verification.md. Private repo untouched in Session 4.

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | `sync-public-data.mjs:27-34` copies all ten sources from engine `data/`; `main()` is not exported. | T1 exports `syncPublicData({ root, ownerRoot })`, reads `<ownerRoot>/data/`, writes engine `public/` and `src/data/`. |
| F2 | `writeComparisonEvidence` (`build-comparison-evidence.mjs:78-84`) resolves sources against the engine root, not the owner root. | T1 adds `sourceRoot` (default: the engine root, so `comparison-evidence.test.mjs:38` stays as is); sync passes the owner root. |
| F3 | `buildSite` defaults `dataRoot` to engine `data/` (`build-site.mjs:50`); `golden.mjs:37` relies on that default. | T1 changes the default to `<ownerRoot>/data`; golden then reads the owner's copy. |
| F4 | `examples/owner/comparison-evidence.json` has `items: []`, so Ada's build proves no evidence path. | T1 gives Ada 3 items (cv, overview, projects headings in her data). |
| F5 | `agent-cv-private/data/` tracks only the six private files; it has an uncommitted owner edit to `data/faq.md`. | T1 commits John's four public sources there; that commit must not include `faq.md`. |
| F6 | `npm run check` runs `sync:data`, never `sync:owner`; CI has no sibling, so it already falls back to `examples/owner` with `bootstrap:data`'s six files. | Once T1 reads all ten from the owner root, CI needs no bootstrap step (B7). |
| F7 | `ci.yml:24` runs `git diff --exit-code` on tracked `public/*.md`; an Ada sync rewrites them with Ada's text. | T3 drops that step. Locally, an Ada check leaves `public/` dirty until U8 untracks it (decision 1). |
| F8 | 8 pages have a `<footer>`; `renderAdmin` (`pages.mjs:347`) and `renderNotFound` (`pages.mjs:437`) have none. | T2 gives those two a footer holding only the credit (decision 2). |
| F9 | Reuse: `sourceLink` (`html.mjs:68`) is the nearest link helper; no credit or upstream constant exists. `golden.mjs` `listFiles` (`:22`) and `build-site.mjs:16` are near-copies of a recursive file lister. | T2 adds `UPSTREAM_URL` and `credit()` beside `sourceLink`. T3's scan reuses `listFiles` exported from `build-site.mjs`; no third copy. |
| F10 | Golden exceptions need exact before/after digests and a reviewed diff (`golden.mjs:85-100`); each footered page changes. | T2 adds 10 entries (all `site/**/index.html` + `404.html`) to `agent-cv-private/golden-exceptions.json`. |
| F11 | No John text in `site/assets/`, `src/*.js` or the templates (grep); John shows up only through owner data. | T3's scan of Ada's output should come back clean once T1 lands. |
| F12 | Memory `test-on-example-owner-bundle`: the last run pushed with CI red. | T4 reads CI on both pushes before it is done. |

## Tickets

### T1 — Ada and John each build from their own root
Delivers: B1, B2, B6 · Blocked by: none · Lane: contract
Budget: code +50 · tests +70 · why: temp-root fixtures for both owners
Seam: `syncPublicData({ root, ownerRoot })`; `npm run golden:diff`
Accept:
- [x] `syncPublicData` into a temp root from `examples/owner` → `public/cv.md` contains "Ada Example"; all ten land in `src/data/` (B1)
- [x] same sync → `public/evidence.json` has 3 items, each id from Ada's manifest (B6)
- [x] Ada's six private-slot files are the ones in `examples/owner/data/`, and none contains "john" (case-insensitive) (B6)
- [x] an owner root missing `data/cv.md` → sync rejects with a message naming `cv.md`; nothing is written (B1)
- [x] John's root, after the four files are copied → `npm run golden:diff` exits 0 with no unlisted line (B2)
Verify: `node --test test/sync-public-data.test.mjs test/sync-owner.test.mjs test/comparison-evidence.test.mjs && npm run golden:diff` (pre: new file; golden:diff exit 0)
Skills: none
Status: done @ 023e92f
Writer: GPT-6.1 Sol

### T2 — every page credits Agent CV
Delivers: B5 · Blocked by: T1 · Lane: logic (UI: human tries it before commit)
Budget: code +35 · tests +30
Seam: `renderSite({ owner, site })` for Ada and John
Accept:
- [x] every `*.html` key of `renderSite` for Ada and for John → its last `<footer>` holds `<a href="${UPSTREAM_URL}" target="_blank" rel="noopener noreferrer">Built with Agent CV</a>` (B5)
- [x] `UPSTREAM_URL` is defined once: `grep -rn "github.com/johnviklund/agent-cv" site/templates scripts` → 1 hit (B5)
- [x] John's root → `npm run golden:diff` exits 0, with exactly 10 accepted footer exceptions (B5, D6)
Verify: `node --test test/site-rendering.test.mjs && npm run golden:diff` (pre: 15 passed; golden:diff exit 0)
Skills: none
Status: done @ 95eae04
Writer: GPT-6.1 Sol

### T3 — CI builds Ada and fails on any trace of John
Delivers: B3, B4, B7, B8 · Blocked by: T1, T2 · Lane: logic
Budget: code +60 · tests +60 · why: one injected-leak case per scanned folder
Seam: `scanForLeaks(dirs)` in `scripts/check-leaks.mjs`; its CLI step in `npm run check`
Accept:
- [x] Ada's real `build/site/`, `public/`, `src/data/` → `scanForLeaks` returns `[]`; `UPSTREAM_URL` is stripped before matching (B3)
- [x] "John" injected into one file in each of the three folders → one finding naming that file; the CLI exits 1 (B4)
- [x] `AGENT_CV_OWNER_ROOT=examples/owner npm run check` → exits 0 and prints "Leak scan: 0 findings" (B3)
- [x] `ci.yml` parsed → the build step env sets `AGENT_CV_OWNER_ROOT: examples/owner`; no `bootstrap:data` step and no `git diff` step (B7)
- [x] `deploy` refusal tests in `test/owner.test.mjs` → 7 passed, unchanged (B8)
Verify: `node --test test/check-leaks.test.mjs test/ci-workflow.test.mjs test/owner.test.mjs` (pre: new file; owner.test 7 passed)
Skills: none
Status: done @ 28d4fc6
Writer: GPT-6.1 Sol

### T4 — push both repos and read CI
Delivers: B7 · Blocked by: T3 · Lane: operator · Runner: agent after approval · Risk: cheap
Budget: code +0 · tests +0
Seam: `git push` of engine `main` and `agent-cv-private` (four sources + 10 exceptions, never `data/faq.md`)
Accept:
- [x] receipt shows both pushed shas, `agent-cv-private` diff names no `faq.md`, and the CI run on the engine sha is `success` (B7)
Verify: receipt: receipts/t4-push-ci.md — CI conclusion success · faq.md absent (pre: no receipt)
Skills: none
Status: done @ 83fbf99
Writer: GPT-6.1 Sol

## Coverage
- Outcome: Ada builds complete → T1 · leak check fails on John → T3 · footer on every page → T2 · CI on Ada → T3, T4
- B1 → T1 · B2 → T1 · B3 → T3 · B4 → T3 · B5 → T2 · B6 → T1 · B7 → T3, T4 · B8 → T3
- Out of scope: `npm run setup`, README, USERGUIDE → untouched (run 2) · tree-wide leak check, deleting engine `data/` and `public/`, `bootstrap:data`, `examples/private-data/` → untouched (U8) · repo rename → untouched · C1-2/C1-3 → untouched

## Risks
- T1 is the riskiest: it moves where every build reads its sources. If John's private repo lacks the four files, his local `check` breaks; T1 copies them first.
- `build-cv-pdf.mjs:54` still reads engine `data/cv.md` for deploy. It matches John's copy until U8 (noted, not changed).
- Not chosen: building Ada in a temp dir inside every `check`. Slower, and it duplicates `golden.mjs`'s temp build.

## TODO impacts
none named by the brief

## Product doc impacts
design.md — no changes (the credit fits Ft2 "inline credits and links") · PRODUCT.md, ROADMAP.md absent

## Deviations
- T1: golden and OG-image test owners now carry public sources. Empty-manifest coverage uses an explicit empty fixture; Ada now has three evidence items. Assertions remain 33, 13, and 14 respectively. No assertion removed or weakened.
- Ratio waived: T1 — three regression tests need temporary owner and engine roots; +64 test lines cover all ten files, evidence, missing-source refusal, and the site default. Code adds 25 lines; no new abstraction.
- T2: two existing identity assertions strip only UPSTREAM_URL before checking for owner leaks; their patterns remain unchanged. Assertion count 56 to 58 includes two new footer-test assertions.
- T2: owner approved adding target="_blank" and rel="noopener noreferrer" to the acceptance tag. Existing external-link assertions remain unchanged.
- T3: added yaml@2.9.1 as a pinned dev dependency to parse CI configuration. Reused buildSite's file lister for scanning; no existing assertions changed.
- T4 CI correction 150b701: the privacy test reads Ada's owner data instead of ignored engine copies. Assertions remain 58; clean-checkout Ada build and John check pass.
