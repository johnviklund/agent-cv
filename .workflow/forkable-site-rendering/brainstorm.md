Command: workflow plan B
Created: 2026-10-18
Base: 7e923462686a794061dbbdcfb23f3988fb080d9b
Inputs: docs/plans/2026-10-18-1358-feat-forkable-agent-cv-plan.md @ 7e923462686a794061dbbdcfb23f3988fb080d9b
Status: done

Docs read: master forkable plan; AGENTS.md; design.md §§System, Typography and spacing, CTA voice and states, Motion stance, Notes; Run A wrap.

## Problem
Run A loads owner configuration, but Worker identity, browser copy and static pages still name John directly.
This brief derives Run B, U2–U4, from the supplied master plan. John approved B1–B6 and the six-ticket breakdown in this session.

## Outcome
John's existing site renders from owner configuration and structured editorial content, preserving its appearance and behaviour.
Fictional fixtures prove identity substitution without importing John's private material into fixtures.

## Behaviours
- B1 — Golden verification → reports every raw change and accepts only individually recorded technical differences against the frozen Run A snapshot.
- B2 — Selected owner → Worker prompts, comparison questions and safety checks use the selected owner; configured aliases redirect without a canonical-host loop.
- B3 — Validated structured site content → renders the home page safely, preserving layout, metadata and interactive controls.
- B4 — All ten existing HTML routes and discovery resources → render with the selected owner's content and existing public contracts.
- B5 — HTML owner attributes → chat, application and comparison browser copy and WebMCP descriptions use the HTML owner attributes.
- B6 — Dev, check, build and deploy preparation → consume build/site with complete assets, public resources and working generated-artifact paths.

## Decisions
- User requested Run B only; U5–U8 remain separate.
- User chose 1a: explicitly listed technical differences are allowed; content, prompts and appearance stay unchanged.
- Allowed categories: owner attributes, owner-reading browser code, Wrangler assets.directory and individually reviewed template whitespace, including corresponding CSP hashes.
- Record exact changes rather than ignoring whole files, normalizing all whitespace or replacing the frozen snapshot.
- Use site.json.updatedAt for public freshness; pass generated metadata into pure prompt builders.
- Keep examples/owner/site.json schema-valid as templates expand; full fictional data and the leak check remain in C.
- Add data-owner-slug for browser downloads; correct maintenance path pointers when assets move.
- Preserve existing comparison instructions: they are already owner-neutral.
- Preserve the legacy Workers hostname by adding it to John's owner site.hosts during execution.
- Keep current public Markdown and evidence sources until their later cutover; fixtures use synthetic public data.
- Preserve the owner's existing uncommitted data/faq.md change; stage only run-owned owner edits during execution.
- Derive the brief here instead of repeating the already settled product brainstorm; John confirmed B1–B6.

## Test seams
- Golden collector and diff CLI, with exact reviewed exceptions and negative drift cases.
- buildSystemPrompt, handleRequest and canonicalizeComparisonDraft with owner fixtures.
- loadOwner validation and generated files from build-site, including escaped text, URLs, JSON-LD and CSP.
- Browser controllers and rendered DOM with owner attributes; existing WebMCP tool contracts.
- Real Wrangler dry-run and local browser verification, with no paid provider requests.

## Out of scope
- Owner-driven PDF/OG content, generated Wrangler config, deployment vars and config-manifest relocation: U5.
- Maintenance workflow redesign, full Ada source data, leak check, setup and documentation rewrite: U6–U7.
- Built with Agent CV footer addition: U7; Run B retains existing footer appearance.
- Public-source deletion, engine-wide identity cleanup, history rewriting and live deployment: U8.
- New product copy, routes, visual design, translated interfaces and runtime owner fetches.
