# Worklog
Rolling index of recent work; git is the source of truth.

## 2026-10-21 · forkable-live-verify · live johnviklund.com proven after deploying from the cutover engine and private owner repo · Opus 5.5
- Read-only live check script (sha, PDF, health, chat, compare, admin 401s) ships in the run folder; deploy guard now scans only deploy inputs.
- Deployed version c082c445 at 100% and verified live; patch cycle added the missing owner.json guard case.
- Commits: bb6f3f4 baff4c1 f1311ed 9c8ee13
- Review: ship as-is @ 6e32468
- Run: 4 tickets · 5 sessions · 2 review cycles · 1 deviations · 0 findings overturned
- Seats: 0 none · 2 none · 3 GPT-6.1 Sol · 4 Opus 5.5
- Skills: workflow@unversioned
- Why: the owner needed proof the engine/private split still serves the live site byte-for-byte before trusting it.

## 2026-10-20 · forkable-cutover · the engine tree drops John's sources, docs and test literals; leak check scans every tracked file · Opus 5.5
- John's public sources and generated files left the engine for the private owner repo; tests, docs and skills run on Ada Example; a clean clone checks green and John's golden diff is unchanged.
- Patch cycle pinned the leak check's credit-line exceptions to exact text and replaced real employer fixtures with fictional ones.
- Commits: 70887fd 129f4c7 cbce676 d859042 636f2d9 a652048 a7f2a86 009ab1f 648a24d
- Review: ship as-is @ 6f83574
- Run: 7 tickets · 7 sessions · 2 review cycles · 5 deviations · 0 findings overturned
- Seats: 0 none · 2 GPT-6.1 Sol · 3 GPT-6.1 Sol · 4 Opus 5.5 · 4 Sonnet 5.5 (cycle 2 fallback)
- Skills: workflow@unversioned
- Why: a fork must inherit no trace of John, and a tree-wide check must keep it that way.

## 2026-10-20 · forkable-setup · `npm run setup` creates a fork's owner folder, archive and secrets, and deploy refuses example content · Opus 5.5
- Setup creates the owner directories, configures the archive and admin secret, and keeps retry state; deploy refuses Ada's text and og-image; docs guide forks end to end.
- Patch cycle made a failed cloud step list every remaining retry and the cause.
- Commits: a61c3ab ed23bc1 fae8fe6 55ac8cb d48f63b 136c1f3
- Review: ship as-is @ 4872ec6
- Run: 4 tickets · 3 sessions · 2 review cycles · 0 deviations · 0 findings overturned
- Seats: 0 none · 2 Opus 5.5 · 3 GPT-6.1 Sol · 4 GPT-6 Astra
- Skills: workflow@unversioned
- Why: a fork owner needs one guided command to reach a deployable site without publishing the example owner.

## 2026-10-20 · forkable-example-owner · Ada's example owner builds the engine in CI and every page credits Agent CV · Opus 5.5
- Public sources now sync from the owner root; CI builds Ada, scans output for John and fails on a trace; each page footer links to Agent CV.
- Three patch cycles fixed the repository sync, evidence builder and project review still using engine `data/`, and untested default scan folders.
- Commits: 023e92f 95eae04 28d4fc6 150b701 83fbf99 882b97c b16b8bd dc7a942
- Review: ship as-is @ 4cf2630
- Run: 4 tickets · 6 sessions · 3 review cycles · 6 deviations · 0 findings overturned
- Seats: 0 none · 2 Opus 5.5 · 3 GPT-6.1 Sol · 4 Opus 5.5
- Skills: workflow@unversioned
- Why: a fork must build and test cleanly on its own example owner, with a check that fails if John's identity leaks.

## 2026-10-19 · forkable-owner-artifacts · social card, CV PDF, Wrangler config, admin origin and manifests come from the owner · Opus 5.5
- Card and PDF build from owner.json; Wrangler config and the repository and evidence manifests are generated from or read at the owner root.
- Patch cycle fixed admin setup using another owner's config and config formatting that altered owner variable strings.
- Commits: 90cba12 d11fca9 6c5e5b2 c6a1a04 b739df7 1ae2871 59faacd
- Review: ship as-is @ e94df1f
- Run: 5 tickets · 4 sessions · 2 review cycles · 12 deviations · 0 findings overturned
- Seats: 0 none · 2 Opus 5.5 · 3 Opus 5.5 · 4 GPT-6.1 Sol
- Skills: workflow@unversioned
- Why: a fork must build its own card, PDF and deploy config, with John's published bytes proven unchanged.

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

## 2026-10-19 · forkable-maintenance-tooling · review scripts, admin brief, GitHub sync agent, refusal guards and skills use the selected owner · Opus 5.5
- Project review, conversation packet and brief name the owner; refusal guards drop John literals; AGENTS.md and both skills describe the two-repo flow.
- Patch cycle fixed a John-literal refusal test that was red on CI's example-owner bundle.
- Commits: 7e1febe 5d296b4 bab16db 10bff27 539d45c
- Review: ship as-is @ 7024e58
- Run: 4 tickets · 2 sessions · 2 review cycles · 2 deviations · 0 findings overturned
- Seats: 0 none · 2 GPT-6.1 Sol · 3 Opus 5.5 · 4 GPT-6.1 Sol
- Skills: workflow@unversioned
- Why: a fork's maintenance output must never name John, with John's published bytes unchanged.
