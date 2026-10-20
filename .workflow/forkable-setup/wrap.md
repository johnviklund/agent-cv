Command: workflow wrap forkable-setup
Created: 2026-10-20
Base:    4872ec6
Inputs:  review.md @ 4872ec6
Status:  done

## Outcome
`npm run setup` now takes a fork from the example owner to a configured owner folder: it creates the owner directories, sets up the archive and admin secret, and keeps its state when a cloud step fails. `deploy` refuses example-owner text and Ada's og-image bytes. The setup guide and maintenance docs cover the whole path. Review: cross-vendor, ship as-is after 2 cycles.

## Shipped
- T1 setup creates owner directories @ a61c3ab
- T2 archive and secrets during setup @ ed23bc1
- T3 deploy refuses example owner content @ fae8fe6
- T4 docs for forks @ 55ac8cb
- C1-T1 retry message lists every remaining retry and cause @ d48f63b (test) · 136c1f3 (fix)

## Deferred (stay in review.md, all P3)
- setup schema read uses `root`, not `engineRoot`
- `setup:admin` no longer shows Wrangler stdout
- deploy gate misses Ada's headline and location in `owner.json`

## Receipts
`receipts/`: review-outcome.txt, review-cycle-2.md, review-cycle-2-outcome.txt, t1-b6-check.txt, t2/t3/t4-verification.txt.

## Wrap checks
- Final checks: receipt-rule diff since the reviewed Base is empty, so no code changed; the suite was not rerun (cycle 2: 325 tests, 322 pass, 3 skipped).
- Product docs: PRODUCT.md, DESIGN.md, ROADMAP.md absent. Feature map: no feature changed (no CLI entry in the site recipes). TODO: no impacts, no P2 deferrals. Learnings: none recorded.
Retired: none — nothing the run replaced; `bootstrap:data` and `examples/private-data/` stay out of scope.
