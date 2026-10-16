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

## Agent CV — this site

**Status:** Public, MIT-licensed, deployed, and actively maintained.

The résumé itself is an AI system: reviewed Markdown evidence is bundled into a Cloudflare Worker prompt, visitor transcripts stay untrusted, and upstream OpenAI events are normalized into a small public SSE contract. Human pages, raw Markdown, agent discovery files, structured metadata, expiring role links, bounded public-repository snapshots, and a private 90-day conversation archive all share the same grounded source boundary. The medium demonstrates the claim that John builds applied AI systems while remaining useful when the model API is unavailable.

**Public repository:** [github.com/johnviklund/agent-cv](https://github.com/johnviklund/agent-cv)

## oma-space-launch — a desktop widget built with coding agents

**Status:** Public, MIT-licensed, and actively maintained personal project.

An Omarchy bar-widget plugin that shows a persistent countdown to the next SpaceX launch in the desktop top bar, with a click-to-open detail panel for the next launch and the following three. It reads the public Launch Library 2 API, caches results for at most 15 minutes, and shows a visible stale state instead of silently presenting old data as current.

Built in QML, JavaScript, and shell, with offline fixtures for exact, window-only, and unscheduled launch times. Development follows John's j-skills workflow: brainstorm, plan, execute, review, and wrap, one run per roadmap initiative.

**Scale on 16 October 2026:** version 1.2.0, 51 tracked files, and 80 commits since 13 September 2026.

**Public repository:** [github.com/johnviklund/oma-space-launch](https://github.com/johnviklund/oma-space-launch)
