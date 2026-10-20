Command: workflow brainstorm forkable-example-owner
Created: 2026-10-19
Base:    7c1c018
Inputs:  none
Status:  done

## Problem
Ada Example (`examples/owner/`) has no `data/` folder, and the engine reads the four public sources from John's `data/`. A fork cannot build Ada, cannot prove her output has no trace of John, and the footer credit "Built with Agent CV" does not exist yet. This is run 1 of plan unit U7; `npm run setup` and the README are run 2.

## Outcome
`AGENT_CV_OWNER_ROOT=examples/owner npm run check` builds a complete Ada site (pages, ten Markdown sources, evidence) and fails if any built output names John. Every page of every owner shows the footer credit. CI runs against Ada.

## Behaviours
- B1 — Ada's root holds all ten `data/*.md` and `sync:owner` plus `sync:data` run on it → both succeed and `public/cv.md` contains "Ada Example"
- B2 — John's four public sources are read from `agent-cv-private/data/` → `golden:diff` differs from golden only by the footer (B5)
- B3 — scan of Ada's `build/site/`, `public/` and `src/data/` → no "john", "viklund" or "johnviklund" (case-insensitive) outside the upstream credit URL
- B4 — "John" injected into one Ada output file → the leak check fails and names the file; the clean build passes (inside `npm run check`)
- B5 — any rendered HTML page, for Ada or John → ends with "Built with Agent CV" linking to the upstream URL constant
- B6 — Ada's ten sources and `comparison-evidence.json` are validated → all pass and the six private-slot files hold fictional text only
- B7 — the CI workflow file is read → it runs `npm run build` with `AGENT_CV_OWNER_ROOT=examples/owner` and has no `bootstrap:data` step
- B8 — `deploy` run against the example owner → refused (existing behaviour, regression test kept)

## Decisions
- D1 — `sync-public-data` reads all ten sources from the owner root; John's four are copied additively into `agent-cv-private/data/`, engine `data/` stays until U8 — Ada cannot build otherwise (code: scripts/sync-public-data.mjs)
- D2 — leak check scans Ada's built output only; the tree-wide check on tracked files lands in U8 — an allowlist of 27 files would be dead code (product call)
- D3 — the upstream URL lives in one engine constant; the scan strips that exact URL before matching — it contains "johnviklund" (product call)
- D4 — split U7: this run is Ada, leak check, footer, CI; run 2 is `setup`, README, USERGUIDE — `setup` touches Cloudflare and needs its own review (product call)
- D5 — `setup` (run 2) copies and renames `examples/owner/`, runs `git init`, prints the Cloudflare commands, runs none — testable offline (product call)
- D6 — the footer adds one line to John's output, recorded as a golden exception — unavoidable (product call)

## Test seams
- build-site render of all pages for Ada and John — B5 (existing: test/site-rendering.test.mjs)
- leak scan function over a built directory — B3, B4 (new)
- `syncOwner` / `sync-public-data` against `examples/owner` — B1, B2, B6 (existing: test/sync-owner.test.mjs)
- `deploy` refusal — B8 (existing: test/owner.test.mjs)
- CI workflow file read by a test — B7 (new)

## Out of scope
- `npm run setup`, README "Create your own Agent CV", USERGUIDE — run 2 (D4)
- Tree-wide leak check on tracked files, deleting John's `data/`, `public/` copies, `bootstrap:data` and `examples/private-data/` — U8 cutover
- Renaming the GitHub repo — owner's call, not needed (D3)
- Deferred C1-2/C1-3 from forkable-maintenance-tooling — unrelated

Docs read: none in scope (PRODUCT.md absent; design.md untouched)
