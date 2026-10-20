Command: workflow plan forkable-cutover
Created: 2026-10-20
Base:    fafec6c
Inputs:  .workflow/forkable-cutover/brainstorm.md @ 2df6469
Status:  complete

Docs read: none in scope (PRODUCT.md, DESIGN.md absent; design.md is rewritten by T5, not a product guard)
Size: code 65 · tests 6,340 · ratio 97.5 · largest touched test/worker.test.mjs 1334, test/comparison-core.test.mjs 595 · over 1,000: test/worker.test.mjs (literal swaps only, no prefactor)
Decisions: 1b delete artifacts/qa (unused, not kept anywhere) · 2a port John-only tests to Ada where Ada has the content, delete the rest · 3a README credit line "Maintained by John Viklund. johnviklund.com is one deployment." · 4a tickets approved 2026-10-20 · 5a one run kept
Split declined by human: 2026-10-20

## Execution state
Current: T5 todo; T1–T4 complete. Engine checkpoint push deferred to the approved T7 operator gate.
T1 @ 70887fd (engine receipt; private commit 4ec3ba4, pushed).
T2 @ 129f4c7
T3 @ cbce676
T4 @ d859042
writer: GPT-6.1 Sol · high; live catalog confirms the primary is available.
Session 1: T1 (operator handoff prepared; no private writes).
Session 2: T1 (1a/2a approved; private write blocked by two permission-review timeouts).
Session 3: T1 (elevated read probe and private copies succeeded; staging timed out twice; no private commit/push).
Session 4: T1, T2, T3 (private commit/push complete; engine cutover and fixture rewrite verified).
Session 5: T4 (maintenance/comparison tests verified on both owners).
Baseline: npm run check passes outside sandbox, 322 pass / 3 skipped; sandbox child processes hit EPERM.
Golden baseline: exit 0, 19 accepted file differences; owner approved correction with 2a on 2026-10-20.
Uncommitted implementation: none; T1 private commit 4ec3ba4; receipts/t1-private-repo.txt.
Private HEAD: 4ec3ba4, pushed; only data/faq.md modified, original bytes retained.
## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | Precondition D2 shipped (forkable-setup wrapped @ fafec6c). `bootstrap:data` remains in package.json:21, the `check` list, AGENTS.md:27, USERGUIDE.md:56,82,109-117. AGENTS.md already says "the owner" elsewhere | T2 deletes script, test and package entries; T5 edits AGENTS.md:23,27 and USERGUIDE |
| F2 | 181 John lines across 25 test files (brief said ~230); worker.test.mjs is 1,334 lines | T3/T4 swap literals; no prefactor, the structure does not change |
| F3 | Tests read engine `data/`: cv-pdf.test:28,78,104 · repository-grounding.test:15 · codex-project-refresh.test:14; execute's full check also found owner-manifests.test:27 copying dynamically assembled engine paths | T2 uses selected owner paths; owner-manifests uses its existing explicit Ada fixture |
| F4 | comparison-fixtures.test:38 and static-contract.test:74 read `docs/webmcp-challenge-submission.md`; README:39-51 is the WebMCP section linking it | T2 drops the doc assertions with the doc; T5 drops the README section |
| F5 | 8 tests run only on John's bundle: contact.test:29,45 · repository-grounding:78,95 · static-contract:95 · comparison-core:209 · og-image:86 · site-rendering:20 | Decision 2a: T3/T4 port each to Ada where Ada has the content, else delete; golden diff pins John's bytes |
| F6 | The upstream slug is product, not a leak: `UPSTREAM_URL` html.mjs:73 (footer credit), README:73 and USERGUIDE:16 fork commands | Allowlist the slug `johnviklund/agent-cv` anywhere, not only the URL |
| F7 | check-leaks.mjs:22 returns early unless the owner is `examples/owner`, and scans only output dirs; its regex is itself a John literal | T6: tracked scan always runs, output scan stays Ada-only; `scripts/check-leaks.mjs` is allowlisted; its test builds names by concatenation (D3) |
| F8 | B8's `git archive` has no `.git`, so `git ls-files` cannot run there | B8 uses `git clone` of local HEAD into a temp dir (memory: test-on-example-owner-bundle); the scan exits 1 "not a git checkout" outside git; CI's actions/checkout has `.git`. Binaries (NUL byte) are skipped |
| F9 | `artifacts/qa/` tracks a QA report and 10 screenshots of John's site; a text scan cannot see pixels | Decision 1b: T2 deletes it; T1 does not move it |
| F10 | verify-agent-cv has landed (tree clean); SKILL.md:21 and features/ask-chat.md:15 ask "What does John do?" | Brief's `.gitignore` out-of-scope item is moot; T2 edits `.gitignore`, T5 the skill |
| F11 | `public/` (5 files) is sync output yet tracked; `src/data/` is already ignored, so tests already need `sync:data` first | T2 ignores `/public/` and `/data/`; B4's `npm test` runs after a sync, as `npm run check` does |
| F12 | agent-cv-private `data/{cv,overview,projects,repositories}.md` are byte-identical to engine `data/`; execute baseline `golden:diff` passes with 19 accepted file differences, not the planned eight. It also has an uncommitted `data/faq.md` change; its AGENTS.md calls the public repo canonical | B5 is checkable before and after T2; T1 commits named paths only, never `faq.md`, and rewrites its AGENTS.md |
| F13 | John's `repositories.md`:74 quotes the engine README as evidence | README rewrite reaches John's evidence at his next `sync:repositories`, not in this run; golden unaffected |
| F14 | Reuse: `scanForLeaks` and `listFiles` (check-leaks.mjs:11, build-site.mjs) · `resolveOwnerRoot` (owner.mjs:18) · `ADA`/`ELISE` (test/fixtures/owners.mjs:27,30) · no git helper in `scripts/` (only `execFileSync` for Chromium) | T6 extends `scanForLeaks`, calls `git ls-files -z` via `execFileSync`; T3 replaces `JOHN` with a fictional `GRACE` beside `ADA` |

## Tickets

### T1 — agent-cv-private holds John's docs and operator rules
Delivers: B6 · Blocked by: none · Lane: operator · Runner: agent after approval · Risk: cheap
Budget: code +0 · tests +0
Seam: `git -C ../agent-cv-private`
Accept:
- [x] private HEAD adds `docs/webmcp-challenge-submission.md` and both `docs/plans/*.md`, byte-equal to engine copies; no `artifacts/` (B6)
- [x] private `AGENTS.md` has "When John asks" operator rules: deploy with `AGENT_CV_OWNER_ROOT`, `golden:diff` before engine changes; no "canonical in the public repo" line (B6)
- [x] `data/faq.md` still uncommitted; `git status -sb` shows `main...origin/main` with no ahead count (B6)
Verify: receipt: receipts/t1-private-repo.txt — commit sha · 3 docs + AGENTS.md · faq.md ` M` · ahead 0 (pre: no receipt)
Skills: none
Status: done @ 70887fd
Writer: GPT-6.1 Sol

### T2 — the engine tree drops John's sources, outputs and bootstrap
Delivers: B1, B5 · Blocked by: T1 · Lane: logic
Budget: code +10 · tests +40 · why: the tree is asserted by a new test; deleted files are not counted
Seam: `git ls-files`; new `test/tracked-tree.test.mjs`; `npm run golden:diff`
Accept:
- [x] `git ls-files data public examples/private-data docs artifacts scripts/bootstrap-example-data.mjs test/bootstrap-example-data.test.mjs` → empty (B1)
- [x] package.json has no `bootstrap:data` script and no `bootstrap-example-data` in `check` (B1)
- [x] `.gitignore` lists `/data/` and `/public/`; after `npm run sync:data`, `git status --short` is empty (B1)
- [x] cv-pdf, repository-grounding and codex-project-refresh tests read `<owner root>/data/` and pass for Ada and for the sibling (B1)
- [x] `AGENT_CV_OWNER_ROOT=../agent-cv-private npm run golden:diff` → exit 0, the same 19 accepted exceptions, nothing else (B5)
Verify: `node --test test/tracked-tree.test.mjs test/cv-pdf.test.mjs test/repository-grounding.test.mjs test/codex-project-refresh.test.mjs test/comparison-fixtures.test.mjs test/static-contract.test.mjs` (pre: 27 pass, 1 skipped · tracked-tree new file)
Skills: none
Status: done @ 129f4c7
Writer: GPT-6.1 Sol

### T3 — Worker, deploy, site and PDF tests run on Ada and a fictional owner
Delivers: B4 · Blocked by: T2 · Lane: logic
Budget: code +0 · tests +120 · why: test-only rewrite; John literals become `GRACE`/`ADA` fixture reads
Seam: `test/fixtures/owners.mjs`; the 11 test files in Verify
Accept:
- [x] `git grep -ciE 'john|viklund'` over `test/fixtures` and the 11 files → no output (B4)
- [x] `GRACE` keeps `JOHN`'s field shape (custom domain, 3 hosts, archive id, vars), so wrangler-config still covers a custom-domain owner (B4)
- [x] Verify passes with `AGENT_CV_OWNER_ROOT=examples/owner` and with the sibling: 0 failures both (B4)
Verify: `node --test test/worker.test.mjs test/wrangler-config.test.mjs test/owner-runtime.test.mjs test/chat-core.test.mjs test/contact.test.mjs test/setup-admin.test.mjs test/browser-owner.test.mjs test/og-image.test.mjs test/site-rendering.test.mjs test/golden.test.mjs test/cv-pdf.test.mjs` (pre: 120 pass, 2 skipped)
Skills: none
Status: done @ cbce676
Writer: GPT-6.1 Sol

### T4 — maintenance and comparison tests carry no John
Delivers: B4 · Blocked by: T3 · Lane: logic
Budget: code +0 · tests +90 · why: test-only rewrite
Seam: the test files in Verify
Accept:
- [x] `git grep -ciE 'john|viklund' -- test` → no output (B4)
- [x] repository fixtures use `example/…` slugs; refusal tests still prove the owner name is dropped, read from the fixture (B4)
- [x] `AGENT_CV_OWNER_ROOT=examples/owner npm run check` and sibling `npm test` → 0 failures (B4)
Verify: `node --test test/project-review.test.mjs test/repository-grounding.test.mjs test/review-conversations.test.mjs test/conversation-review.test.mjs test/comparison-*.test.mjs test/webmcp.test.mjs test/static-contract.test.mjs test/maintenance-docs.test.mjs test/sync-public-data.test.mjs test/check-leaks.test.mjs && ! git grep -qiE 'john|viklund' -- test` (pre: 136 pass, 1 skipped · grep rc=1)
Skills: none
Status: done @ d859042
Writer: GPT-6.1 Sol

### T5 — engine docs, skills and memory speak of "the owner"
Delivers: B7 · Blocked by: T1, T2 · Lane: logic
Budget: code +0 · tests +15 · why: docs are receipts by rule; the test pins the new wording
Seam: `test/maintenance-docs.test.mjs`
Accept:
- [ ] `git grep -iE 'until U8|engine .data/. retains|bootstrap:data|examples/private-data'` in AGENTS.md README.md USERGUIDE.md .agents design.md memory → none (B7)
- [ ] `git grep -iE 'john|viklund'` in AGENTS.md USERGUIDE.md .agents design.md memory → none (B7)
- [ ] README opens as the open-source Agent CV engine; John appears only on the maintainer credit line and in `johnviklund/agent-cv`; WebMCP section gone (B7)
- [ ] verify-agent-cv recipes ask "What does Ada do?"-style owner-neutral questions and still run (B7)
Verify: `node --test test/maintenance-docs.test.mjs test/codex-project-refresh.test.mjs test/codex-conversation-review.test.mjs && ! git grep -qiE 'until U8|bootstrap:data|examples/private-data' -- AGENTS.md README.md USERGUIDE.md .agents design.md memory` (pre: 4 pass · grep rc=1)
Skills: .agents/skills/verify-agent-cv/SKILL.md
Status: todo

### T6 — the leak check scans the tracked tree and a clean clone builds as Ada
Delivers: B2, B3, B8 · Blocked by: T2, T3, T4, T5 · Lane: logic
Budget: code +40 · tests +45 · why: one fixture repo per allowlist rule
Seam: `scanForLeaks`/`scanTrackedFiles` and the `scripts/check-leaks.mjs` CLI with no args
Accept:
- [ ] this tree, no args, sibling owner → `Leak scan: 0 findings` for tracked files; output scan skipped (B2)
- [ ] temp git repo with a tracked `notes.txt` containing "Jo"+"hn" → exit 1, stderr names `notes.txt` (B3)
- [ ] same repo: LICENSE copyright line, README credit line, `johnviklund/agent-cv`, `.workflow/x.md`, `WORKLOG.md`, a NUL-byte file → 0 findings (B2)
- [ ] outside a git checkout → exit 1 with "not a git checkout" (B2)
- [ ] `git clone` of HEAD to a temp dir, `npm ci`, `npm run check` → exit 0, `Leak scan: 0 findings` (B8)
Verify: `node --test test/check-leaks.test.mjs && node scripts/check-leaks.mjs`; receipt: receipts/t6-clean-clone.txt — check exit 0 (pre: 2 pass · CLI skipped)
Skills: none
Status: todo

### T7 — push the engine and read CI on the example owner
Delivers: B4, B8 · Blocked by: T6 · Lane: operator · Runner: agent after approval · Risk: cheap
Budget: code +0 · tests +0
Seam: `git push origin main`; `gh run watch`
Accept:
- [ ] CI run for the pushed sha → conclusion `success`, log shows `Leak scan: 0 findings` (B4, B8)
Verify: receipt: receipts/t7-ci.txt — sha · run id · success (pre: no receipt)
Skills: none
Status: todo

## Coverage
- Outcome → T6 (clean clone check) · T2 (golden diff) · T7 (CI)
- B1 → T2 · B2 → T6 · B3 → T6 · B4 → T3, T4, T7 · B5 → T2 · B6 → T1 · B7 → T5 · B8 → T6, T7
- Out of scope: deploy and live checks → forkable-live-verify · setup/README "Create your own" → untouched · history rewrite, rename → untouched · `.gitignore` verify item → moot (F10)

## Risks
T2 is riskiest: a missed engine-root read fails only on a clean clone (T6), so T2 runs both owners. README rewrite reaches John's evidence on his next sync (F13). Not taken: a `test/` allowlist (D3).

## Deviations
T4 retires the personal career-subrole and repository-list snapshots under decision 2a, ports project layout and privacy tests to Ada, and drops three privacy phrases absent from Ada. Assertion changes and counts: receipts/t4-verification.md.
T2 baseline discrepancy: owner approved 2a on 2026-10-20, correcting eight to 19 existing accepted file differences. Exception set unchanged; sha256 8fb34630ba97f44e0ae48f9a8f084efaec54ddce42ba60c894b58a2cd98660bd.
T2 also fixes owner-manifests.test.mjs's engine-data copy found by npm run check. Existing assertion changes and counts are recorded in receipts/t2-verification.md; retired document assertions follow F4, while CV assertions use the selected owner and repository prose permits Ada's placeholder source.
T3 updates four T4 test files that import the renamed fixture, so every ticket commit keeps npm run check passing. Their remaining personal literals stay for T4; receipts/t3-verification.md records assertion counts and the snapshot removals approved by decision 2a.

## TODO impacts
none

## Product doc impacts
PRODUCT.md, DESIGN.md, ROADMAP.md absent; `design.md` loses its John framing in T5, tokens unchanged.
