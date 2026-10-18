# T3 handoff — John's owner config and golden snapshot

Risk: cheap · Runner: agent after approval · Where: `../agent-cv-private` and the engine checkout

Approve this exact scope, then the agent runs it and writes `receipts/t3-golden-capture.md`:

1. In `../agent-cv-private`: append `golden/` to `.gitignore`; write `owner.json` and `site.json`
   from `notes/t3-owner-draft.md`.
2. `git -C ../agent-cv-private add .gitignore owner.json site.json` (by name; `data/faq.md` stays
   uncommitted) and commit. Push only if you also approve the push.
3. Engine: `node -e` `loadOwner()` with no root → must resolve `../agent-cv-private`, slug `john-viklund`.
4. Engine: `npm run golden:capture`, then `git -C ../agent-cv-private status --short` → no `golden/`.
5. Engine: `npm run golden:diff` → exit 0, `Golden diff: empty`.

Receipt holds: resolved root and slug · golden file count · diff exit code · private repo
`status --short` (only ` M data/faq.md`) · the private commit sha.
