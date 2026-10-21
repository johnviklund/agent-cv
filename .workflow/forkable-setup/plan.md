Command: workflow plan forkable-setup
Created: 2026-10-20
Base:    eb6247a
Inputs:  .workflow/forkable-setup/brainstorm.md @ f116aed
Status:  done

Docs read: none in scope (PRODUCT.md, DESIGN.md absent)
Size: code 218 · tests 232 · ratio 1.06 · largest touched USERGUIDE.md 174, test/sync-owner.test.mjs 141 · over 1,000: none
Decisions: 1a links.github set to null by setup · 2a deploy also refuses Ada's og-image bytes · 3a tickets approved 2026-10-20

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | `scripts/configure-admin-secret.mjs` is top-level code with no export | T2 extracts `configureAdminSecret({engineRoot, env, run})`; the CLI stays a thin caller and `test/setup-admin.test.mjs` passes unchanged |
| F2 | `writeWranglerConfig` takes no `env`; `loadOwner` falls back to `process.env` (`scripts/wrangler-config.mjs:45`) | T2 adds an `env` option so setup's secrets target the new owner's Worker (memory: generated-config-owner-switch) |
| F3 | `refuseExample` compares real paths only (`scripts/owner.mjs:12`); a copy of `examples/owner` deploys | B7 needs a content check. It goes in `syncOwner({deploy:true})` only: `loadOwner` deploy mode also guards `setup:admin` and setup's own secret step, which run while the prose is still Ada's |
| F4 | `test/sync-owner.test.mjs` "deploys any other owner" copies Ada's `owner.json` with only the slug changed | T3 gives that fixture a non-Ada name, or it fails under B7 |
| F5 | "Ada Example" is in `owner.json` (`name.full`), `site.json` and all 9 `data/*.md`; John's bundle has none and its `og-image.png` differs from Ada's | B7 cannot block John's deploy |
| F6 | Wrangler 4.123 `kv namespace create <name>` uses the name verbatim as the title (`cli.js:367384`) and prints a snippet with `"id": "<32 hex>"`; non-interactive runs never edit config (`cli.js:302295`) | Setup parses the id and fails naming the step when it is absent. Title `<workerName>-archive`, not `ARCHIVE`, so a second Agent CV on one account does not collide (corrects B4's literal) |
| F7 | `wrangler secret put` on a missing Worker creates a draft Worker when non-interactive (`cli.js:375669`) | Secrets can be set before the first deploy; no extra step |
| F8 | Probe: Ada's bundle renamed to grace-hopper / Grace Hopper / grace.example, `AGENT_CV_OWNER_ROOT=<it> npm run check` in a clean worktree → exit 0, 294 pass, 12 skipped | B6 already holds; T1 proves it on setup's real output |
| F9 | `npm run check` against another owner rewrites tracked `public/` (John's today) | B6's check runs in a disposable worktree, never the main checkout |
| F10 | Reuse: no shared argument parser (each script hand-rolls one, `scripts/sync-owner.mjs:47`); no prompt helper (no readline in `scripts/`); `writeLocalAdminToken` (`scripts/admin-secret-file.mjs:21`); `validate`/`loadOwner` (`scripts/owner.mjs:39,99`); docs test `test/maintenance-docs.test.mjs` | `node:util` `parseArgs`; a small prompt in `setup.mjs`; reuse the rest |
| F11 | README has no "Create your own Agent CV"; `bootstrap:data` is in README "Run it locally" (:60, :64) and USERGUIDE "Set up a local checkout" (:18); a renamed example owner builds with no engine `data/` (F8) | T4 rewrites those sections; "Verify a safe fresh-clone bootstrap" and the data-boundary table stay for forkable-cutover (D5) |
| F12 | `npm run check` names every script for `node --check` | T1 adds `scripts/setup.mjs` there |
| F13 | `assets/og-image.png` is Ada's card as pixels; a text scan cannot see it | Decision 2a: T3 also refuses an `og-image.png` byte-identical to `examples/owner/assets/og-image.png` |
| F14 | `owner.json` `links.github` is Ada's (`https://github.com/ada-example`), outside B1's identity fields | Decision 1a: T1 sets it to null |

## Tickets

### T1 — `npm run setup` creates a renamed, git-initialised owner directory
Delivers: B1, B2, B3, B6 · Blocked by: none · Lane: logic
Budget: code +130 · tests +110
Seam: `runSetup({args, env, run, ask, isTTY})` exported from `scripts/setup.mjs`; `npm run setup`
Accept:
- [x] B1's flags with `--skip-cloud` → `owner.json` slug grace-hopper, names Grace Hopper/Grace, origin `https://grace.example`, worker grace-hopper-agent-cv, `links.github` null (B1)
- [x] same run → target's other files byte-equal `examples/owner/`; runner recorded `git init` in target; output contains `npm run deploy` (B1)
- [x] non-empty target → exit 1 naming the directory; its files unchanged (B2)
- [x] `--slug Grace` → exit 1 naming `slug`; target not created (B2)
- [x] no `--domain`: isTTY true → `ask` answers it; isTTY false → exit 1 naming `--domain`, nothing written (B3)
- [x] real `npm run setup -- ... --skip-cloud` into a temp dir, then `AGENT_CV_OWNER_ROOT=<it> npm run check` in a clean worktree → exit 0 (B6)
Verify: `node --test test/setup.test.mjs` (pre: new file); B6 receipt: receipts/t1-b6-check.txt — check exit 0
Skills: none
Status: done @ a61c3ab
Writer: GPT-6.1 Sol

### T2 — setup creates the archive namespace and sets both secrets
Delivers: B4, B5 · Blocked by: T1 · Lane: logic
Budget: code +90 · tests +100 · why: one failure case per cloud step
Seam: `runSetup` with an injected `run`; `configureAdminSecret` from `scripts/configure-admin-secret.mjs`
Accept:
- [x] no `--skip-cloud` → calls in order: kv create `grace-hopper-agent-cv-archive`, secret put OPENAI_API_KEY, secret put ADMIN_API_TOKEN (B4)
- [x] kv output id `0123…` (32 hex) → `owner.json` `deploy.archiveNamespaceId` equals it; Wrangler saw `name` grace-hopper-agent-cv (B4)
- [x] OpenAI key reaches only stdin: absent from every argv, owner directory and `.dev.vars` (B4)
- [x] each step failing in turn → exit 1, message names the step and its retry command; target kept, earlier id kept (B5)
- [x] kv output without an id → exit 1 naming the kv step; `archiveNamespaceId` stays Ada's placeholder (B5)
Verify: `node --test test/setup.test.mjs test/setup-admin.test.mjs` (pre: new file · setup-admin 6 passed)
Skills: none
Status: done @ ed23bc1
Writer: GPT-6.1 Sol

### T3 — deploy refuses an owner whose content is still Ada's
Delivers: B7 · Blocked by: none · Lane: logic
Budget: code +45 · tests +55 · why: the existing deploy fixture is renamed too (F4)
Seam: `syncOwner({deploy: true})`
Accept:
- [x] owner with "Ada Example" in `data/cv.md` and `site.json` → rejects naming both files; engine `data/` unchanged (B7)
- [x] same owner with `deploy: false` → syncs normally (B7)
- [x] owner text clean but `assets/og-image.png` byte-equal to Ada's → rejects naming `assets/og-image.png` (B7)
- [x] owner with no "Ada Example" and its own og-image → deploy sync succeeds, slug returned (B7)
Verify: `node --test test/sync-owner.test.mjs` (pre: 6 passed)
Skills: none
Status: done @ fae8fe6
Writer: GPT-6.1 Sol

### T4 — README and USERGUIDE walk a fork through setup to deploy
Delivers: B8 · Blocked by: T1, T2, T3 · Lane: mechanical
Budget: code +0 · tests +30 · why: docs ticket, the test is its only code
Seam: `test/maintenance-docs.test.mjs` reading README.md and USERGUIDE.md
Accept:
- [x] README has `## Create your own Agent CV` with `npm run setup`, `gh repo create`, `--private`, `AGENT_CV_OWNER_ROOT`, `npm run deploy`, `git pull upstream main` (B8)
- [x] USERGUIDE "Set up a local checkout" and "Deploy your fork" contain `npm run setup` and the content-rewrite prompt (B8)
- [x] README "Run it locally", "Create your own Agent CV", and those two USERGUIDE sections contain no `bootstrap:data` (B8)
Verify: `node --test test/maintenance-docs.test.mjs` (pre: 1 passed)
Skills: <home>/.claude/skills/plain/SKILL.md
Status: done @ 55ac8cb
Writer: GPT-6.1 Sol

## Coverage
- Outcome → T1 (owner directory and CLI output), T2 (KV id and secrets), T3 (deploy warning), T4 (docs)
- B1 → T1 · B2 → T1 · B3 → T1 · B4 → T2 · B5 → T2 · B6 → T1 · B7 → T3 · B8 → T4
- Out of scope: removing `bootstrap:data`, `examples/private-data/`, John's README/USERGUIDE text → untouched (forkable-cutover)
- Out of scope: rewriting Ada's prose → untouched; deploy and live checks → forkable-live-verify; TODO C1-2 → untouched

## Risks
T2: real Wrangler output and draft-Worker behaviour are read from the 4.123 source, not run; forkable-live-verify is the first real run.
T3 adds a deploy gate; John's bundle passes it (F5), but `npm run deploy` is not exercised here.
Not taken: a `--resume` flag for failed cloud steps; the message prints the manual retry command instead.

## TODO impacts
none

## Product doc impacts
PRODUCT.md, DESIGN.md, ROADMAP.md absent — no changes.
