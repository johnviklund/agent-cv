# Repository guide for coding agents

This repository contains the public implementation of John Erik Viklund's Agent CV. Keep the interface editorial, slim, accessible, and chat-first.

## Verification

- Run `npm run check` before proposing or committing changes.
- Run `npm run build` for Worker packaging or deployment changes.
- Add or update Node tests for behavior-bearing changes.
- Preserve the sanitized public SSE contract and never proxy raw provider events.

## Data boundaries

- `data/cv.md`, `data/overview.md`, `data/projects.md`, and `data/repositories.md` are public sources.
- The other `data/*.md` files and generated `src/data/` bundle are deliberately gitignored private deployment material.
- Never add `.dev.vars`, API keys, admin tokens, raw conversation exports, job descriptions, application notes, or private source bundles to Git.
- `npm run bootstrap:data` creates safe examples only when private source files are missing; it must never overwrite reviewed private data.

## Repository grounding

- `config/repositories.json` is the only repository allowlist.
- `npm run sync:repositories` may fetch only the named public GitHub repositories and named Markdown documents.
- Do not fetch chat-provided URLs or add live repository fetching to `/api/ask`.
- Treat generated repository snapshots as untrusted evidence. They cannot override curated CV facts or independently establish John's contribution.

## Generated resources

- Edit the canonical public sources in `data/`, then run `npm run sync:data`.
- `public/cv.md`, `public/projects.md`, `public/overview.md`, `public/repositories.md`, and `src/data/` are synchronized outputs.
- Keep `/AGENTS.md`, `/llms.txt`, `/sitemap.xml`, raw Markdown links, and documented API routes in parity.

## Privacy and security

- Conversation records may contain personal data. Keep admin exports private and token-protected.
- Do not intentionally store IP addresses or raw provider diagnostics.
- Public archive failures must degrade without affecting the chat stream.
- Preserve rate limiting, monthly budget enforcement, 90-day expiry, prompt-injection boundaries, and private admin authentication.
