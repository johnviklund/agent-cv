Command: workflow wrap forkable-site-rendering
Created: 2026-10-19
Base: 1552a265f02d62ff17231ffac334069f256b14ae
Inputs: review.md @ 1552a265f02d62ff17231ffac334069f256b14ae
Status: done

## Outcome
Pages, discovery files, Worker prompts and browser copy now come from the owner's `site.json` and identity, built into `build/site`. John's published output is proven unchanged by the golden diff, with nine recorded technical exceptions. Live deployment and owner-driven PDF/OG content stay out of scope.

## Shipped
T1 9aa0df6 · T2 e262441 · T3 04f3a25 · T4 7a9f61a · T5 355f653 · T6 161c9db · C1-T1 65a0eaa (red 6c7dc2b) · C1-T2 0cec7b1

## Review
Ship as-is after 2 cycles; cycle 1 P1s C1-1 and C1-2 were fixed. Cross-vendor: writer Opus 5.5, reviewer GPT-6 Astra.

## Final checks
`npm run check` 249 passed, 1 skipped; `npm run build` passes. Shortcut grep clean. No PRODUCT.md, ROADMAP.md or TODO.md exist; design.md already names `build/site/tokens.css`.

## Deferred
None. A `verify.create` for repeatable browser coverage was recommended by review.

## Receipts
receipts/ (t6, c1 patch, c1/c2 review) · screens/T6-* · notes/ (audit, verification) · scripts/ (one-off generators, left in place)
Learnings: 1 routed to memory/validate-both-schema-bounds.md. Eval cases: 0.
Retired: none — the one-off generators are run history and nothing else is superseded.
