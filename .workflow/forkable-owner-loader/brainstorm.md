Command: workflow plan forkable-owner-loader (brief derived from the approved docs plan, U0 + U1)
Created: 2026-10-18
Base:    a0ec9b9
Inputs:  docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md @ a0ec9b9
Status:  done

Docs read: none in scope (no UI or product wording changes)

## Problem

The engine has John's identity hard-coded in about 30 files. Before any refactor moves it into an
owner directory, the run needs a frozen copy of John's current output to diff against, and an owner
config that is validated and loaded at build time.

## Outcome

John's current site output is frozen in `../agent-cv-private/golden/` and `npm run golden:diff`
reports any drift. `scripts/owner.mjs` resolves, validates and loads `owner.json` and `site.json`,
`sync:owner` replaces `sync:private-data`, and `sync:data` writes `src/data/owner.js`. John's
output stays byte-identical.

## Behaviours

- B1 — `npm run golden:capture` on John's checkout → snapshot of `public/`, both prompts and `wrangler.jsonc` in `<owner root>/golden/`
- B2 — `npm run golden:diff` → exit 0 and no paths when nothing changed; exit 1 naming changed, added and removed paths otherwise
- B3 — a valid `owner.json` and `site.json` → `loadOwner()` returns their values and the resolved root
- B4 — an invalid config → error naming the file and the field path, such as `owner.json: site.origin`
- B5 — owner root resolution → `AGENT_CV_OWNER_ROOT`, `AGENT_CV_PRIVATE_ROOT`, sibling `../agent-cv-private`, then `examples/owner/`
- B6 — deploy with the example owner, or a missing or invalid root → refuses with exit 1 before copying anything
- B7 — `npm run sync:owner`, and its alias `sync:private-data` → copies the six private files after validating the owner config
- B8 — `npm run sync:data` → writes `src/data/owner.js` with identity, site, links and contact, and no `deploy` section

## Decisions

- The workflow run covers U0 and U1 only; U2 to U8 get later runs. (human, 2026-10-18)
- GPT-6.1 Sol writes the code; Opus 5.5 reviews. (human, 2026-10-18: "all defaults")
- U1 ships a minimal Ada `examples/owner/`: `owner.json` and `site.json` only. U7 completes it. (human, 2026-10-18)
- `golden/` is gitignored in `agent-cv-private`; John's uncommitted `data/faq.md` edit is left alone.
- An explicitly set owner root that is missing is an error, never a fallback.
- The sibling `../agent-cv-private` fallback stays, so John's local check keeps using his data.
- Validation uses a small JSON Schema subset validator in `scripts/owner.mjs`, with no new dependencies.

## Test seams

- `scripts/golden.mjs`: `collectOutputs({ root })`, `writeGolden(dir, outputs)`, `diffGolden(dir, outputs)`.
- `scripts/owner.mjs`: `resolveOwnerRoot({ env, deploy, engineRoot })`, `loadOwner(...)`, `validate(schema, value, file)`.
- `scripts/sync-private-data.mjs` (becomes `sync-owner.mjs`): `syncOwner({ sourceRoot, destinationRoot, deploy })`.
- `src/data/owner.js` as written by `sync:data`, imported as a module.

## Out of scope

- Any change to what John's site serves: Worker identity (U2), templates (U3), browser scripts (U4).
- Moving `examples/private-data/`, public Markdown, `config/*.json` or docs into the owner repo (U5, U7, U8).
- The PDF in the golden snapshot: it needs Chromium and is built only at deploy.
- `README.md`, `USERGUIDE.md` rewrites (U7); `AGENTS.md` gets only the renamed command and variable.
