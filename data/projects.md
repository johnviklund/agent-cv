# Selected AI projects

## CX Intelligence — governed AI topic classification

**Status:** Working proof of concept moving into beta; not production.

Turns governed Customer Care and survey signals into evidence-backed intelligence about customer friction: where customers hit effort, confusion, repeat contact, or failed self-service. Each customer topic carries its evidence, a Customer Friction Score, sentiment, weekly trends, market and vehicle-model heat maps, related social conversations, and self-service coverage, plus a recommended next step that can be "keep watching." A daily Pulse edition summarizes what is worth following.

Topics are not embedding clusters. A language model proposes topics with defining conditions and include/exclude guidance into a versioned catalog, and a shortlist-and-verify classifier links each contact to every topic whose condition it shows. A model identifies friction outcomes; deterministic code computes scores, counts, and coverage.

The design principle is that agents think and the backend decides. Microsoft Foundry worker agents propose, independent reviewer agents challenge, and deterministic policy over governed Snowflake procedures activates changes with versioning and one-step rollback. The target operating model replaces routine approval queues with people who comment, flag, pause, and roll back. Models are chosen per task and compared on the same frozen inputs for correctness, evidence support, unsupported claims, latency, failure rate, and cost.

Production adoption and business impact have not yet been measured.

## j-skills — skills for coding agents

**Status:** Active, public, MIT-licensed, and used daily.

Ten skills for Claude Code, Codex CLI, and GitHub Copilot CLI. The core `workflow` skill takes a coding task through brainstorm, plan, execute, review, and wrap, with saved run state so a fresh session can resume, a reviewer normally from a different model vendor, and per-step model routing. Supporting skills cover app verification, durable memory, session retrospectives, cited HTML explainers, plain-language rewriting, and writing instructions for agents.

The `evals` skill grades candidate reviewer models against golden sets for bug detection and false alarms, so model-routing changes are measured before adoption rather than silently self-modifying. It evolved from John's earlier private workflow methodology.

**Scale on 15 October 2026:** ten skills, 79 tracked files, and 71 commits since 3 October 2026; plugin version 2.2.0.

**Public repository:** [github.com/johnviklund/j-skills](https://github.com/johnviklund/j-skills)

## CX Newsletter — AI-scored research curation

**Status:** Active and in production use at Volvo Cars.

A resumable Python pipeline that scans external sources, scores relevance to Customer Experience and Customer Care, and produces daily or weekly newsletter drafts plus a wiki-backed research base.

**Architecture:** Typer CLI; scan, import, score, wiki, and draft stages; GitHub Copilot CLI; a Claude Sonnet-class model; feedparser; httpx; trafilatura; BeautifulSoup; TinyDB; Pydantic; manifest tracking and partial-failure recovery.

**Scale:** 236 curated sources and approximately 1,867 wiki knowledge files.

## Volvo Evidence CLI — citation-first retrieval

**Status:** Shipped v1; private/internal Volvo Cars work.

A Go CLI that retrieves market-scoped evidence from official sources and returns deterministic citations instead of generated answers. It uses Cobra, SQLite/FTS5, GraphQL, locale normalization, retries, rate limiting, and coverage diagnostics.

**Scale:** approximately 44 Go source files; v1 coverage diagnostics shipped 10 July 2026.

## Agentoria — a living world for agent activity

**Status:** Active personal side project; MVP in progress.

A visual system that makes multi-agent task activity legible as a growing hex-tile world. The stack includes a pnpm monorepo, Three.js WebGPU/TSL, deterministic procedural generation, Wave Function Collapse, Hono, SQLite, Drizzle, REST/WebSocket communication, and a zero-dependency TypeScript SDK.

**Scale:** approximately 198 tracked files and approximately 21,600 lines of source.

## Agent CV — this site

**Status:** Public, MIT-licensed, deployed, and actively maintained.

The résumé itself is an AI system: reviewed Markdown evidence is bundled into a Cloudflare Worker prompt, visitor transcripts stay untrusted, and upstream OpenAI events are normalized into a small public SSE contract. Human pages, raw Markdown, agent discovery files, structured metadata, expiring role links, bounded public-repository snapshots, and a private 90-day conversation archive all share the same grounded source boundary. The medium demonstrates the claim that John builds applied AI systems while remaining useful when the model API is unavailable.

**Public repository:** [github.com/johnviklund/agent-cv](https://github.com/johnviklund/agent-cv)

## Volvo Cars Support — owner-support evidence retrieval

**Status:** Personal prototype.

An OpenClaw skill that searches public Volvo owner manuals, knowledge articles, PDFs, and support content through Volvo's GraphQL API. It demonstrates a lightweight evidence-retrieval pattern: model- and market-scoped search, quoted matching passages, and links back to source material rather than unsupported generation.

**Stack:** Shell, GraphQL, `curl`, `jq`, and Markdown skill instructions.
