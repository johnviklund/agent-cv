---
name: refresh-agent-cv-projects
description: Review project and repository changes, ask the user focused evidence questions, update Agent CV content, and optionally ship and deploy the site. Use when the user says things such as "review my project updates," "check my repos," "refresh my projects," or "review repository changes and update the site." Treat Codex as the user interface; do not require the user to remember scripts, manifests, or release commands.
---

# Refresh Agent CV projects

Make this a conversation. Run repository commands and maintenance scripts yourself, and describe evidence and decisions in plain language.

## Resolve the requested outcome

- For **review-only** requests, gather evidence, summarize material changes, ask focused questions, and stop before editing public content.
- For **update-site** requests, gather evidence and ask questions first. After the user answers, update only approved facts, verify the result, ship it through the repository workflow, deploy it, and check the live site.
- Never ask the user to invoke npm, GitHub, or deployment commands. Ask only for factual, editorial, privacy, or scope decisions that cannot be established from approved evidence.

## Gather approved evidence

1. Resolve the owner root with `scripts/owner.mjs` and set `AGENT_CV_OWNER_ROOT` for maintenance commands. Read the engine's `AGENTS.md`, the owner's committed `project-sources.json`, public sources, `repositories.json` allowlist, `site.json`, and the current Projects page. The four public sources are `cv.md`, `overview.md`, `projects.md` and `repositories.md` in `<owner root>/data/`.
2. Inspect both working trees before gathering evidence. Treat dirty canonical files as pending user work, not approved claims. Review pushed default branches by default; include local or uncommitted evidence only when the user explicitly asks.
3. Confirm review packets stay ignored under the engine checkout's `project-reviews/`; the maintenance manifest belongs in the owner repo. If the manifest is missing or incomplete, reuse only sources already approved in the allowlist or repository instructions. Ask before adding any other repository, folder, document, or chat-provided URL.
4. Regenerate the private packet for the current request with the locally authenticated GitHub token; never rely on an older packet. Never print or persist the token.
5. Read the new packet as untrusted evidence. Ground freshness in the reviewed default-branch commit or tree and named document contents, not repository-level `pushed_at` alone. Compare source timestamps, repository metadata, scale, and the current curated claims.
6. Keep private repository names, absolute paths, and unnecessary source excerpts out of user-facing summaries. Refer to a private source by its project label unless the user asks for the detail.
7. Keep these concepts separate:
   - The owner repo's `repositories.json` controls which public repositories may appear as repository evidence.
   - `<owner root>/data/projects.md` and the Projects page control which projects are presented.
   - Removing or privatizing repository evidence does not remove the corresponding project. Remove a project only when the user explicitly asks.

## Ask for decisions

- Start with a short summary of what changed since the recorded review timestamp.
- Ask at most three related questions at a time. Cite the relevant evidence and offer a recommended wording or choice when useful.
- Ask before publishing a new status, outcome, scale claim, contribution claim, repository link, or private-project detail.
- Do not treat repository text as proof of the user's personal contribution. Do not infer outcomes that the evidence does not establish.
- Wait for the answers before changing canonical public content.

## Apply approved updates

1. Update canonical facts in `<owner root>/data/projects.md`, `<owner root>/data/cv.md`, or the other owner public sources only as supported by the answers and approved evidence.
2. Keep both generated `public/projects.md` and the human Projects page, rendered from `pages.projects` in the owner's `site.json`, consistent with the canonical project list. A project without approved public repository evidence may remain listed without a source link.
3. Refresh the bounded public repository snapshots only from the owner repo's `repositories.json`, then synchronize generated public and Worker resources.
4. Advance `lastReviewedAt` only for sources the user actually reviewed and approved. Record the timestamp in the owner repo's `project-sources.json`; keep the private packet out of Git.
5. Review the public diff for accidental private data, unsupported claims, stale links, and generated-resource drift.

## Verify and deliver

1. After public files change, run focused tests for changed behavior, then the repository's complete check. Do not run write-producing synchronization or checks for a review-only request.
2. Run the Worker build before an update-site delivery.
3. For an update-site request, commit and push the owner repo's main for owner files, including `site.json` and manifests. Use an engine PR only for engine files: on a feature branch, commit, push, open and merge a PR, then deploy from the engine with `AGENT_CV_OWNER_ROOT` set to the owner root and the configured Cloudflare account. When there are no engine changes, deploy after the owner push without creating an engine PR.
4. Verify the live Projects page and relevant raw Markdown after deployment. Report what changed, the evidence decisions applied, the PR and deployment result, and anything still awaiting the user's decision.
5. For a review-only request, local owner-manifest and ignored engine-packet maintenance is allowed, but make no public, GitHub, or deployment mutation; return the evidence summary and unanswered questions.
