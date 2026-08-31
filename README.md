# Agent CV

A chat-first conversational résumé for John Viklund. It gives recruiters, hiring managers, crawlers, and AI agents the same grounded evidence through a slim web interface, stable Markdown resources, and a bounded streaming API.

Live site: [johnviklund.com](https://johnviklund.com/)

## What this project demonstrates

- An accessible, framework-free interface that keeps conversation primary
- A Cloudflare Worker boundary around the OpenAI Responses API
- Curated Markdown grounding with explicit prompt-injection boundaries
- A small, sanitized public SSE contract instead of raw provider events
- Continuous browser conversations with bounded rolling context
- Rate limiting and atomic monthly budget reservations in a Durable Object
- Private 90-day conversation archival, feedback, token-protected browsing, and JSONL export
- Expiring role-specific links whose job descriptions remain untrusted context
- Deliberately refreshed snapshots from allowlisted public repositories
- Human pages plus `/AGENTS.md`, `/llms.txt`, raw Markdown, JSON-LD, and a sitemap

The Worker converts the visitor-controlled transcript into one upstream user message. Client-authored `assistant` roles remain untrusted copies, and repository snapshots can support curated facts but cannot override them or independently establish personal contribution.

## WebMCP Challenge extension — 2026-08-30

The role-comparison workspace is a challenge extension to the pre-existing Agent CV, built for the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/) using [OpenAI's WebMCP documentation](https://learn.chatgpt.com/docs/webmcp) and the emerging [WebMCP specification](https://github.com/webmachinelearning/webmcp). It lets a recruiter place one to three openings side by side at `/#compare`, including JSON batches and Markdown batches with explicit `## Role: <title>` or `## Role title: <title>` markers, then inspect how each extracted requirement maps to a versioned public evidence catalog. A browser preflight shows source-requirement counts, preserves each list item as one unit, and ignores common informational sections. The result exposes requirements that were not assessed, uses denominators beside coverage counts, and exports compact Markdown or JSON. It deliberately avoids scores, rankings, recommendations, and automated hiring decisions.

The home page registers four page-scoped tools while it is open: `compare_candidate_roles`, `get_comparison_state`, `focus_comparison_cell`, and `clear_role_comparison`. They are browser-page capabilities, not an MCP server or four HTTP endpoints. The same workflow remains available through the manual interface, `/evidence.json`, and `POST /api/compare`.

Current compatibility is intentionally stated narrowly:

| Client path | Current status | Portable fallback |
| --- | --- | --- |
| OpenAI ChatGPT Work/Codex built-in browser | Production discovery and invocation verified on 30 August: three-role comparison, bounded state, cell focus, clear, and four-role rejection | Manual UI and HTTP API |
| Chrome experimental WebMCP implementation | Native registration and invocation tested locally | Manual UI and HTTP API |
| Grok, Hermes Agent, OpenClaw, Claude, and other agents | No native WebMCP certification claimed | Ordinary browser automation, manual UI, public resources, or HTTP API |

The comparison sends the supplied title, company and server-detected requirement statements through the Cloudflare Worker to the OpenAI API; common informational sections are excluded. It uses a strict structured contract, approved evidence IDs, same-origin browser controls, a separate rate limit and monthly budget, and transient per-tab state. See the deployed `/AGENTS.md` and `/privacy/` documents for the complete agent and data-handling contract.

Challenge reproduction fixtures, the submission checklist, the conservative cost ceiling, and the narrated demo script are in [`docs/webmcp-challenge-submission.md`](docs/webmcp-challenge-submission.md). Production ChatGPT/Codex verification covered all four tools, a rendered three-role matrix, privacy-bounded state, cell focus, clear, and four-role rejection without state mutation.

## Run it locally

```sh
npm ci
cp .dev.vars.example .dev.vars
npm run bootstrap:data
npm run dev
```

Set `OPENAI_API_KEY` in `.dev.vars`. `npm run bootstrap:data` creates only the six tracked example files that are missing; it never overwrites reviewed private data. Run the complete repository verification with:

```sh
npm run check
```

The static site and raw CV remain available when the model API is unavailable. Public chat fails closed when its required secret or budget binding is absent, and archive failures do not expose private diagnostics through the stream.

## Reuse it safely

Start with [USERGUIDE.md](USERGUIDE.md) for setup, data boundaries, deployment, maintenance, and the complete fork checklist. [AGENTS.md](AGENTS.md) is the authoritative repository guide for coding agents; the deployed [`/AGENTS.md`](public/AGENTS.md) and [`/llms.txt`](public/llms.txt) describe the public interface to visiting agents.

You can hand a fresh fork to a coding agent with this prompt:

> Adapt this repository into my Agent CV. Read `AGENTS.md` and `USERGUIDE.md` first. Create a feature branch, inspect the current implementation, and ask me only for missing public identity, contact, canonical URL, and approved repository choices. Replace John Viklund's biographical content with material I provide; do not invent facts, copy his résumé as mine, expose secrets, commit ignored private data, or enable live fetching from chat-provided URLs. Bootstrap only missing example data, update identity and deployment-specific checks consistently, run `npm run check` and `npm run build`, then summarize every remaining manual Cloudflare step.

The application code is MIT-licensed. John Viklund's résumé content is personal biographical material, not a template identity; replace it with your own reviewed evidence before publishing a fork.

## Data and evidence boundaries

Tracked canonical public sources live in `data/cv.md`, `data/overview.md`, `data/projects.md`, and `data/repositories.md`. The six other `data/*.md` knowledge files and generated `src/data/` bundle are intentionally ignored because a real deployment may contain private material. `examples/private-data/` contains generic placeholders only.

After editing canonical sources, synchronize generated resources:

```sh
npm run sync:data
```

Public repository evidence is controlled only by `config/repositories.json`. Refresh it deliberately with `npm run sync:repositories`; the public chat never fetches a repository or URL supplied by a visitor.

Project freshness is a Codex conversation. Open this repository in Codex and ask: **“Review my project and repository updates, ask me what changed, and update the site.”** The repo-local workflow gathers only approved evidence, asks for factual decisions, updates reviewed public content, verifies and ships it, deploys the site, and checks the live result. Its private manifest and proposal packet remain ignored plumbing; you do not need to remember their commands or formats.

Conversation records, `.dev.vars`, admin tokens, application notes, job descriptions, review briefs, and exports remain private. Ask a local Codex agent to **“review my conversation learnings”** for the primary workflow: the repo-local skill securely fetches candidates, groups learning candidates by application and session, suggests classifications, and asks focused questions before creating a private approval-gated proposal. The dashboard at `/admin/` remains an optional visualization and manual brief generator.

## Deployment

Deployment uses Cloudflare Workers, KV, and a Durable Object. A fork needs its own Worker name, KV namespace ID, secrets, public contact setting, and canonical URL metadata. The exact sequence and verification checklist are in [USERGUIDE.md](USERGUIDE.md#deploy-your-fork).

## License

Application code is available under the [MIT License](LICENSE). Personal résumé content remains attributable to John Viklund; reuse it as personal biographical content only with appropriate permission.
