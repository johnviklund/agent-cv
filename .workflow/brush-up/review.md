Command: workflow review brush-up
Created: 2026-10-21
Base:    6c334e6
Inputs:  .workflow/brush-up/plan.md @ ef7b4d1
Status:  complete

## Coverage
- [x] T1 — acceptance 1/1 · receipts/t1-secrets-scan.txt: gitleaks v8.30.1, checksum matched, 337 commits scanned, 0 leaks after an exact 29-finding baseline of public Cloudflare beacon tokens
- [x] T2 — acceptance 5/5 tested and passing · test/check-leaks.test.mjs:15 runs every fixture row through the no-argument CLI; real-owner run `node scripts/check-leaks.mjs` → 0 findings, exit 0, with the owner email set and 6 private data files present
- [x] T3 — acceptance 5/5 · test/maintenance-docs.test.mjs:8,21 · test/tracked-tree.test.mjs:10 · receipts/t3-clean-clone.txt at ced78db exit 0 · copy approval in receipts/t3-copy-approval.txt
- [x] T4 — acceptance 2/2 · live `gh repo view`: description without the owner's name, homepage https://johnviklund.com, 4 topics; `gh run list` main @ 6c334e6 success
- [x] B1…B8 delivered · Outcome observed on GitHub via `gh api repos/johnviklund/agent-cv/readme` (sha 733b852 = HEAD:README.md) and live `gh repo view`; no site UI changed, so verify-agent-cv was not needed · out of scope untouched
- [x] Independent B1 check: sha256 prefixes of all 21 historical versions of the owner's private files (owner repo `git log --all`), 12 and 8 hex → 0 hits in tracked files; owner email → 0 hits; Linux and macOS home-directory paths → 0 hits outside test fixtures
- [x] .workflow/ dependency check — 8 hits, none reads `.workflow/`: scripts/check-leaks.mjs:46 is the existing name-rule exemption (F4), the rest are test fixture paths and the doc-content assertion
- [x] Full suite: `npm run check` exit 0 · 341 tests, 339 pass, 2 skipped, 0 fail · 10 static pages
- [x] Assertion counts in pre-existing tests: tracked-tree 1→1, check-leaks credit test and maintenance cutover test changed fixtures/regex only, no assertion dropped
Size: +22 code · +73 tests · ratio 3.32 · net +89 · over 1,000: none
Reachability: no new module; docs/how-this-was-built.md linked from README.md:14 · guards shown failing: 10 check-leaks mutations (Linux path, macOS path, AGENTS.md, golden-exceptions.json, data/*.md, cv.md public, `.proposed`, email, `.workflow/` skip moved before new rules, README pin) all killed; docs guards killed for a bad `npm run`, a broken relative link, an extra tracked `docs/` file and a missing decision
Escape hatches: none added
Independence: cross-vendor (writer GPT-6.1 Sol · OpenAI; reviewer Claude Opus 5.5 · Anthropic)

## Cycle 1 findings
### P3 — Path rule matches URL paths too
- Evidence: scripts/check-leaks.mjs:44 `/\/(?:home|Users)\/[^/\s]+/` also matches any URL whose path starts with a home or Users segment; a future doc with such a URL fails the check with no allow route. Fails safe. Reproduced during this review: the first draft of this file quoted such a URL and the scan flagged it.
- Disposition: defer — stays in review.md
- Resolved: —
### P3 — Hash rule knows only the current private-file contents
- Evidence: scripts/check-leaks.mjs:31 hashes today's files; a hash copied from an older version passes. Today's history has none (independent scan above). The check runs before each commit, so a fresh hash is caught while it still matches.
- Disposition: defer — stays in review.md
- Resolved: —
### P3 — An empty private file would flag the well-known empty-input hash
- Evidence: sha256 of empty input starts `e3b0c44298fc`; an empty `data/*.md` would make any tracked file citing that hash a finding. Fails safe; no private file is empty.
- Disposition: defer — stays in review.md
- Resolved: —

## Pre-existing / environmental
- Two stale worktrees from earlier runs: /tmp/agent-cv-maintenance-c1, /tmp/agent-cv-review-cycle2. Not this run's; remove at wrap if unused.
- `~/.codex/config.toml` in .workflow/forkable-cutover/receipts/t1-permission-block.txt:14 is a generic tilde path, not a personal one; the rule targets absolute home paths by design.

## Cycle 1 verdict
Ship as-is. P0 0 · P1 0 · P2 0 · P3 3 (deferred, stay here). Every acceptance line has a passing test or receipt, every guard fails when broken, and an independent scan of history-derived hashes confirms the scrub.
