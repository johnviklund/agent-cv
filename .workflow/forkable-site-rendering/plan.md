Command: workflow plan forkable-site-rendering
Created: 2026-10-18
Base: 7e923462686a794061dbbdcfb23f3988fb080d9b
Inputs: .workflow/forkable-site-rendering/brainstorm.md @ 7e923462686a794061dbbdcfb23f3988fb080d9b
Status: complete

Docs read: design.md §§System, Typography and spacing, CTA voice and states, Motion stance, Notes; AGENTS.md; Run A wrap. PRODUCT.md and MEMORY.md absent.
Size: code 7517 · tests 5902 · ratio 0.79 · baseline includes moved browser JS, ten HTML files, affected Worker/build modules and existing Node tests; largest touched test/worker.test.mjs 1329, public/comparison-view.js 953; over 1,000: test/worker.test.mjs.
Decisions: user 1a approved technical golden exceptions; John approved B1–B6, six tickets and their acceptance criteria. Main session writes; Opus 5.5 audit incorporated; verified findings and dispositions in notes/audit.md.

## Execution state
T1 @ 9aa0df6 · T2 @ e262441 (private b95360d) · T3 @ 04f3a25 (private 746d16b) · T4 @ 7a9f61a (private 984d692) · next T5 (logic) · writer: Opus 5.5 (see Deviations) · Session 1: T1 · Session 2: T2, T3 · Session 3: T4
Every ticket runs npm run check and local golden:diff before commit (approved). Baseline 224 passed, 1 skipped; now 239 passed, 1 skipped; golden:diff empty. Owner data/faq.md edit is pre-existing, untouched.
In flight: golden-exceptions.json {"exceptions":[{path, before, after, reason, diff}]}; buildSystemPrompt(knowledge, { owner, updatedAt }); canonicalizeComparisonDraft(..., owner), handleRequest({ owner }) default to src/data/owner.js; test/fixtures/owners.mjs JOHN, ADA, ELISE.
Rendering: build-site renderSite({ owner, site }) → 15 files; buildSite({ owner, site, out, dataRoot }) adds the 4 public Markdown; site/templates/{html,home,pages,discovery,headers}.mjs; site.json meta, person, home, pages.{about,experience,projects,cv,contact,privacy}; prose blocks p/h2/h3/kicker/quote/list with **bold**, `code`, [label](href). John's render equals public/ except experience/ " &amp; ".

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | scripts/golden.mjs:28 collects public/ bytes, prompts and Wrangler config. | Reuse collector/diff; frozen baseline stays private, technical exceptions need exact verification. |
| F2 | src/comparison-core.js:105 instructions are neutral; :24 and :30 contain owner-specific question/safety text. | Preserve prompt bytes; migrate question generation and prohibited-conclusion matching together. |
| F3 | src/worker.js:35 includes the Workers alias; current owner.site.hosts omits it. | Add the alias to John's owner file; exclude canonical host from redirect aliases. |
| F4 | scripts/owner.mjs:41 supports a limited schema subset; schemas/site.schema.json only accepts schemaVersion. | Extend structured page validation alongside templates; update both owner envelopes before strict validation is enabled. |
| F5 | public/ contains ten HTML pages, including admin, application and 404. | Convert every current route; no new case-study routes are implied. |
| F6 | scripts/check-static.mjs:114 checks inline JSON-LD CSP hashes; :156 parses the chat signature for freshness. | Generate correct hashes for rendered JSON-LD; keep freshness checks independent of function-signature spelling. |
| F7 | scripts/sync-public-data.mjs:21 and both comparison generators write public/; tests and review-conversations import its JS. | Migrate consumers with the final output switch; preserve evidence/contract parity and review tooling imports. |
| F8 | scripts/build-cv-pdf.mjs:9 and build-og-image.mjs:9 target public/; OG reads fonts there. | Adjust paths only in B so existing build commands survive; owner content generalization stays in C. |
| F9 | scripts/cv-pdf.mjs:115 has HTML escaping; public/dom.js creates safe text nodes; no site renderer exists. | Extract/reuse HTML escaping for templates and PDF; add contextual URL/JSON handling, reuse DOM textContent. |
| F10 | comparison-view.js is 953 lines; worker tests are 1329. | Add focused owner tests rather than expanding the large Worker test; avoid unrelated refactoring. |
| F11 | .github/workflows/ci.yml:21 uses bootstrap data and the example owner; several tests assert John literals. | Expand Ada site.json with each schema section; parameterize identity assertions; CI remains an interim mixed-source build until C/D. |
| F12 | public/app.js:312 hard-codes an innerHTML label; comparison-view.js:477 hard-codes the export slug. | Add data-owner-slug, render labels through textContent, test Unicode names and downloads. |
| F13 | Refresh skill:40 points to public/projects/index.html; _headers:25 names the PDF route. | Fix stale maintenance paths and template PDF headers in B; full skill/PDF generalization remains in C. |

## Tickets

### T1 — Verify approved technical differences without hiding drift
Delivers: B1 · Blocked by: none · Lane: logic
Budget: code +100 · tests +90
Seam: golden collector, CLI and private exception manifest; prepares T3–T6.
Accept:
- [x] Frozen baseline plus exact recorded before/after digests reports accepted technical changes individually; every unlisted change exits 1. (B1)
- [x] Prompt exceptions are rejected; unapproved prose changes fail; exact technical exceptions retain raw differences and reviewed diffs. (B1)
Verify: `node --test test/golden.test.mjs` (pre: 5 passed)
Skills: none
Status: done @ 9aa0df6
Writer: Opus 5.5

### T2 — Use owner identity throughout Worker behaviour
Delivers: B2 · Blocked by: T1 · Lane: contract
Budget: code +110 · tests +100
Seam: pass generated identity into pure prompt/comparison functions; add site.json.updatedAt to schema and generated metadata; golden collector uses production inputs.
Accept:
- [x] John chat and comparison prompts equal frozen bytes; Ada chat names Ada Example and Ada; comparison instructions remain identical. (B2)
- [x] Both owners receive named ownership questions; prohibited named scores and hiring conclusions fail, including Unicode names and regex punctuation. (B2)
- [x] Configured aliases return 308 preserving path/query; canonical and local hosts do not redirect; John's existing Workers alias remains supported. (B2)
Verify: `node --test test/owner-runtime.test.mjs && node --test test/chat-core.test.mjs test/comparison-core.test.mjs test/worker.test.mjs` (pre: new file; existing tests 75 passed, 1 skipped)
Skills: none
Status: done @ e262441
Writer: Opus 5.5

### T3 — Render the home page from validated structured content
Delivers: B3 · Blocked by: T1 · Lane: contract
Budget: code +500 · tests +180
Seam: owner loader, site schema, build-site and home template; render alongside current output until T6; update John and examples/owner/site.json with every schema extension.
Accept:
- [x] John's home renders approved copy, controls and metadata; a fictional home renders Ada Example from structured data without raw owner HTML. (B3)
- [x] Invalid sections name site.json and field; HTML characters display literally, unsafe URLs fail, and hostile names, email and analytics values remain inert text. (B3)
- [x] Rendered home JSON-LD matches its generated CSP hash; navigation, labels, IDs and data attributes retain existing controller contracts. (B3)
Verify: `node --test test/site-rendering.test.mjs && node --test test/owner.test.mjs` (pre: new file; owner tests 7 passed)
Skills: none
Status: done @ 04f3a25
Writer: Opus 5.5

### T4 — Render the remaining pages and discovery resources
Delivers: B4 · Blocked by: T3 · Lane: contract
Budget: code +650 · tests +200
Seam: shared templates, page sections, John's private site.json and synthetic fixture, robots, sitemap, llms.txt and public AGENTS.md.
Accept:
- [x] All ten existing HTML routes retain John's copy, links and layout; fictional fixtures supply every section and render their own identity. (B4)
- [x] Discovery resources retain API/tool names and limits; site.json.updatedAt drives freshness; owner origin/slug drive canonical URLs, sitemap, robots and PDF headers. (B4)
- [x] Public output includes four approved Markdown files and excludes six private sources, deploy settings, admin secrets and operator notes. (B4)
Verify: `node --test test/site-rendering.test.mjs && node --test test/static-contract.test.mjs` (pre: new file; static tests 12 passed)
Skills: /home/john/.codex/skills/agent-docs/SKILL.md
Status: done @ 7a9f61a
Writer: Opus 5.5

### T5 — Read browser identity from the rendered document
Delivers: B5 · Blocked by: T2, T4 · Lane: logic
Budget: code +100 · tests +90
Seam: home/application controllers, comparison view and WebMCP registration using data-owner-name, data-owner-short-name and data-owner-slug; reuse dom.js and textContent.
Accept:
- [ ] John/Ada DOM shows correct agent label, chat status, application title and comparison copy; Ada download is ada-example-role-comparison.md. (B5)
- [ ] Four WebMCP names and schemas stay identical; comparison tool description names the selected owner and preserves its data-sharing disclosure. (B5)
Verify: `node --test test/browser-owner.test.mjs && node --test test/comparison-view-model.test.mjs test/webmcp.test.mjs` (pre: new file; existing tests 22 passed)
Skills: none
Status: todo

### T6 — Serve and verify the generated site
Delivers: B1, B6 · Blocked by: T1, T2, T4, T5 · Lane: logic
Budget: code +230 · tests +140
Seam: move engine assets to site/assets; migrate generators/imports; wire build/site into dev/check/build/deploy, CI and golden collection; fix maintenance path pointers.
Accept:
- [ ] Clean build/site serves ten pages, fonts, tokens, scripts, evidence and contract; John-local and owner-less CI check/build pass with assets.directory set to ./build/site. (B6)
- [ ] PDF and OG commands retain John's content and working paths; generated output stays ignored; rebuild removes stale files without erasing source assets. (B6)
- [ ] Golden verification accepts only recorded technical differences; browser receipts show unchanged desktop/mobile appearance and working chat, comparison and application flows. (B1, B6)
Verify: `npm run check && npm run build && npm run golden:diff` (pre: check 224 passed, 1 skipped; build passed; golden empty)
Skills: /home/john/.codex/skills/agent-docs/SKILL.md, /home/john/.codex/skills/.system/skill-creator/SKILL.md
Status: todo

## Coverage
Outcome → T6 plus browser receipts; B1 → T1,T6 · B2 → T2 · B3 → T3 · B4 → T4 · B5 → T5 · B6 → T6.
Out of scope: U5 content/config generalization, U6 tooling redesign, U7 full example/setup/leak check/footer, U8 deletion/deploy → untouched except required paths, Ada page data and generated PDF headers.

## Risks
T3/T4 are larger than normal tickets because ten pages become structured content; preserve one Run B as the master plan requests.
Stage templates beside current output, then switch all consumers in T6; alternate-owner tests use isolated synthetic data and leave John's generated data restored.
Record receipts under screens/ and receipts/; browser checks cover all ten routes at desktop and 375px, plus navigation/chat/comparison/document checks at 320, 414 and 768px; human tries UI before its commit.

## TODO impacts
None named by the source plan; TODO.md and ROADMAP.md not opened.

## Product doc impacts
design.md: update canonical published token path to build/site/tokens.css; visual rules unchanged. AGENTS.md and refresh skill: correct output/content paths only. PRODUCT.md and ROADMAP.md absent.

## Deviations
- Execute seat switched from GPT-6.1 Sol to Opus 5.5 by human approval; the plan was written on OpenAI Astra. Review must use an OpenAI model.
- T2: six existing tests changed setup only, assertion counts unchanged: chat-core, worker redirect and comparison question tests pass JOHN; owner/sync-owner fixtures add site.json updatedAt. Conclusion patterns keep their "john" tokens (cleanup is U8). Tests +129 against budget +100.
- T3: _headers renders now, CSP hashes and the PDF route from the slug, because the CSP hash acceptance line needs it; T4 keeps the rest of the discovery resources. Code about +557 against +500, mostly the copied page body and the repeated schema item shapes. The John byte-equality test skips without John's owner root, as in CI.
- T4: experience/ renders "&amp;" where the published page has raw "&" (three lines, same display); T6 needs a golden exception outside the four approved categories, or a human ruling. Code about +1,000 against +650, mostly page markup copied from public/ by the one-off generators in scripts/.
