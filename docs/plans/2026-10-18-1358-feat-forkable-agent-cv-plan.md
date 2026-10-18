---
title: Forkable Agent CV - Plan
type: feat
date: 2026-10-18
artifact_readiness: draft-for-review
execution: code
---

# Forkable Agent CV - Plan

## Goal Capsule

- **Objective:** Anyone can deploy their own Agent CV from this repository by supplying an owner directory, without editing engine code, and can later pull engine improvements with `git pull upstream main` without conflicts.
- **Means:** Split the repository into an engine (this repo) and an owner directory (a separate repo per owner). One validated owner config plus one structured site-content file replace every hard-coded identity string and every hand-written HTML page.
- **First proof:** John's live site builds from his own owner repo with no visible changes, and a fictional example owner ("Ada Example") builds from `examples/owner/` and contains no trace of John.
- **Out of scope:** The owner MCP server (step 2), the public Agent CV spec (step 3), hosted multi-tenancy, per-claim provenance, model providers other than OpenAI, translated interfaces.
- **Stop conditions:** Stop and ask if John's live output changes in any way not listed in this plan, if the refactor requires a runtime fetch of owner data, or if private owner material could reach a public build of the example owner.

## Decisions

- **John's content moves to `agent-cv-private`.** (user-decided 2026-10-18; chosen over keeping it in this repo under `owner/` or creating a new repo.) The existing private repo grows into John's owner repo, so one sync path covers public and private material. The engine repo ships only the example owner.
- **The engine repo is clean.** (user-decided 2026-10-18.) Every John-specific file moves to `agent-cv-private`, including the public Markdown sources, which then exist publicly only on the site. The only tracked mentions of John left in the engine are the `LICENSE` copyright line and the maintainer credit in `README.md`. The leak check enforces this across the whole tracked tree.
- **Owner repos are private.** (user-decided 2026-10-18.) `README.md` tells owners to keep their owner directory in a private GitHub repo next to their engine fork, and explains how.
- **Every deployment shows "Built with Agent CV".** (user-decided 2026-10-18.) The engine templates render the credit in the footer, linking to the upstream repository. Owners don't configure it.
- **Editorial content is structured data rendered by engine templates.** (user-decided; chosen over owner HTML overrides and Markdown pages.) Owners and their agents edit `site.json`, never HTML. Design fixes reach every fork.
- **Forks upgrade by pulling upstream.** (user-decided; chosen over an npm package.) Only the owner directory belongs to the owner, so pulls don't conflict. The layout should allow a package later.
- **Owner data enters only at build time.** (existing rule, extended.) `AGENT_CV_OWNER_ROOT` replaces `AGENT_CV_PRIVATE_ROOT`. Nothing fetches owner data at runtime.
- **Deploys fail closed.** `npm run deploy` refuses to use the example owner and refuses to run when the owner root is missing or invalid.
- **Engine text names the owner and never uses pronouns.** Pronouns appear only in owner-written prose.

## Inventory: what is owner-specific today

About 190 mentions of John across about 30 files, in five kinds:

| Kind | Where | Becomes |
|---|---|---|
| Identity strings | Prompt in `src/chat-core.js:68-87`, `src/comparison-core.js:24`, `public/app.js`, `public/application.js`, `public/comparison-view.js`, `public/webmcp.js` | Values from `owner.json` |
| Origin and domain | `CANONICAL_ORIGIN` and hosts in `src/worker.js:34`, `config/admin-origin.json`, `wrangler.jsonc` routes, `robots.txt`, `sitemap.xml`, canonical links, JSON-LD, `scripts/check-static.mjs` | `owner.json` `site.origin` and `site.hosts` |
| Editorial page content | All nine HTML pages: hero, proof points, selected work, timeline, about prose, case studies, project pages, starter and follow-up questions, privacy contact wording | `site.json` rendered by templates |
| Deploy settings | KV namespace ID, contact email, model and budget vars in `wrangler.jsonc`; Cloudflare analytics beacon token in nine pages | `owner.json` `deploy` section, merged into a generated Wrangler config |
| Owner content files | `data/*.md` (public and private), `config/repositories.json`, `config/comparison-evidence.json`, OG image text in `scripts/build-og-image.mjs`, PDF header and links in `scripts/cv-pdf.mjs`, PDF filename `john-viklund-cv.pdf` | Files in the owner directory; the PDF filename comes from `owner.json` `slug` |

Maintenance tooling also names John: `scripts/review-conversations.mjs`, `scripts/project-review.mjs`, `public/conversation-review.js`, `scripts/sync-github-repositories.mjs` (user agent), both repo-local skills, `README.md`, `USERGUIDE.md`, `AGENTS.md`, `design.md`, and 16 test files.

John-specific documents move out entirely: `docs/webmcp-challenge-submission.md`, the WebMCP plan in `docs/plans/`, this plan once it is done, the WebMCP challenge section of `README.md`, and the operator instructions in `AGENTS.md` ("When John asks…"). In the engine, `AGENTS.md` and the skills refer to "the owner". John's operator notes live in `agent-cv-private/AGENTS.md`.

## Target layout

```text
agent-cv/                      engine (this repo)
  src/                         Worker; reads generated src/data/owner.js
  site/templates/              page templates as JS functions (no dependencies)
  site/assets/                 app.js, styles.css, fonts, favicon (engine-owned, today's public/ assets)
  scripts/
  examples/owner/              Ada Example: complete, fictional, public
  build/site/                  generated assets directory (gitignored)
  wrangler.base.jsonc          engine bindings, migrations, rate limiters

<owner repo>/                  one private repo per owner; agent-cv-private for John
  AGENTS.md                    the owner's operator notes for coding agents
  owner.json                   identity, site, deploy settings
  site.json                    editorial page content
  data/*.md                    all ten Markdown sources (public and private)
  repositories.json            repository allowlist
  comparison-evidence.json     comparison evidence manifest
  assets/                      optional: favicon, extra images
```

Generated owner-specific output (HTML pages, `cv.md`, `llms.txt`, `AGENTS.md`, `sitemap.xml`, the PDF, `src/data/`, the Wrangler config) is gitignored in the engine repo and built from the owner root on every check, build and deploy.

## Owner config sketch

```json
{
  "schemaVersion": 1,
  "slug": "ada-example",
  "name": { "full": "Ada Example", "short": "Ada" },
  "headline": "Staff engineer, distributed systems",
  "location": "Lisbon, Portugal",
  "site": {
    "origin": "https://ada.example",
    "hosts": ["ada.example", "www.ada.example"],
    "lang": "en",
    "sourceRepository": "https://github.com/ada-example/agent-cv"
  },
  "links": { "linkedin": null, "x": null, "github": "https://github.com/ada-example" },
  "contact": { "email": null },
  "analytics": { "cloudflareBeaconToken": null },
  "deploy": {
    "workerName": "ada-example-agent-cv",
    "archiveNamespaceId": "…",
    "vars": { "OPENAI_MODEL": "…", "MONTHLY_REQUEST_CAP": "1000" }
  }
}
```

`site.json` holds the home hero, proof points, selected work, starter and follow-up questions, the experience timeline, about-page sections, project and case-study entries, and footer text. Both files are validated against schemas with errors that name the field and file. The schemas are an early draft of the step 3 spec.

## Execution runs

The units are executed in four runs. Each run is one `workflow execute` session, one PR and one `workflow review`, with one commit per unit inside the PR so a single unit can be reverted. Every run ends with `npm run check` and an empty `npm run golden:diff` (apart from exceptions listed in its units).

| Run | Units | Delivers | Gate |
|---|---|---|---|
| A | U0, U1 | Golden snapshot, owner config, schemas, loader, `sync:owner` | No visible change; new tests pass |
| B | U2, U3, U4 | John's site rendered from `owner.json` and `site.json`: Worker prompts, page templates, browser scripts | Golden diff empty; review most carefully, this is the largest run |
| C | U5, U6, U7 | Generated Wrangler config, PDF and OG image, tooling and skills, Ada Example, leak check, `npm run setup`, README | Ada builds with no trace of John; a clean-clone setup works |
| D | U8 | Cutover to `agent-cv-private`, clean engine tree, deploy, live verification | Live site verified; run attended |

- Don't merge A into B: the snapshot must exist before any rendering code changes.
- Don't merge D with anything: it deletes tracked content and deploys.
- U6 may run in a parallel worktree while run B is in review. Nothing else runs in parallel, because B and C both change the build scripts.

To start a run, give the session: "workflow execute run A of `docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md`".

## Implementation units

Ordered by dependency and grouped into the runs above. Each unit is one commit with `npm run check` passing.

### U0. Golden snapshot of John's site

Before any refactor, build John's site and save the full output (`public/` after `sync:data`, the rendered system prompt, the comparison prompt, `llms.txt`, `AGENTS.md`, the sitemap, and the Wrangler config) to an ignored `golden/` directory in John's owner repo. Add `npm run golden:diff`, which rebuilds and diffs against it. Every later unit must keep the diff empty or limited to changes listed in that unit.

### U1. Owner config, schemas and loader

- Add the `owner.json` and `site.json` schemas and `scripts/owner.mjs`, which resolves `AGENT_CV_OWNER_ROOT` (falling back to `examples/owner/` only outside deploy), validates both files and returns typed values.
- Generalize `sync:private-data` into `sync:owner`, which copies the whole owner directory's sources into the engine's ignored build locations. Keep `sync:private-data` as an alias for one release.
- Generate `src/data/owner.js` during `sync:data`.
- Tests: valid and invalid configs, error messages, deploy refusing the example owner.

### U2. Worker identity

- The chat prompt and the comparison prompt become functions of the owner config. Rules stay word for word, with only the name substituted.
- `CANONICAL_ORIGIN` and the allowed hosts come from `owner.js`.
- Tests: prompt snapshots for John and Ada; the existing worker, chat-core and comparison-core tests parameterized by owner.
- Golden diff: empty.

### U3. Site templates and generated pages

- Move engine assets from `public/` to `site/assets/`. Convert each HTML page into a template function in `site/templates/`, with an escaping helper and no new dependencies.
- `scripts/build-site.mjs` renders the pages, `robots.txt`, `sitemap.xml`, `llms.txt` and public `AGENTS.md` into `build/site/`, and copies assets and synced Markdown there.
- Point the Wrangler `assets.directory` to `build/site/`.
- Write John's `site.json` from his current pages, word for word.
- Rewrite `scripts/check-static.mjs` to check against the owner's origin instead of `johnviklund.com`.
- Golden diff: empty except whitespace differences from templating, which must be reviewed once and listed.

### U4. Browser scripts

- Templates render the owner's names into `<html data-owner-name="…" data-owner-short-name="…">`. `app.js`, `application.js`, `comparison-view.js` and `webmcp.js` read them instead of hard-coded strings.
- Tests: the browser-module tests run with both owners.

### U5. Build artifacts and deploy configuration

- `cv-pdf.mjs` and `build-og-image.mjs` read `owner.json`. The PDF is written to `/<slug>-cv.pdf`; John's slug keeps `/john-viklund-cv.pdf` working.
- `scripts/build-wrangler-config.mjs` merges `wrangler.base.jsonc` with the owner's `deploy` section and routes into an ignored generated config. Every Wrangler script uses it.
- `admin-origin.json`, `repositories.json` and `comparison-evidence.json` move to the owner directory.
- Golden diff: the generated Wrangler config equals today's `wrangler.jsonc` in content.

### U6. Maintenance tooling and skills

- Replace "John" with the owner's name in the review scripts, the admin conversation-review brief and the sync user agent.
- Update both repo-local skills so they edit canonical content in the owner repo, commit and push there, then deploy from the engine. "Update the site" now spans two repos; the skills keep handling that for John so he doesn't need to know.
- Update `AGENTS.md` data-boundary rules for the owner root.

### U7. Example owner, leak check and setup

- Complete `examples/owner/` for Ada Example: every page, every Markdown source, plausible but clearly fictional content, no private material.
- Leak check in `npm run check`: building Ada must produce no occurrence of "John", "Viklund" or "johnviklund", and neither may any tracked file except the `LICENSE` copyright line and the `README.md` maintainer credit. Tests use Ada or a second fictional owner, not John.
- The "Built with Agent CV" footer credit is in every template, linked to the upstream repository.
- `npm run setup`: asks for name, slug and domain, copies `examples/owner/` to a new owner directory next to the fork (default `../agent-cv-private`), runs `git init` there, creates the KV namespace, sets the OpenAI and admin secrets, and prints next steps.
- `README.md` "Create your own Agent CV": fork or use the template; create a **private** GitHub repo for the owner directory (`gh repo create <you>/agent-cv-private --private`) and why it must be private (it holds private profile files, deploy IDs and operator notes); clone it next to the fork or set `AGENT_CV_OWNER_ROOT`; run setup; deploy; upgrade with `git pull upstream main`. `USERGUIDE.md` carries the detailed version.
- CI runs the full check against Ada, so the engine repo stays verifiable without John's private repo.

### U8. Cutover and live verification

- In `agent-cv-private`, commit John's complete owner directory: the four public Markdown sources, `owner.json`, `site.json`, `repositories.json`, `comparison-evidence.json`, the John-specific docs listed in the inventory and his operator `AGENTS.md`. Verify the golden diff from there before touching the engine.
- In the engine, remove all of that in the same PR that switches the default to the example owner, then run the leak check across the tracked tree. Git history is not rewritten (see open questions).
- Deploy John's site from the engine with `AGENT_CV_OWNER_ROOT` pointing to his owner repo.
- Verify the live site: every page, raw Markdown, `/AGENTS.md`, `/llms.txt`, `/sitemap.xml`, the PDF, a chat, a comparison, an application link and admin export.
- Update the README's description: the repo is now an open-source Agent CV engine, and John's site is one deployment of it.

## Verification

- `npm run check` and `npm run build` pass against Ada in CI and against John's owner repo locally.
- `npm run golden:diff` is empty for John at every unit, apart from the listed exceptions.
- The leak check passes for Ada.
- A clean clone, `npm ci`, `npm run setup` with a fictional owner and `npm run dev` gives a working local site with no edits to engine files.

## Risks

- **The template conversion silently changes John's pages.** Mitigated by the U0 golden diff on every unit.
- **Generated owner output is accidentally committed in the engine repo.** Mitigated by `.gitignore`, the leak check and a test that fails if `build/` or `src/data/` is tracked.
- **Private owner files reach a public build.** The existing six-file private allowlist stays, and the example owner contains no private files that could be mistaken for real ones.
- **Two-repo shipping adds steps.** The skills absorb them for John; for other owners the setup docs cover them.
- **Static checks and tests are tied to John's strings.** They become owner-parameterized in U2–U4 rather than deleted.

## Open questions

1. **Git history.** "Clean" here means the current tree. The 48 existing commits still contain John's content. That content is all public on the site anyway, and rewriting history would break existing PR links, forks and the cited commits. Recommendation: don't rewrite.

Resolved 2026-10-18: owner repo is `agent-cv-private`; public Markdown sources move there; every deployment shows "Built with Agent CV".
