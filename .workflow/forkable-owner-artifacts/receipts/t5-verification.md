# T5 verification — owner manifests

Commit: b739df7 (private f2bdbf7, before the engine deletion) · Writer: Opus 5.5 · 2026-10-19

| Check | Result |
|---|---|
| Private `repositories.json`, `comparison-evidence.json` | `cmp`-identical to engine `config/` copies, committed f2bdbf7 |
| Verify: `node --test test/repository-grounding.test.mjs test/comparison-evidence.test.mjs test/owner-manifests.test.mjs test/comparison-core.test.mjs test/owner-runtime.test.mjs` | 43 pass, 1 skip, 0 fail (pre: 37 pass, 1 skip) |
| John `npm run sync:data` | 22 evidence items; `git status public src/data` clean (evidence unchanged) |
| `npm run check` / `npm run build` | exit 0; 276 pass, 3 skip |
| `npm run golden:diff` | exit 0; 0 unlisted |
| Disposable copy (git-initialised, no sibling owner repo, no owner env): `npm run bootstrap:data && npm run build` | exit 0; 267 pass, 12 skip (John-only), 0 evidence items; Worker name `ada-example-agent-cv` |
| Mutation: evidence manifest read from engine `config/` | owner-manifests 5 fail |
| Mutation: allowlist read from engine `config/` | owner-manifests 6 fail |
