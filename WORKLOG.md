# Worklog
Rolling index of recent work; git is the source of truth.

## 2026-10-19 · forkable-site-rendering · site pages, discovery files and browser copy render from owner content · Opus 5.5
- Worker prompts, redirects and browser labels read the selected owner; every page and discovery file builds from site.json into build/site.
- Golden diff accepts only recorded technical exceptions; cycle 1 closed empty-block validation and exact-path exceptions.
- Commits: 9aa0df6 e262441 04f3a25 7a9f61a 355f653 161c9db 65a0eaa 0cec7b1
- Review: ship as-is @ 1552a26
- Run: 6 tickets · 5 sessions · 2 review cycles · 6 deviations · 0 findings overturned
- Seats: 0 GPT-6 Astra · 2 GPT-6 Astra · 3 Opus 5.5 · 4 GPT-6 Astra
- Skills: workflow@unversioned
- Why: a fork needs its own site generated from owner content, with John's published bytes proven unchanged.

## 2026-10-18 · forkable-owner-loader · owner config loader and golden snapshot for the forkable Agent CV · Opus 5.5
- Golden snapshot capture/diff, owner schemas + validator + loader, `sync:owner` writes the owner module.
- Patch cycle fixed unsafe capture paths, inherited-name validation and example-owner deploy refusal.
- Commits: f3d40da ccba344 26365ea 0a92f92 0923a8e 1969b9b 94d61d2
- Review: ship as-is @ 78a28de
- Run: 4 tickets · 3 sessions · 2 review cycles · 5 deviations · 0 findings overturned
- Seats: 0 none · 2 Opus 5.5 · 3 Opus 5.5 · 4 GPT-6 Astra
- Skills: workflow@unversioned
- Why: owner identity must come from a directory before the engine can be forked; the golden diff proves John's output is unchanged.
