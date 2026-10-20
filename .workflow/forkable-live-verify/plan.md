Command: workflow plan forkable-live-verify
Created: 2026-10-20
Base:    6614dd1
Inputs:  .workflow/forkable-live-verify/brainstorm.md @ 90434e2
Status:  complete

Docs read: none in scope (no PRODUCT.md/DESIGN.md user surface changes; AGENTS.md §Verification, §Data boundaries, §Generated resources)
Size: code 100 · tests 175 · ratio 1.75 · largest touched: test/sync-owner.test.mjs 175, scripts/sync-owner.mjs 100, USERGUIDE.md 203 (T3; T1 run-folder only; reused read-only: scripts/owner.mjs 125, scripts/cv-pdf.mjs 123, site/assets/comparison-contract.js) · over 1,000: none
Decisions: 1a (approve T1, T2 as listed) · re-plan 2026-10-20 after T2 preflight: 1a (approve T3, T2 as listed) · 2a (owner commits or discards data/faq.md before T2)

## Execution state
Session 1: T1 complete; T2 handoff prepared, awaiting exact-scope approval.
Session 2: T2 approved via 1a; push succeeded; preflight failed before deployment.
T1 @ bb6f3f4
writer: GPT-6.1 Sol · high
Baseline: npm run check passed outside sandbox; sandbox subprocess EPERM only.
Final: npm run build passed, including check; 321 tests passed, 2 skipped.
Current: T2 awaiting-human; receipts/t2-preflight-failure.md records the failed Verify.
Pending: re-plan guard correction; no deployment, paid request or rollback ran.
Re-plan (Opus 5.5): T3 added as T2's prerequisite; T2 resets to the full preflight.

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | Live today already serves `/llms.txt`, `/cv.md`, `/sitemap.xml`, `/AGENTS.md` byte-equal to local `build/site` (probe 2026-10-20) | B2 alone cannot tell the new deploy from the old one; T2 also checks the Version ID from deploy output is the one at 100% in `wrangler deployments status` |
| F2 | Live probe: `/api/health` → `{"ok":true,"configured":true}`; PDF 200 `application/pdf`; admin conversations/stats → 401; `/evidence.json` digest `sha256:af32d4…` | Every live state the acceptance lines name exists today; T1's baseline run records them as "before" |
| F3 | Node `fetch` sends `sec-fetch-mode: cors`; `validateComparisonAccess` (src/comparison-handler.js:175) then rejects a request with no `Origin` as 403 | The script sends `Origin: <owner.site.origin>` on `POST /api/compare` |
| F4 | `/api/compare` needs ≥2 roles `{title, description}`, each with an assessable requirement sentence; reply is JSON checked by `validateComparisonResult` (site/assets/comparison-contract.js:387) against the `/evidence.json` digest | B6 is checked with the consumer's own validator, not "some JSON came back" |
| F5 | Public SSE types are `response.output_text.delta`, `response.completed`, `response.incomplete`, `error` (src/openai-stream.js:124-167); last two are failures | B5 passes only on deltas + final `response.completed`; any other type (raw provider event) fails |
| F6 | `normalizeSource` accepts `[a-zA-Z0-9_./-]` (src/chat-core.js:147) | The chat request sends `source: "live-verify"` so its 90-day archive record is identifiable |
| F7 | Reuse: `loadOwner` (scripts/owner.mjs:98) gives `site.origin` + `slug`; `countPdfPages` (scripts/cv-pdf.mjs:121); `normalizeComparisonRequest`/`validateComparisonResult` (comparison-contract.js:369,387). SSE parser: `site/assets/stream.js` exports only text-level helpers, no event types → none reusable | Script imports these; writes only a ~10-line SSE type reader |
| F8 | Brief D4 says "`scripts/`"; engine `scripts/` is generic tracked engine code, and `check-leaks.mjs` skips `.workflow/` (line 23) | Script lives in the run folder: `.workflow/forkable-live-verify/scripts/live-check.mjs`; no engine file changes |
| F9 | `node --test` (npm test) skips dot folders (checked) | A `_test.mjs` beside the script stays out of `npm test` and CI |
| F11 | The deploy guard (scripts/sync-owner.mjs:25-40, from fae8fe6) walks the whole owner root except `.git`; the only hit in `agent-cv-private` is `docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md` | The guard over-reaches: docs never deploy. Its origin plan (forkable-setup F5) aimed it at `owner.json`, `site.json`, `data/`, the social image |
| F12 | What a deploy reads from the owner root: `owner.json`, `site.json` (owner.mjs:104-105), `data/*` (sync-public-data.mjs:25, build-site.mjs:58, build-cv-pdf.mjs:54), `assets/og-image.png` (build-site.mjs:52), `comparison-evidence.json` (build-comparison-evidence.mjs:83), `repositories.json` (sync-github-repositories.mjs:18). Not read: `docs/`, `README.md`, `AGENTS.md`, `golden/`, `conversation-reviews/` | T3 scans exactly these deploy inputs (the four files plus `data/` and `assets/` recursively); a missing one is skipped. Reuse: none found, the walk is the only copy |
| F13 | `agent-cv-private` has an uncommitted change to `data/faq.md` (contents not read); deploy builds from the working tree | T2 would ship content the owner has not committed; T2 now requires a clean private tree and records its sha |
| F10 | `wrangler whoami` is logged in; `/usr/bin/chromium` exists for `build:cv-pdf`; deploy refuses the example owner (scripts/owner.mjs:100) | T2 needs no human credential step |

## Tickets

### T1 — live-check script, proven read-only against today's live site
Delivers: prefactor for T2 (checks for B2, B3, B4, B5, B7) · Blocked by: none · Lane: logic
Budget: code +130 · tests +40
Seam: `node .workflow/forkable-live-verify/scripts/live-check.mjs [--get-only] --out <receipt>`; `readSseTypes` exported for the self-test
Accept:
- [x] self-test: stream of deltas + `response.completed` → pass; adds `response.output_item.added` → fail naming that type; no `response.completed` → fail (B5)
- [x] `--get-only` on live → exit 0; receipt shows 4 rows `live sha256 == build/site sha256` for llms.txt, cv.md, sitemap.xml, AGENTS.md (B2)
- [x] same receipt: `/<slug>-cv.pdf` 200 · `application/pdf` · pages 1–2 by `countPdfPages` (B3)
- [x] same receipt: health body exactly `{"ok":true,"configured":true}`; both admin routes 401 with no token (B4, B7)
- [x] `--get-only` sends no POST (receipt lists every request: 8 GETs, 0 POSTs)
Verify: `node --test .workflow/forkable-live-verify/scripts/live-check_test.mjs && node .workflow/forkable-live-verify/scripts/live-check.mjs --get-only --out .workflow/forkable-live-verify/receipts/live-baseline.md` (pre: new file)
Skills: none
Status: done @ bb6f3f4
Writer: GPT-6.1 Sol

### T3 — deploy guard scans only deploy inputs
Delivers: prefactor for T2 · Blocked by: none · Lane: logic
Budget: code +12 · tests +18 · why: one parametrized case per input class; prefactor T2 is blocked on
Seam: `syncOwner({ sourceRoot, destinationRoot, deploy: true })` in test/sync-owner.test.mjs; `npm run sync:owner -- --deploy`
Accept:
- [ ] "Ada Example" only in `docs/plans/x.md`, `README.md`, `golden/x.html` → deploy sync resolves, slug `fixture-owner`, six private files copied
- [ ] one case each: "Ada Example" in `data/notes/deep.md`, `repositories.json`, `comparison-evidence.json` → rejects naming that path; engine `data/` unchanged
- [ ] existing case kept: `data/cv.md` + `site.json` text → rejects naming both; example `assets/og-image.png` → rejects naming it
- [ ] `AGENT_CV_OWNER_ROOT=../agent-cv-private npm run sync:owner -- --deploy` → exit 0 (dry, copies only the six ignored files)
- [ ] USERGUIDE.md step 4 says the refusal covers deploy inputs: `grep -c "owner.json, site.json, data/" USERGUIDE.md` → 1
Verify: `node --test test/sync-owner.test.mjs && AGENT_CV_OWNER_ROOT=../agent-cv-private npm run sync:owner -- --deploy` (pre: 10 passed; sync exit 1 naming docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md)
Skills: none
Status: todo

### T2 — deploy from the cutover engine and verify live
Delivers: B1, B2, B3, B4, B5, B6, B7 · Blocked by: T1, T3 · Lane: operator · Runner: agent after approval · Risk: irreversible
Budget: code +0 · tests +0
Seam: `npm run deploy`, `wrangler deployments status`, live-check full mode
Handoff (one approval covers all): `AGENT_CV_OWNER_ROOT=../agent-cv-private` set; (0) `git -C ../agent-cv-private status --porcelain` empty, record its sha; (1) `npx wrangler deployments status --name john-viklund-agent-cv` → record previous version (rollback); (2) dry run `npm run sync:owner -- --deploy && npm run build`; (3) `npm run deploy`; (4) status again; (5) `live-check.mjs --out receipts/live-verification.md` (1 chat + 1 compare). Rollback: `npx wrangler rollback <previous version> --name john-viklund-agent-cv`
Accept:
- [ ] private tree clean at deploy, sha recorded; dry run exits 0; deploy exits 0; its Version ID == the version at 100% in step 4, ≠ previous (B1)
- [ ] 4 rows live sha256 == build/site after deploy; PDF 200 · `application/pdf` · 1–2 pages · sha256 == build/site copy (B2, B3)
- [ ] health exactly `{"ok":true,"configured":true}`; both admin routes 401 (B4, B7)
- [ ] ask: 200 `text/event-stream`, types ⊆ {delta, completed}, last `response.completed`, answer text non-empty (B5)
- [ ] compare: 200 and `validateComparisonResult` passes with the live `/evidence.json` digest; 2 roles in result (B6)
Verify: receipt: receipts/live-verification.md — deploy exit 0 · version match · 4/4 sha · pdf ok · health ok · ask completed · compare valid · admin 401 ×2 (pre: no receipt)
Skills: none
Status: awaiting-human
Handoff receipt: receipts/t2-deploy-handoff.md; approved 1a, preflight failed (receipts/t2-preflight-failure.md). After T3, re-issue the handoff with step (0); the earlier approval does not carry over.

## Deviations
- T2: sync:owner --deploy exited 1 because its whole-owner scan rejects fictional example-owner references in historical docs/plans. T2 cannot pass as written without a prerequisite correction. Stop and return to plan; the guard was not bypassed. Re-plan: T3.

## Coverage
- Outcome → T2 (receipts/live-verification.md on the live site)
- T3 → prefactor for T2 (guard) · B1 → T2 · B2 → T1, T2 · B3 → T1, T2 · B4 → T1, T2 · B5 → T1, T2 · B6 → T2 · B7 → T1, T2
- Out of scope: fork deploy to a throwaway Worker → untouched · admin export with token → untouched · verify-agent-cv live mode → untouched · TODO forkable-maintenance-tooling C1-2 → untouched · cutover P3s C1-3, C1-4, C2-1 → untouched

## Risks
T2 is the risk: a deploy that builds from a wrong owner root or stale `src/data` would replace the live site; dry run + version check + rollback line cover it.
Outside its files: the chat and compare calls spend 2 of the monthly caps and write two 90-day archive records (tagged `live-verify`).
Not taken: a verify-agent-cv live-target mode (D4); a `docs/` denylist in the guard (misses the next non-deployed folder).
T3 narrows a safety guard: its reject cases for every deploy input stay in the test.

## TODO impacts
none

## Product doc impacts
- No PRODUCT.md, DESIGN.md or ROADMAP.md changes; `design.md` — no changes.
- USERGUIDE.md step 4: "refuses files containing `Ada Example`" becomes "refuses deploy inputs (owner.json, site.json, data/, assets/, repositories.json, comparison-evidence.json) containing `Ada Example`" (T3).
