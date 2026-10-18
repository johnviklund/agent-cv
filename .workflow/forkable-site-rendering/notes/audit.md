# Read-only planning audit dispositions

Opus 5.5 audited the master plan against 7e92346. Main-session source reads verified these findings before incorporating them.

- CI uses bootstrap data and the example owner. T2–T4 must update examples/owner/site.json whenever its schema changes. T6 parameterizes identity-sensitive tests and updates CI output checks. Full fictional Markdown, evidence and leak-free builds remain in C/D; B must not claim Ada's mixed-source CI build is deployable.
- The inline JSON-LD hash and PDF route in public/_headers must be generated. T3 tests contextual escaping, including hostile email and analytics attributes. T4 derives the PDF route from the slug. For John, preserve JSON-LD bytes where possible; list an exact corresponding CSP-hash change if reviewed template whitespace changes them.
- The legacy Workers host is absent from the current owner config. Reuse site.hosts rather than adding site.aliasHosts: the existing field accepts that hostname, and the master plan already assigns hosts to it. Exclude the canonical hostname from redirects. Do not introduce a wildcard Workers redirect. Run C must avoid treating a workers.dev alias as a custom-domain route.
- T2 introduces validated site.json.updatedAt and exports public freshness metadata during sync:data. Both owner envelopes change together. Prompt builders receive the owner and date as arguments; integration and golden collection use the same generated values. Public Markdown date checks remain authoritative parity checks; no automatic rewriting of claims or Markdown.
- Comparison guard tests include names with Unicode and regex punctuation. Merely adding the Unicode flag does not make JavaScript word boundaries Unicode-aware; test the actual guard outcome.
- app.js uses innerHTML for the fixed agent label, and comparison-view.js hard-codes the export slug. T5 replaces the label with DOM text and adds data-owner-slug. Reuse the document injection already supported by WebMCP and the existing dom.js module.
- public/ has consumers in the PDF/OG and comparison generators, static checks, review-conversations imports, tests, CI and maintenance instructions. T6 migrates these together. Full PDF/OG content and maintenance workflow generalization remain in C.
- The project-refresh skill names the old human Projects page. T6 corrects that pointer to the owner's structured Projects section, preserving approval of new claims. Full two-repo maintenance shipping stays in U6.
- public/markdown.js:191 provides isSafeHref for HTTPS, root-relative paths and fragments. Reuse its rules where applicable; contact links need explicit mailto validation. Do not use the audit's proposed simple prefix regex, which would accept protocol-relative URLs.
- Retain the exact-digest golden exception approach in T1. Decline broad whitespace collapsing because it can hide visible changes. Reject prompt exceptions entirely. Each permitted technical difference needs its reviewed diff, reason and exact old/new hashes; keep the snapshot private and unchanged.
- Keep six tickets and the final atomic output switch. The audit's eight-ticket alternative moves the served directory earlier; the current staging avoids half-converted routes. T3/T4 are deliberately larger template conversions, disclosed for approval.
- Avoid sync:repositories during this run: it can refresh README-derived knowledge and change prompt bytes unrelated to owner rendering.

No new external research or runtime owner fetching is needed. No implementation changes were made during planning.
