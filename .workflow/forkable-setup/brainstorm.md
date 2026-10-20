Command: workflow brainstorm forkable-setup
Created: 2026-10-20
Base:    f116aed
Inputs:  none
Status:  done

## Problem
`forkable-cutover` deletes `bootstrap:data`, the only fork on-ramp, and that script only fills the legacy engine `data/`. A new owner today must hand-copy `examples/owner/`, create the KV namespace and set secrets with no guide that matches the owner-root model.

## Outcome
A fork owner runs `npm run setup` and gets a git-initialised owner directory next to the fork, with their identity in `owner.json`, the KV ID filled in and secrets set; README "Create your own Agent CV" and USERGUIDE describe that path. Surface: the CLI output and the new owner directory; `npm run deploy` warns while the content is still Ada's.

## Behaviours
- B1 — `npm run setup -- --name "Grace Hopper" --slug grace-hopper --domain grace.example --skip-cloud --target <empty dir>` → target holds a copy of `examples/owner/`, `git init` done, `owner.json` has that slug, full/short name, origin `https://grace.example`, hosts `[grace.example, www.grace.example]` and worker name `grace-hopper-agent-cv`; prints next steps
- B2 — target exists and is non-empty → exit 1, names the directory, writes nothing
- B3 — missing flag in a terminal → prompts for it; missing flag with no terminal → exit 1 naming the flag
- B4 — without `--skip-cloud` → runs `wrangler kv namespace create ARCHIVE`, writes the returned ID to `deploy.archiveNamespaceId`, then sets `OPENAI_API_KEY` and `ADMIN_API_TOKEN` secrets (test: injected runner records the calls)
- B5 — a cloud step fails → exit 1, names the step and the retry command; the copied directory stays, `owner.json` keeps earlier-completed values
- B6 — the generated owner directory → `AGENT_CV_OWNER_ROOT=<dir> npm run check` passes (sync, site build and tests against it)
- B7 — `npm run deploy` while any owner file contains "Ada Example" → fails before packaging naming the files (example-owner refusal stays)
- B8 — README "Create your own Agent CV" and USERGUIDE → follow setup, a private owner repo (`gh repo create ... --private`), `AGENT_CV_OWNER_ROOT`, deploy and `git pull upstream main`; no `bootstrap:data` step in the fork path

## Decisions
- D1 — setup does local plus Cloudflare, each cloud step skippable with `--skip-cloud`; a failure keeps the local copy (product call)
- D2 — flags for every answer, prompts for missing ones on a terminal (product call)
- D3 — rewrite `owner.json` identity fields only; Ada's prose stays, USERGUIDE carries the coding-agent prompt for content (product call)
- D4 — refuse a non-empty target, never merge or overwrite (code: AGENTS.md data rules)
- D5 — `bootstrap:data`, John's README text and `examples/private-data/` stay for `forkable-cutover` (product call)
- D6 — default target `../agent-cv-private`, matching `resolveOwnerRoot` (code: scripts/owner.mjs)
- D7 — OpenAI key via `request`-style prompt or `OPENAI_API_KEY` env, piped to wrangler stdin, never written to disk or argv; admin token reuses `scripts/configure-admin-secret.mjs` logic (code: scripts/admin-secret-file.mjs)

## Test seams
- `scripts/setup.mjs` exported `runSetup({args, env, run, isTTY})` with an injected command runner — observes B1–B5 (new)
- `npm run check` with `AGENT_CV_OWNER_ROOT` on the generated dir — observes B6 (existing)
- `syncOwner({deploy:true})` — observes B7 (existing, extend)
- docs-parity test of README/USERGUIDE headings and commands — observes B8 (new)

## Out of scope
- Removing `bootstrap:data`, `examples/private-data/`, John-specific README/USERGUIDE text — forkable-cutover
- Find-and-replace of Ada's prose — fragile, fake claims
- Deploy and live checks — forkable-live-verify
- TODO.md item C1-2 (conversation review cursor order) — unrelated to setup

Docs read: none in scope (PRODUCT.md, DESIGN.md absent)
