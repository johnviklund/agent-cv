---
name: verify-agent-cv
description: Drive the running Agent CV site (editorial CV with an ask-my-agent chat and a role-comparison workspace, served by wrangler dev) the way a visitor does. Use it to prove a change works in the real app, take before/after screenshots, or reproduce a reported bug. Starts an isolated local server and headless Chromium, clicks and types by ARIA role and name, and saves screenshots and snapshots.
---

# Verify Agent CV

The surface is a website: static pages plus a Worker (`/api/ask`, `/api/compare`, `/api/contact`, `/api/health`). `scripts/control` starts its own `wrangler dev` (port 8791, scratch state in `/tmp/agent-cv-verify`) and its own headless Chromium (port 9333). It never touches a server or browser it did not start.

## Launch
`.agents/skills/verify-agent-cv/scripts/control up` — runs `sync:data`, `build:site`, `build:wrangler-config`, starts both processes, and prints the URL once `/api/health` answers. Takes about 20 seconds. Port busy: pass `--port` and `--cdp-port`. Without `OPENAI_API_KEY` in `.dev.vars`, chat and comparison answers are unavailable: only their error paths can be driven (each feature file says so).

## Doctor
Run `control doctor` first and again after any surprising result. It checks both processes, `/api/health` and the browser, and flags a revision that differs from `HEAD`. Exit 0 only when worth driving. A stale revision means source changed after `up`: `control down`, then `up`.

## Drive
Start at `features/README.md`, then open the feature's file. Commands (all print JSON; `control --help` lists them):

```bash
control open /
control fill --role textbox --name "Ask about" --value "What does John do?"
control click --role button --name "Send question"
control wait --text "Chat unavailable"
control snapshot          # headings, buttons, links, fields, status text
control shot home-after   # PNG in .verify-evidence/
control api /api/health   # second view of server state
```

Names match case-insensitively, exact first, then substring; `--nth K` picks the Kth match when names repeat. A miss lists the names that exist on the page.

## Evidence
- Drive the real user path with the mouse and keyboard commands; never call page internals with `eval` to cause a change (`eval` only reads).
- Capture the action and the resulting state: a `snapshot` or `eval` of the status text plus a `shot`, not only the last screen.
- Check the server side with `control api` where a route exists.
- No model key means the answer path is unreachable: report the error-path proof and say the answer path was not verified.
- Evidence goes to `.verify-evidence/` (ignored by Git) or the folder named with `--out`.

## Cleanup
`control down` after every attempt, including failed ones. It stops only the two processes `up` recorded and removes scratch state under `/tmp/agent-cv-verify`; evidence stays.

## Helpers
- `scripts/control` — the only helper. Needs Node 22+ (global `WebSocket`), `npx wrangler` from `node_modules`, and `chromium` on PATH (or `CHROME_PATH`).
