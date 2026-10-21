Command: workflow plan brush-up
Created: 2026-10-21
Base:    ef7b4d1
Inputs:  .workflow/brush-up/brainstorm.md @ 3734878
Status:  complete

Docs read: none in scope (no PRODUCT.md; README.md in full, USERGUIDE.md and AGENTS.md headings)
Execute reads: README.md, USERGUIDE.md, AGENTS.md in full; design.md §System; relevant memory pages.
Size: code 65 · tests 173 · ratio 2.66 · largest touched test/check-leaks.test.mjs 94, scripts/check-leaks.mjs 65 · over 1,000: none
Decisions: 1a approve T1–T4 · 2a gitleaks release in /tmp, checksum-verified · 3a email stays in history (already public), tree scrub only

## Execution state
Current: T4 approved with 1a, applied and verified; committing receipt, then review ready.
T1 @ 5fe0bfa
T2 @ c675f95
T3 @ ced78db
writer: GPT-6.1 Sol · high
Session 1: T1, T2, T3
Session 2: T4
Baseline: npm run check passes outside sandbox, 326 pass, 2 skipped; 10 static pages.
Sandbox-only baseline failures: five test files lose child-process output.
Pending decision: none. T4 proof: receipts/t4-github.txt; exact metadata and four topics verified.
T3 proof: receipts/t3-verification.md and receipts/t3-clean-clone.txt; actual commit clone passes.
CI at ced78db and latest main 050f7b8: success. Uncommitted: T4 receipt and ledger.

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | The owner's email is the live site's published contact (`contact.email` in the owner's `owner.json`) and is the author email on 225 of 235 commits. | Keeping it out of history needs a rewrite, which D2 rules out. The tree scrub is a tidy-up, not a leak fix. "History is clean" holds for secrets only (B7). |
| F2 | Tree hits: the email in 3 files, a Linux home-directory path in 10 files (12 lines), all under `.workflow/`. No macOS home-directory paths. | T2 scrubs them, including line 14 of this run's own brief, which names both patterns literally. |
| F3 | sha256 values of 3 unpublished owner files (private `AGENTS.md`, `data/faq.md`, `golden-exceptions.json`) sit in 4 `.workflow/forkable-cutover/` files. The other hashes in receipts are of published files (`cv.md`, `og-image.png`, `llms.txt`, …). | Only unpublished owner files count as private. Published-file hashes stay as evidence. |
| F4 | `scanTrackedFiles` (`scripts/check-leaks.mjs:15`) skips `.workflow/` and `WORKLOG.md` because they name the owner on purpose. | The new email, path and hash patterns must apply to every tracked file, those included. The name rule keeps its exemption. |
| F5 | In CI the owner is `examples/owner`, whose `contact.email` is `null` and which has no private files. | The email and hash guards run only on the owner's machine. CI covers them through fixtures, and the path and `*.proposed` rules run everywhere. |
| F6 | `test/tracked-tree.test.mjs:6` lists `docs` as retired: any tracked file under `docs/` fails. | T3 narrows the guard so the old docs stay retired and `docs/how-this-was-built.md` is allowed. |
| F7 | `johnviklund.com` matches the name rule. README allows one exact line in two places: `check-leaks.mjs:30` and `test/maintenance-docs.test.mjs:52`. | The README demo link either reuses that pinned line or replaces it with one new exact line in both places. No regex widening. |
| F8 | Every `npm run X` in README, AGENTS, USERGUIDE and the repo skills exists in `package.json`. No repo-relative path they name is missing (the rest are owner-root paths or routes). llms.txt/AGENTS.md parity is already tested (`test/static-contract.test.mjs:31`). | B6 adds a guard test, not fixes. |
| F9 | No tracked `*.proposed` files; the ignored files are all intended (`build/`, `.wrangler*`, `.verify-evidence/`, `TODO.md`, `data/`, `public/`, `src/data/`, `wrangler.jsonc`). | B8 is already true; T2 adds the `*.proposed` guard. |
| F10 | No gitleaks, trufflehog, docker or podman on this machine. | T1 needs a scanner fetched (decision 1). |
| F11 | GitHub today: description "A chat-first conversational résumé for John Viklund.", homepage empty, no topics, public. | T4 sets all three. |
| F12 | Reuse: `listFiles` (`scripts/build-site.mjs`), `resolveOwnerRoot` (`scripts/owner.mjs`) and the git `ls-files` loop in `scanTrackedFiles` cover T2's file walking. No sha256 helper in `scripts/`; `node:crypto` inline. | T2 adds no new walker. |

## Tickets

### T1 — Secrets scan of the full history, recorded
Delivers: B7 · Blocked by: none · Lane: operator
Runner: agent after approval · Risk: cheap
Seam: the receipt file
Handoff: fetch the pinned gitleaks release to `/tmp` and check its checksum; run `gitleaks git --log-opts=--all --redact` on the engine checkout; write the summary only (no secret values) to the receipt. A real hit stops the run for a history-rewrite decision (D2).
Accept:
- [x] gitleaks over all 235+ commits → receipt shows `no leaks found` and the scanned commit count (B7)
Verify: receipt: receipts/t1-secrets-scan.txt — commits scanned ≥ 235 · leaks 0 (pre: no receipt)
Skills: none
Status: done @ 5fe0bfa
Writer: GPT-6.1 Sol

### T2 — Leak scan blocks owner email, home paths, private-file hashes and `*.proposed`; history scrubbed
Delivers: B1, B8 · Blocked by: T1 · Lane: logic
Budget: code +40 · tests +55 · why: each of four rules needs a hit and a miss fixture
Seam: `node scripts/check-leaks.mjs` (CLI, default arguments) and `scanTrackedFiles`
Accept:
- [x] tracked `.workflow/x.md` containing the selected owner's `contact.email` → exit 1, path printed; `null` email → rule skipped (B1)
- [x] tracked `WORKLOG.md` with a Linux home-directory path, then with a macOS home-directory path → exit 1 each, path printed (B1)
- [x] fixture owner root: first 12 hex of sha256(`data/faq.md`) in a tracked file → exit 1; same for `data/cv.md` → exit 0 (B1)
- [x] a tracked `notes.proposed` → exit 1 naming it (B8)
- [x] engine checkout, default owner root → `Leak scan: 0 findings`, exit 0 (B1)
Verify: `node --test test/check-leaks.test.mjs && node scripts/check-leaks.mjs` (pre: 3 passed · 0 findings)
Skills: none
Status: done @ c675f95
Writer: GPT-6.1 Sol

### T3 — README for a hiring engineer, how-this-was-built doc, docs that match the repo
Delivers: B3, B5, B6, B2 · Blocked by: T2 · Lane: logic (copy approved by the human before commit)
Budget: code +4 · tests +40 · why: prose is Markdown; content tests are the only code
Seam: `test/maintenance-docs.test.mjs` reading README.md, docs/how-this-was-built.md, AGENTS.md, USERGUIDE.md
Accept:
- [x] README before `## Create your own Agent CV` → states what it is, links `https://johnviklund.com` as the demo, and lists the design decisions (B3)
- [x] `docs/how-this-was-built.md` → names `.workflow/`, `memory/`, `WORKLOG.md`, `.agents/`; README links it; tracked-tree test passes (B5)
- [x] every `npm run X` in README, AGENTS, USERGUIDE, how-this-was-built → a `package.json` script; every relative Markdown link → existing file (B6)
- [x] README naming the owner on any line besides the single pinned demo line → leak scan finding (B3)
- [x] fresh clone of HEAD, `AGENT_CV_OWNER_ROOT=examples/owner npm ci && npm run check` → exit 0, receipt `receipts/t3-clean-clone.txt` (B2)
Verify: `node --test test/maintenance-docs.test.mjs test/tracked-tree.test.mjs test/check-leaks.test.mjs` (pre: 8 passed)
Skills: none
Status: done @ ced78db
Writer: GPT-6.1 Sol

### T4 — GitHub page describes the engine; CI green on main
Delivers: B4, B2 · Blocked by: T3 · Lane: operator
Seam: the receipt file
Runner: agent after approval · Risk: cheap (reversible with another `gh repo edit`)
Handoff: `gh repo edit johnviklund/agent-cv --description "<approved text>" --homepage https://johnviklund.com --add-topic <approved list>`; then `gh repo view --json description,homepageUrl,repositoryTopics` and `gh run list --branch main --limit 1` into the receipt.
Accept:
- [x] `gh repo view` → description without the owner's name, homepage `https://johnviklund.com`, ≥ 3 topics (B4)
- [x] latest CI run on main at T3's pushed sha → conclusion `success` (B2)
Verify: receipt: receipts/t4-github.txt — homepageUrl https://johnviklund.com · topics ≥ 3 · CI success (pre: no receipt)
Skills: none
Status: todo

## Coverage
- Outcome → T3 (README, doc, clean clone) + T4 (GitHub page) + T2 (tree scrub) + T1 (history secrets)
- B1 → T2 · B2 → T3, T4 · B3 → T3 · B4 → T4 · B5 → T3 · B6 → T3 · B7 → T1 · B8 → T2
- Out of scope: fork deploy walkthrough → untouched · history rewrite → untouched unless T1 hits · admin export / verify live mode → untouched · TODO C1-2 and cutover P3s → untouched · removing `.workflow/` → untouched

## Risks
T2: the email and hash rules only run on the owner's machine (F5). A fork with a real owner gets them too, but CI never sees real data.
T3 changes the pinned README line in two files; if one is missed, CI fails on main (memory: test-on-example-owner-bundle).
Not taken: a hardcoded email literal in the scanner. Reading the selected owner keeps the engine forkable.

## TODO impacts
none (brief names no TODO item; C1-2 is out of scope)

## Product doc impacts
No PRODUCT.md or ROADMAP.md. `design.md`: no changes.

## Deviations
T1: raw scan flags 29 public analytics beacon tokens; exact findings were checked and baselined. Repeat scan reports no leaks across 337 scanned commits.
T3: tracked-tree assertion now allows exactly the new guide; four assertions before and after. Both candidate and approved primary commit clones pass.
