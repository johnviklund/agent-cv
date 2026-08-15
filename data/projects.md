# Selected AI projects

## Product Studio — governed multi-agent execution loop

**Status:** Active local-first personal system with a public repository; not commercially launched.

A local-first control plane for running AI coding-agent work across repositories as a governed lifecycle: idea, brainstorm, spec, plan, execute, review, test, ship, and learn.

The implemented baseline is a Next.js and TypeScript application where versioned `.founder/` artifacts are durable workflow truth, a deterministic controller owns transitions and evidence checks, a connected Agent Client Protocol runtime performs bounded attempts, and SQLite remains a rebuildable projection. Agents cannot approve their own work; reviewer access stays source-read-only. The public architecture document clearly separates this working baseline from later service, policy, and orchestration options.

**Stack:** Next.js, TypeScript, Tailwind, shadcn/ui, better-sqlite3, and an Agent Client Protocol adapter.

**Verified scale on 15 August 2026:** 1,127 tracked files and 44 test files in the complete public Git tree.

**Public repository:** [github.com/johnviklund/product-studio](https://github.com/johnviklund/product-studio)

## CX Intelligence — governed AI topic classification

**Status:** Ongoing proof of concept with selected Volvo Cars markets; not production.

Converts fragmented support contacts and survey signals into evidence-backed Customer Experience Intelligence. The current architecture uses two-stage GPT-5 topic induction and classification, governed Snowflake procedures, a human review queue, first-class coverage and confidence signals, Microsoft Foundry guidance agents, and a React/Vite validation interface.

The design separates what probabilistic AI may suggest from what governed data procedures are allowed to promote.

**Verified validation milestone:** 15 candidate topics reviewed; 74 agree and 26 disagree; eight pass and six escalate; zero promotion mutations; approximately $11 of AI-service cost; usefulness verdict closed Yes on 11 August 2026; specificity, coverage, and distinctness each scored 3/3.

## workflow — personal agent methodology

**Status:** Active, maintained, and used daily.

A file-backed instruction system for a solo-development loop: brainstorm, spec, plan, execute, review, and learn. Work is organized around vendor-neutral seats, cross-vendor review is an invariant, and model-routing changes are evaluated before adoption rather than silently self-modifying.

**Scale:** 18 skill Markdown files and five top-level skills as of July 2026.

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
