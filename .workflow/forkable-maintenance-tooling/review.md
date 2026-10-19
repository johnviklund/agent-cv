Command: workflow review forkable-maintenance-tooling
Created: 2026-10-19
Base:    8a30e36
Inputs:  .workflow/forkable-maintenance-tooling/plan.md @ e32329f
Status:  complete

## Coverage
- [x] T1 — acceptance 4/4 tested and passing; mutations (UA, manifest default, folder base, packet name) each go red
- [x] T2 — acceptance 4/4 pass on John's bundle; B4 line fails on the example-owner bundle (C1-1)
- [x] T3 — acceptance 4/4 tested and passing (static test/maintenance-docs.test.mjs)
- [ ] B1–B3, B5–B7 delivered · B4 delivered in code, its John refusal test red on CI · Outcome observed on packet/brief/UA output via tests, no verify skill (no live surface; deploy is U8) · out of scope untouched (README.md, U7, U8)
- [x] .workflow/ dependency check — 0 hits
Size: +35 code · +89 tests · ratio 2.54 · net +81 · over 1,000: none
Reachability: test/maintenance-docs.test.mjs → `node --test` · no new modules · guards shown failing: B3 UA, B5 manifest path, local-folder base, admin data-owner attrs, packet and brief owner name
Escape hatches: none added
Independence: cross-vendor (writer GPT-6.1 Sol / OpenAI; reviewer Opus 5.5 / Anthropic)

## Cycle 1 findings
### P1 — John refusal test fails for every non-John owner; CI red on main
- Evidence: B4 "John still refused" · test/comparison-core.test.mjs:386–399 canonicalizes "John scores 99%" and "John ranks first" with the default `generatedOwner`; after src/comparison-core.js:32–44 dropped the `john` alternatives, only `ownerScreen` turns "John" into "the candidate", and it screens the bundled owner's names. Example-owner bundle (CI's `bootstrap:data`): 20 pass, 1 fail; same bundle at e32329f: 21 pass. CI runs 39263982986 and 39264031358 fail on exactly this test (284 pass, 1 fail). Local `npm run check` passes only because src/data is John's.
- Remedy: pass the `JOHN` fixture (test/fixtures/owners.mjs) as the `owner` argument for the John strings, as test/owner-runtime.test.mjs:62 does; code stays as is (D2).
- Disposition: fix now
- Resolved: —

### P2 — Conversation review loads the owner after advancing the cursor
- Evidence: scripts/review-conversations.mjs:165 `loadOwner({ env })` runs after `writeSavedCursor` (line 155). admin-origin.mjs:17 reads owner.json without schema checks, so an owner.json that fails the schema, or a bad site.json, passes the origin step, then throws after a truncated scan saved `nextCursor`: that batch is never written and the next run starts past it.
- Remedy: load the owner before `collectConversationCandidates`.
- Disposition: defer → TODO.md
- Resolved: —

### P3 — minor (3)
- site/assets/admin.js:104 `owner: readOwner()` has no test (admin.js has no harness); deleting it breaks the brief download for every owner and stays green.
- Both skills say "Resolve the owner root with `scripts/owner.mjs`", but owner.mjs has no CLI; the agent must import `resolveOwnerRoot` ad hoc.
- test/project-review.test.mjs:474 runs `git check-ignore` from process cwd, not the engine root.
- Disposition: defer (stays in review.md)
- Resolved: —

## Pre-existing / environmental
- agent-cv-private has an uncommitted `data/faq.md` edit that predates this run (t2 receipt); untouched.
- The writer pushed T1–T3 to main while CI was red: receipts' "full check" ran only on John's bundle.

## Cycle 1 verdict
Patch needed: 1 P1 (C1-1) fix now · 1 P2 deferred to TODO.md · 3 P3 kept here. Everything else meets its acceptance lines and every new guard was shown failing once.
