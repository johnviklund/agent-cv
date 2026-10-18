Command: workflow plan forkable-owner-loader
Created: 2026-10-18
Base:    a0ec9b9
Inputs:  .workflow/forkable-owner-loader/brainstorm.md @ a0ec9b9
Status:  complete

Docs read: none in scope (no PRODUCT.md; design.md untouched: no UI change)
Size: code 101 · tests 66 · ratio 0.65 · largest touched scripts/sync-private-data.mjs 71 · over 1,000: none
Decisions: 1a plan U0+U1 as a run · 2a GPT-6.1 Sol writes, Opus 5.5 reviews · 3a minimal Ada example owner · run on branch feat/forkable-owner-loader, one PR at the end

## Execution state
Current: T4 todo · baseline at a0ec9b9: `npm run check` exit 0, 208 pass, 1 skipped, 0 fail
T1 @ f3d40da
T2 @ ccba344
T3 @ 26365ea (private commit 6e68283; receipt `receipts/t3-golden-capture.md`)
writer: Opus 5.5 (human ran execute on Opus 5.5 instead of GPT-6.1 Sol: review must go to OpenAI)
Session 1: T1, T2, T3

## Findings
| # | What is true | What it changes |
|---|---|---|
| F1 | `src/knowledge.js` imports `.md` files, which Node cannot import; Node 26 here and 24 in CI have `module.registerHooks` | T1 renders the real prompt through a hook that loads `.md` as text, not a copy of the join order |
| F2 | `public/` is mostly tracked; `sync:data` rewrites four Markdown files, `tokens.css`, `evidence.json` and the comparison contract | T1 snapshots the whole `public/` tree |
| F3 | `public/john-viklund-cv.pdf` is built only by deploy and needs Chromium | Excluded from the golden snapshot |
| F4 | `scripts/sync-private-data.mjs:57` resolves `--source`, `AGENT_CV_PRIVATE_ROOT`, then the sibling | Reuse: T1 exports it; T2's `resolveOwnerRoot` supersedes it; T4 switches golden over |
| F5 | Engine private `data/*.md` equal `agent-cv-private/data/*.md`, including John's uncommitted `faq.md` edit | The snapshot matches the deployed content; T3 never stages `faq.md` |
| F6 | CI runs `bootstrap:data` then `build`, with no owner repo | `sync:data` falls back to `examples/owner/`; CI never runs `sync:owner` |
| F7 | `examples/owner/` has no `data/` until U7 | `sync:owner` on the example fails with the existing "Private data source is incomplete" error |
| F8 | `src/worker.js:35` `LEGACY_HOSTS` adds the workers.dev host, which is no route | John's `site.hosts` lists the two custom domains; U2 settles the alias |
| F9 | Dependencies are only `wrangler`; reuse search for a schema validator: none found | `scripts/owner.mjs` carries a small JSON Schema subset validator |
| F10 | `src/data/owner.js` sits under `base_dir: ./src` with `find_additional_modules: true` | T4 runs `npm run build` to prove `check:worker-package` still passes |

## Tickets

### T1 — Golden snapshot of John's output and its diff
Delivers: B1, B2 · Blocked by: none · Lane: logic
Budget: code +90 · tests +70
Seam: `scripts/golden.mjs` exports `collectOutputs`, `writeGolden`, `diffGolden`; CLI `capture|diff [--golden <dir>]`; npm `golden:capture`, `golden:diff` run `sync:private-data` and `sync:data` first
Accept:
- [x] `collectOutputs({ root })` on this repo → keys include `site/index.html`, `site/llms.txt`, `site/AGENTS.md`, `site/sitemap.xml`, `prompts/system.txt`, `prompts/comparison.txt`, `wrangler.jsonc`; no `.pdf` key (B1)
- [x] `prompts/system.txt` contains the full text of `src/data/cv.md` and `src/data/faq.md`; `prompts/comparison.txt` equals `buildComparisonInstructions()` (B1)
- [x] `writeGolden(dir, outputs)` then `diffGolden(dir, outputs)` → `{ changed: [], added: [], removed: [] }` (B2)
- [x] one byte changed, one path new, one path dropped → `changed: ["site/a.txt"]`, `added: ["site/new.txt"]`, `removed: ["site/b.txt"]` (B2)
- [x] CLI `diff --golden <missing>` → exit 1, stderr `No golden snapshot at <missing>; run npm run golden:capture` (B2)
- [x] CLI `diff` exits 1 and prints the drifted path when a file differs; exits 0 with `Golden diff: empty` when none does (B2)
Verify: `node --test test/golden.test.mjs` (pre: new file)
Skills: none
Status: done @ f3d40da
Writer: Opus 5.5

### T2 — Owner config schemas, validator and loader
Delivers: B3, B4, B5, B6 · Blocked by: none · Lane: contract
Budget: code +220 · tests +130
Seam: `scripts/owner.mjs` `resolveOwnerRoot({ env, deploy, engineRoot })`, `loadOwner(...)`; `schemas/owner.schema.json`, `schemas/site.schema.json` (fields per the docs plan sketch); `examples/owner/owner.json`, `site.json`
Accept:
- [x] `loadOwner` on `examples/owner` → `owner.name.full === "Ada Example"`, `owner.slug === "ada-example"`, `site.schemaVersion === 1`, `root` is that path (B3)
- [x] errors: `owner.json: site.origin is required` · `owner.json: slug must match ^[a-z0-9]+(-[a-z0-9]+)*$` · `owner.json: site.extra is not allowed` · `site.json: schemaVersion must be 1` · malformed `site.json` starts `site.json: invalid JSON` (B4)
- [x] resolution: `AGENT_CV_OWNER_ROOT`, else `AGENT_CV_PRIVATE_ROOT`, else an existing sibling `agent-cv-private`, else `<engine>/examples/owner`; one case each (B5)
- [x] `AGENT_CV_OWNER_ROOT=/missing` → `Owner root /missing does not exist (from AGENT_CV_OWNER_ROOT)`, with and without `deploy` (B5)
- [x] `deploy: true` with the fallback, and with `AGENT_CV_OWNER_ROOT` at `examples/owner` → `Refusing to deploy the example owner; set AGENT_CV_OWNER_ROOT` (B6)
Verify: `node --test test/owner.test.mjs` (pre: new file)
Skills: none
Status: done @ ccba344
Writer: Opus 5.5

### T3 — John's owner config and golden snapshot in agent-cv-private
Delivers: B1 · Blocked by: T1, T2 · Lane: operator · Risk: cheap · Runner: agent after approval
Seam: `../agent-cv-private`: append `golden/` to `.gitignore`; add `owner.json` (values from `wrangler.jsonc`, `config/admin-origin.json`, current pages) and `site.json` `{"schemaVersion":1}`; commit those three files only; push only if approved
Accept:
- [x] `loadOwner()` from the engine resolves `../agent-cv-private` and returns slug `john-viklund` (B1)
- [x] `npm run golden:capture` writes `../agent-cv-private/golden/`; `git -C ../agent-cv-private status --short` lists no `golden/` (B1)
- [x] `npm run golden:diff` right after → exit 0 (B1)
Verify: `receipt: receipts/t3-golden-capture.md — slug john-viklund · golden file count · diff exit 0 · faq.md still uncommitted` (pre: no receipt)
Skills: none
Status: done @ 26365ea
Writer: Opus 5.5

### T4 — sync:owner and the generated owner module
Delivers: B6, B7, B8 · Blocked by: T2, T3 · Lane: contract
Budget: code +70 · tests +80 · why: each resolution path that copies or refuses needs its own fixture owner
Seam: `syncOwner({ sourceRoot, destinationRoot, deploy })` in `scripts/sync-owner.mjs` (git mv of `sync-private-data.mjs`); `writeOwnerModule({ root, owner })` called by `scripts/sync-public-data.mjs`
Accept:
- [ ] valid fixture owner → copies exactly the six private files and returns `owner.slug` of the fixture (B7)
- [ ] invalid `owner.json` → rejects with `owner.json: …`; destination `data/` bytes unchanged (B7)
- [ ] `deploy: true` resolving to the example owner → rejects `Refusing to deploy the example owner…`; destination unchanged (B6)
- [ ] `npm run sync:owner` and `npm run sync:private-data` run `scripts/sync-owner.mjs`; `deploy` starts with `npm run sync:owner -- --deploy` (B7)
- [ ] imported `src/data/owner.js` deep-equals the owner without `deploy` and `analytics` (B8)
- [ ] John's checkout after the ticket: `npm run golden:diff` exit 0 and `npm run build` exit 0 (B8)
Verify: `node --test test/sync-owner.test.mjs && npm run golden:diff` (pre: new file; golden:diff not yet a script)
Skills: none
Status: todo

## Deviations
- T1: `scripts/sync-private-data.mjs` gains an exported `defaultPrivateRoot()` (F4 reuse); code ~+109 vs budget +90, tests +77 vs +70.
- T2: schemas also bound `name`, `links`, `contact`, `analytics`, `deploy` fields from the docs sketch; `location` and `analytics` optional.

## Coverage
- Outcome → T3 (golden frozen and empty diff on John's checkout), T4 (owner module plus empty diff)
- B1 → T1, T3 · B2 → T1 · B3 → T2 · B4 → T2 · B5 → T2 · B6 → T2, T4 · B7 → T4 · B8 → T4
- Out of scope: Worker identity, templates, browser scripts → untouched · `examples/private-data/`, public Markdown, `config/*.json` → untouched · PDF → not snapshotted · README/USERGUIDE → untouched; AGENTS.md → only the renamed command and variable (T4)

## Risks
- T4 is riskiest: it renames the sync script that `deploy` runs. A wrong default root would sync Ada into John's deploy; B6's refusal and the golden diff guard it.
- T3 writes in John's private repo beside an uncommitted edit; it stages files by name only.
- Not taken: a schema library (adds a dependency to a repo that has only `wrangler`).

## TODO impacts
none

## Product doc impacts
- PRODUCT.md, DESIGN.md, ROADMAP.md: absent. `design.md`: no changes.
- `AGENTS.md` "Data boundaries": `sync:private-data … AGENT_CV_PRIVATE_ROOT` becomes `sync:owner … AGENT_CV_OWNER_ROOT`, alias kept for one release (T4).
