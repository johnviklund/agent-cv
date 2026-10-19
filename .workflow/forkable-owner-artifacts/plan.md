Command: workflow plan forkable-owner-artifacts
Created: 2026-10-19
Base: c3d344a0c79dcfb368db6ecda7bd4ddbc3c2f6f2
Inputs: .workflow/forkable-owner-artifacts/brainstorm.md @ 23da4d9a078faa14c10ec64e4d5aa71c896b1571
Status: complete

Docs read: design.md §System, §Typography and spacing, §CTA voice and states, §Motion stance, §Notes; original forkable plan §Goal Capsule, §Decisions, §U5. PRODUCT.md absent.
Size: code 1833 · tests 2354 · ratio 1.28 · largest touched test/comparison-core.test.mjs 591, scripts/review-conversations.mjs 300, scripts/build-comparison-evidence.mjs 294 · over 1,000: none
Decisions: brief D1–D6 retained; John approved all five tickets on 2026-10-19. Public-code Opus 5.5 audit complete; findings verified by main session GPT-6 Astra.

## Execution state
T1 @ 90cba12 (private 739738e) · T2 @ d11fca9 · T4 @ 6c5e5b2 · T3 @ c6a1a04 · T5 @ b739df7 (private f2bdbf7) · all tickets done; next review · writer: Opus 5.5 (human-approved swap; review → GPT-6.1 Sol xhigh)
Baseline 249/1 skip → T1 252/2 → T2 254/3 → T4 258/3 → T3 269/3 → T5 276/3. Chromium card test opt-in (AGENT_CV_CHROMIUM_TESTS=1). Never stage private data/faq.md. Compare Buffers with .equals (deepEqual OOMs this host).
In flight: none. New seams: wrangler-config.mjs buildWranglerConfig/writeWranglerConfig; syncRepositories({engineRoot, ownerRoot, fetchImpl}); writeComparisonEvidence({root, ownerRoot}); handleRequest/handleCompare catalog option.
Session 1: T1
Session 2: T2, T4
Session 3: T3, T5

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | Brief base differs only by this run's two brainstorm commits. | Input is fresh. |
| F2 | scripts/owner.mjs:24,99 already resolve and validate owner roots; schemas/owner.schema.json:5 rejects unknown fields. | Reuse loader; add optional tagline explicitly. |
| F3 | scripts/build-og-image.mjs:15 and scripts/build-cv-pdf.mjs:14 duplicate Chromium discovery. | T1 consolidates discovery for both live callers before T2 changes PDF ownership. |
| F4 | site/templates/html.mjs exports escapeHtml and profileLinks; scripts/cv-pdf.mjs:10 has a pure print renderer. | Reuse escaping and print rendering; preserve John's contact order and labels. |
| F5 | scripts/cv-pdf.mjs:8–25 also hardcodes origin, profile URLs, footer, title and author. | T2 replaces all generated identity, as the outcome and original U5 require. Use fictional CV fixtures; full Ada content stays U7. |
| F6 | scripts/build-site.mjs:50 copies engine assets; test/golden.test.mjs:146 copies only owner/site JSON into temporary roots. | Pass the resolved owner root through builders and update fixtures to include owner assets. |
| F7 | scripts/golden.mjs:38,51 already captures all site bytes and raw Wrangler bytes. | Extend assertions and regenerate config before collection; preserve baseline and existing exact exceptions. |
| F8 | package.json:7–29 plus four config-reading tests and check-worker-package read root Wrangler config. | Generate on every supported command path, including standalone tests and package checks; test switching owners. |
| F9 | scripts/admin-origin.mjs:15 strictly validates HTTPS; both admin callers have explicit URL overrides. | Keep validation and overrides; absent site.origin must report not configured before sending requests. |
| F10 | scripts/build-comparison-evidence.mjs:75 and sync-github-repositories.mjs:8 use engine manifests; validators already accept empty manifests. | Move only manifest defaults to the owner root; keep evidence source paths rooted in engine data and local repository documents in engine. |
| F11 | AGENTS.md and USERGUIDE.md prescribe files this run removes. | Correct affected path/build instructions with each ticket; broad owner-neutral documentation stays U6. |
| F12 | Admin callers send bearer tokens; resolveOwnerRoot defaults to examples/owner. | T4 refuses the example root before any request; env selects the trusted file, never an origin value. |
| F13 | CI has no owner repo; test/contact.test.mjs:70 hardcodes John; comparison tests import nonempty generated evidence. | T3 tests owner-derived contact and base defaults; T5 uses explicit evidence fixtures and proves empty Ada builds without importing John's evidence. |
| F14 | Golden compares raw config bytes; short arrays in the current config use compact formatting. | Preserve its serialization; no baseline recapture. Merge base vars then owner vars safely, with contact.email authoritative. |
Execution details: agent commits John's tagline/card in T1 and identical manifests in T5 before engine deletions. Copy only the owner card asset. Correct affected README/USERGUIDE/AGENTS/skill paths; leave historical .hallmark/preflight.json unchanged. Do not refresh John's repository snapshot during parity checks. Card name splits at its first space, keeps the existing final period, and uses headline verbatim; verify John's input parity before changing it.

## Tickets

### T1 — Build and serve the owner's social card
Delivers: B1, B2, B8 · Blocked by: none · Lane: contract
Budget: code +100 · tests +100
Seam: owner validation → card renderer/CLI → buildSite → golden collection. Extract shared Chromium discovery for the PDF caller too.
Accept:
- [x] John's regenerated PNG equals the committed card bytes; golden collection contains those same bytes at site/og-image.png. (B1, B8)
- [x] Ada's card contains Ada Example, her headline and ada.example; absent tagline renders location alone; owner text is HTML-escaped. (B1)
- [x] CLI writes assets/og-image.png under the selected owner; buildSite publishes identical bytes; missing card fails naming npm run build:og-image. (B2)
- [x] Both owners have committed cards; the engine card is removed; npm run check performs zero Chromium launches. (B2)
Verify: `node --test test/owner.test.mjs test/site-rendering.test.mjs test/og-image.test.mjs test/golden.test.mjs` (pre: 30 passed; new og-image file absent, Node 26 skipped its unmatched path)
Skills: none
Status: done @ 90cba12
Writer: Opus 5.5
Receipt: receipts/t1-verification.md

### T2 — Build the owner's CV PDF
Delivers: B3 · Blocked by: T1 · Lane: logic
Budget: code +65 · tests +65
Seam: selected owner + canonical CV Markdown → print HTML → real Chromium PDF → existing download URL.
Accept:
- [x] John produces john-viklund-cv.pdf with unchanged text and contact order; Ada's fictional CV produces ada-example-cv.pdf containing Ada Example and no John identity. (B3)
- [x] Header email equals contact.email; null removes its link and separator; metadata, footer, origin and profile links use the owner. (B3)
- [x] Real PDFs have 1–2 pages, extractable owner text, zero Type 3 fonts and zero local file paths; existing download links resolve. (B3)
Verify: `node --test test/cv-pdf.test.mjs` (pre: 4 passed; real PDF verification added during execution)
Skills: /home/john/.codex/plugins/cache/openai-primary-runtime/pdf/26.1011.11113/skills/pdf/SKILL.md
Status: done @ d11fca9
Writer: Opus 5.5
Receipt: receipts/t2-verification.md

### T3 — Generate and consume the owner's Wrangler config
Delivers: B4, B5, B8 · Blocked by: T2 · Lane: contract
Budget: code +120 · tests +110
Seam: validated owner + wrangler.base.jsonc → ignored root wrangler.jsonc → npm entry points, package checker and golden diff.
Accept:
- [x] John's generated config equals today's config in content; golden:diff has zero unlisted differences without recapturing the baseline. (B4, B8)
- [x] Ada config uses her worker name, ARCHIVE namespace and vars over engine defaults; routes exclude *.workers.dev; binding/security settings remain equal. (B4)
- [x] CONTACT_EMAIL equals contact.email despite deploy.vars overrides; null removes it even when deploy.vars supplies a value. (B4)
- [x] For absent and other-owner config cases, dev/build/deploy/check/test/check:worker-package/golden commands generate selected-owner config; only wrangler.base.jsonc is tracked. (B5)
Verify: `node --test test/wrangler-config.test.mjs test/contact.test.mjs test/comparison-fixtures.test.mjs test/static-contract.test.mjs test/golden.test.mjs` (pre: 28 passed; new wrangler-config file absent, Node 26 skipped its unmatched path)
Skills: none
Status: done @ c6a1a04
Writer: Opus 5.5
Receipt: receipts/t3-verification.md

### T4 — Resolve the trusted admin origin from the owner
Delivers: B6 · Blocked by: none · Lane: logic
Budget: code +45 · tests +60 · why: both admin callers need request-destination and rejection coverage
Seam: readAdminOrigin and export/review callers with synthetic tokens and stubbed requests; no live admin calls.
Accept:
- [x] Export and review use owner.site.origin as their default request origin; config/admin-origin.json is deleted. (B6)
- [x] Missing origin reports not configured; malformed JSON and non-HTTPS, credentialed, path, query, fragment origins fail before requests. (B6)
- [x] Explicit export --url and review baseUrl keep their validated override behavior; token handling remains unchanged. (B6)
- [x] Default admin origin resolution rejects examples/owner, including its symlink, before any authenticated request. (B6)
Verify: `node --test test/admin-origin.test.mjs test/review-conversations.test.mjs` (pre: 12 passed)
Skills: none
Status: done @ 6c5e5b2
Writer: Opus 5.5
Receipt: receipts/t4-verification.md

### T5 — Read repository and evidence manifests from the owner
Delivers: B7 · Blocked by: T3 · Lane: contract
Budget: code +100 · tests +130 · why: two consumers need owner-selection coverage; comparison tests need explicit evidence fixtures
Seam: sync:repositories and build:evidence/sync:data → existing manifest validators → generated evidence.
Accept:
- [x] John's identical manifests are committed in agent-cv-private before engine copies are deleted; generated comparison evidence is unchanged. (B7)
- [x] Ada's repositories.json is []; comparison-evidence.json is {"schemaVersion":1,"items":[]}; consumers produce zero entries without network calls. (B7)
- [x] Missing and invalid selected-owner manifests fail; engine config files never supply fallback content. (B7)
- [x] Nonempty fixture manifests fetch only named public repositories/documents and resolve approved evidence selectors; existing safety rejections still pass. (B7)
- [x] A disposable checkout without John's owner repo passes npm run build using Ada's empty manifests; comparison tests use explicit catalogs. (B7)
Verify: `node --test test/repository-grounding.test.mjs test/comparison-evidence.test.mjs test/owner-manifests.test.mjs test/comparison-core.test.mjs test/owner-runtime.test.mjs` (pre: 37 passed, 1 skipped; new owner-manifests file absent, Node 26 skipped its unmatched path)
Skills: none
Status: done @ b739df7
Writer: Opus 5.5
Receipt: receipts/t5-verification.md

## Deviations
- T1: plan note says the card uses the headline verbatim; John's card shows "…product leader." while owner.json headline has no period. The card appends "." unless the headline ends in . ! or ?, which keeps John's bytes identical (acceptance line 1 wins).
- T1: the real-Chromium John parity test is opt-in (AGENT_CV_CHROMIUM_TESTS=1) because npm test runs inside npm run check, which must launch zero Chromium.
- T2: the PDF header keeps John's profile set (x, LinkedIn); a GitHub link is not printed, as before, so John's text stays identical.
- T2: existing test "the CV PDF is built from the public CV…" and "…keeps every role bullet…" now pass an owner instead of `{ email }`; assertions unchanged (12 and 4 before and after).
- T4: test/admin-origin.test.mjs rewritten for the owner-file reader; its 6 assertions (valid origin, http, credentialed, path, missing) are kept as cases, plus query, fragment, malformed and example cases. The example refusal reuses resolveOwnerRoot's message ("Refusing to deploy the example owner").
- T3: test/contact.test.mjs "deployment config publishes the selected contact email" now asserts CONTACT_EMAIL equals the selected owner's contact.email (absent when null) instead of John's literal; 1 assertion before and after. comparison-fixtures and static-contract read the generated config; assertions unchanged.
- T3: golden collects the config through writeWranglerConfig (writes the root file too); dev/deploy regenerate via npm run build:wrangler-config; build relies on check → check:worker-package.
- T5: handleRequest/handleCompare gain a `catalog` option (default: generated evidence) beside owner/fetchImpl, so Worker comparison tests use the fixture catalog; needed for acceptance line 5. worker.test wraps handleRequest with it; assertions unchanged.
- T5: comparison-core "new career subroles…" now skips unless the generated owner is John (it checks John's evidence IDs); its first test passes the fixture catalog to validateComparisonPayload. repository-grounding reads the owner's repositories.json; comparison-evidence fixtures put the manifest at the owner root. Assertion counts unchanged.
- T5: data/repositories.md still quotes the old config/ path inside John's README snapshot; left unrefreshed per the plan.
- Ratio waived: T3 — tests +103 sit inside the +110 budget; code came in at +67 against +120 because the base config is a rename.
- Ratio waived: T5 — tests +112 sit inside the planned +130 (two consumers need owner-selection coverage; comparison tests need an explicit evidence fixture); code came in at +55 against +100.
- Ratio waived: T4 — tests +62 sit at the planned +60 (two callers, destination and pre-request rejection cases); code came in at +24 against a +45 budget.

## Coverage
- Outcome → T1 card bytes, T2 PDF pages/text/path, T3 config parity, T5 manifest migration; final npm run check, npm run build and npm run golden:diff.
- B1 → T1 · B2 → T1 · B3 → T2 · B4 → T3 · B5 → T3 · B6 → T4 · B7 → T5 · B8 → T1, T3
- Out of scope: setup/leak check/full Ada content → U7 untouched; broad maintenance wording → U6 untouched; cutover/live deployment → U8 untouched; generic fallback card → absent.

## Risks
Owner switches must regenerate config, never reuse another owner's deployment identifiers. Keep CONTACT_EMAIL authoritative and preserve all binding rules.
John's card depends on identical Chromium/fonts; compare regenerated bytes, never replace the baseline to conceal drift. PDF identity changes must preserve John's text.
Private owner migrations require scoped filesystem authorization during execute; publish no private data. Tests spawning child processes require execution outside this sandbox.

## TODO impacts
Original forkable plan U5 → covered; U6, U7 and U8 remain separate.

## Product doc impacts
design.md → no changes. PRODUCT.md absent. AGENTS.md/USERGUIDE.md affected artifact paths need correction; no public CV claims change.
