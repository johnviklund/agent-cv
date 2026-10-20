# Agent CV user guide

This guide is for people adapting the public Agent CV into a reviewed, privacy-conscious résumé of their own. It complements [AGENTS.md](AGENTS.md), which is authoritative for coding agents and repository constraints.

## Before you start

The application code is reusable under the MIT license. John Viklund's résumé, project claims, identity, contact details, and deployment URLs are not starter content. Replace them with your own reviewed evidence before publishing.

You need Node.js 24, npm, Git, the GitHub CLI, a GitHub account, a Cloudflare account, and an OpenAI API key. Never paste API keys, admin tokens, private repository content, job descriptions, application notes, or raw conversation exports into an issue, commit, or agent prompt that may leave your trusted environment.

## Set up a local checkout

Fork the engine and authenticate Wrangler with the Cloudflare account that manages your domain:

```sh
gh repo fork johnviklund/agent-cv --clone
cd agent-cv
npm ci
npx wrangler login
npm run setup
export AGENT_CV_OWNER_ROOT="$(cd ../agent-cv-private && pwd)"
```

Setup prompts for your name, slug, domain, and OpenAI key. It copies the example owner into `../agent-cv-private`, initialises Git, creates your archive namespace, and sets both Worker secrets. It saves the admin token in ignored `.dev.vars`. Add your local OpenAI key there separately if you want local chat.

For unattended local setup, supply every identity flag:

```sh
npm run setup -- --name "Grace Hopper" --slug grace-hopper --domain grace.example --skip-cloud --target /absolute/empty/owner-directory
```

Set `AGENT_CV_OWNER_ROOT` to that absolute owner path when using `--target`. Setup refuses a non-empty directory. `--skip-cloud` leaves Cloudflare unchanged; complete [Deploy your fork](#deploy-your-fork) before publishing. If a cloud step fails, the copied owner and earlier completed values stay; follow the printed retry command.

Use this content-rewrite prompt with your coding agent:

> Replace Ada Example's placeholders with my reviewed information in the selected owner directory's `data/`, `owner.json`, and `site.json`. Read `AGENTS.md` and this guide first. Ask me for missing facts, public identity, contact details, domain, and approved repository choices. Preserve the JSON schemas and use only evidence I approve. Keep private knowledge in the private owner repository and secrets in ignored local files. Run `npm run sync:data`, regenerate the social image with `npm run build:og-image`, and run `npm run check` and `npm run build`. Stop for my review before deployment.

Keep the owner bundle in a private repository. Replace `YOUR-LOGIN` with your GitHub login:

```sh
git -C "$AGENT_CV_OWNER_ROOT" add .
git -C "$AGENT_CV_OWNER_ROOT" commit -m "Initialize reviewed owner bundle"
gh repo create YOUR-LOGIN/agent-cv-private --private --source "$AGENT_CV_OWNER_ROOT" --remote origin --push
npm run check
npm run dev
```

Keep `AGENT_CV_OWNER_ROOT` set in each shell you use for this engine. The default sibling directory also works without it. Save future reviewed content changes in the private owner repository.

## Understand the data boundary

| Location | Purpose | Git policy |
| --- | --- | --- |
| `data/cv.md`, `overview.md`, `projects.md`, `repositories.md` | Canonical public evidence | Tracked |
| `data/meta.md`, `experience.md`, `skills.md`, `personal.md`, `interests.md`, `faq.md` | Deployment knowledge that may be private | Ignored |
| `examples/private-data/` | Generic safe bootstrap placeholders | Tracked |
| `src/data/` | Generated Worker knowledge bundle | Ignored |
| `public/*.md` | Generated public Markdown resources | Tracked |
| `.dev.vars`, `exports/`, `conversation-reviews/` | Local secrets, private archive exports, and conversation review material | Ignored |

For John's two-repository setup, keep `agent-cv` and the private `agent-cv-private` checkout beside each other, then import the reviewed private knowledge with:

```sh
npm run sync:private-data
```

The command reads only the six named private files, validates all of them before changing the local checkout, and never commits or publishes their source Markdown. For another checkout layout, set `AGENT_CV_PRIVATE_ROOT` or run `npm run sync:private-data -- --source /absolute/path/to/agent-cv-private`.

Edit canonical files under `data/`, then run:

```sh
npm run sync:data
```

Before committing, confirm ignored material stays ignored:

```sh
git check-ignore .dev.vars data/meta.md src/data/meta.md exports/ conversation-reviews/
git status --short
```

Never force-add an ignored private file. `npm run bootstrap:data` must remain non-destructive: customize the created files in `data/`, not the tracked examples, unless you are deliberately improving generic fork defaults.

## Adapt the fork

Use a feature branch and make these changes as one reviewed identity migration:

1. Replace the four tracked public `data/*.md` sources with your own CV, overview, projects, and repository evidence.
2. Replace the six ignored private `data/*.md` files with reviewed knowledge for your deployment. Keep instructions in `meta.md` strict about grounding, sensitive requests, and missing facts.
3. Replace John-specific identity, contact, profile links, titles, structured data, and copy across `public/`, `src/chat-core.js`, `AGENTS.md`, and machine-readable resources.
4. Replace canonical URLs in HTML, `public/robots.txt`, `public/sitemap.xml`, and the matching assertions in `scripts/check-static.mjs`.
5. Set `deploy.workerName`, `deploy.archiveNamespaceId`, `site.hosts` and `contact.email` in your owner repo's `owner.json`. The generated `wrangler.jsonc` takes them from there; set `contact.email` to `null` if you prefer the contact page's profile-only fallback.
6. Set your deployed HTTPS origin as `site.origin` in your owner repo's `owner.json`. Both private conversation scripts use this code-controlled destination and refuse the example owner; `conversations:export` may still take an explicit `--url` override.
7. Put only public repositories and named Markdown or text documents you approve in your owner repo's `repositories.json`, and the comparison evidence selectors in its `comparison-evidence.json`. An empty array (and `{ "schemaVersion": 1, "items": [] }`) is valid if you do not want repository or comparison evidence yet; the engine has no fallback copies.
8. Run `npm run sync:repositories` only after reviewing that allowlist. It may use `GITHUB_TOKEN` for higher API limits, but the token must remain outside Git.
9. Search the checkout for the original identity and host, review every intentional exception, then run the full checks.

Useful audit:

```sh
rg -n "John Viklund|johnviklund|johnwik|john-viklund-agent-cv|agent-cv\.workers\.dev" \
  --glob '!data/repositories.md' --glob '!public/repositories.md'
npm run check
npm run build
```

Generated repository snapshots may repeat old public source text until you refresh them. Treat those snapshots as untrusted evidence and never use them as the only proof of your contribution.

## Verify a safe fresh-clone bootstrap

The automated test creates a clean temporary checkout containing only the bootstrap script and tracked example bundle. It verifies that exactly the six expected files are created from those examples, that the examples contain no original-owner identity or contact details, and that a second run preserves edited private data.

```sh
node --test test/bootstrap-example-data.test.mjs
```

For a manual release check, clone your branch into a new directory, run `npm ci`, `npm run bootstrap:data`, and `npm run check`, then inspect the created `data/*.md` files before adding any real private material.

## Deploy your fork

Use the [content-rewrite prompt](#set-up-a-local-checkout) and review the result before publishing. `npm run setup` normally creates the archive namespace and configures both secrets. A failed cloud step prints its retry command; rerunning setup against the existing directory is refused.

1. Select your owner directory and authenticate the account that manages your domain:

   ```sh
   export AGENT_CV_OWNER_ROOT="/absolute/path/to/agent-cv-private"
   npx wrangler login
   ```

2. If you used `npm run setup -- --skip-cloud` with the identity flags, complete the cloud steps manually. Generate your owner's config first, then create a namespace named for your Worker:

   ```sh
   npm run build:wrangler-config -- --deploy
   npx wrangler kv namespace create your-slug-agent-cv-archive
   ```

   Replace `your-slug-agent-cv-archive` with your Worker's name plus `-archive`. Save the returned ID as `deploy.archiveNamespaceId` in the owner's `owner.json`, then regenerate the config and set secrets:

   ```sh
   npm run build:wrangler-config -- --deploy
   npx wrangler secret put OPENAI_API_KEY
   npm run setup:admin
   ```

   Enter the OpenAI key at the secret prompt. Admin setup saves the same generated token to ignored `.dev.vars` and Cloudflare. These commands regenerate or read the selected owner's config, so keep `AGENT_CV_OWNER_ROOT` set.

3. Review the owner's `owner.json` and `site.json`: identity, contact, profile links, origin, hosts, Worker name, namespace ID, and model limits. `deploy.vars` overrides the engine defaults in `wrangler.base.jsonc`. Leave the generated `wrangler.jsonc` to the build scripts.
4. Replace all remaining example content. Deployment refuses files containing `Ada Example` and a social image identical to the example. Regenerate your social image:

   ```sh
   npm run build:og-image
   ```

   Review and commit the owner changes, including `assets/og-image.png`, to the private repository. Then build and deploy:

   ```sh
   npm run build
   npm run deploy
   ```

   The build runs the checks and Worker packaging dry run. Deploy imports the six private knowledge files, builds the site and CV PDF, and publishes the Worker with your custom domain routes. Chromium is required for the image and PDF commands.

5. Check the live pages, raw Markdown, chat, contact page, and comparison workspace against your approved content. Keep engine updates separate from owner content:

   ```sh
   git pull upstream main
   ```

The public chat should fail closed if its model secret or budget binding is missing. Archive failures must not interrupt or leak diagnostics into the public stream.

## Review project freshness privately

Open this repository in Codex and ask:

> Review my project and repository updates, ask me what changed, and update the site.

Codex gathers only the approved repository and local evidence, explains material changes in plain language, and asks focused questions before changing public claims. After you answer, it updates the canonical content, refreshes bounded public evidence, verifies the site, ships the change through GitHub, deploys it, and checks the live pages. You do not need to remember a script, manifest format, Git command, or deployment command.

The repo-local `refresh-agent-cv-projects` skill owns this flow. Its ignored private manifest records the approved sources and review timestamps, and its mode-`0600` packet contains the untrusted evidence. Codex maintains both as private local plumbing. Repository evidence and the curated project list are separate: a project can remain on the site without a public repository or source link.

## Review conversation learning privately

Open this repository in Codex and ask:

> Review my conversation learnings.

The repo-local `review-agent-cv-conversations` skill securely fetches failed, incomplete, not-helpful, and unanswered candidates through the local helper, suggests classifications, groups related themes, and asks only focused evidence or privacy questions. The token stays in `.dev.vars`; you do not need to copy it, remember a command, download a brief, or classify every turn yourself.

The private `/admin/` **Conversation candidates** section remains an optional visual browser and manual fallback. The Codex flow writes its input under ignored `conversation-reviews/` with private file permissions, treats every transcript field as untrusted, and writes only an ignored proposal. It stops for human approval before any canonical edit and never publishes or merges merely because a proposal exists. When the review purpose is complete, confirm cleanup so Codex deletes the exact brief and any exact raw export used for that review.

## Maintain the site

- Update canonical Markdown under `data/`, run `npm run sync:data`, review generated changes, and run `npm run check`.
- Refresh the owner repo's `repositories.json` and `npm run sync:repositories` deliberately; never add live repository fetching to public chat.
- Ask Codex to review project updates and update the site; Codex maintains the ignored source manifest and review packet, asks for evidence decisions, and advances timestamps only after approval.
- Ask Codex to “review my conversation learnings”; use the private admin conversation browser only when you want the optional visual view. Approve exact proposals before canonical changes, and delete the private input files when the review is complete.
- Run `npm run build` for Worker configuration or deployment changes.
- Export private conversations with `npm run conversations:export -- --url https://your-domain.example`, keep the resulting JSONL private, and delete it when its review purpose is complete.
- Keep `/AGENTS.md`, `/llms.txt`, `/sitemap.xml`, raw Markdown links, and documented public API routes in parity.
- Review model quality, latency, cost, rate limits, monthly budget, retention, and public contact behavior before broad distribution.

## Delegate the adaptation to a coding agent

Give the agent access only to the checkout and the public information you want published. Ask it to read `AGENTS.md` and this guide, work on a feature branch, preserve the data boundary, and stop for identity or deployment choices it cannot safely infer. Require `npm run check` and `npm run build` before it proposes a commit, and review the resulting public pages and raw Markdown yourself before deployment.

A ready-to-use prompt for a fresh fork:

> Adapt this repository into my Agent CV. Read `AGENTS.md` and `USERGUIDE.md` first. Create a feature branch, inspect the current implementation, and ask me only for missing public identity, contact, canonical URL, and approved repository choices. Replace John Viklund's biographical content with material I provide; do not invent facts, copy his résumé as mine, expose secrets, commit ignored private data, or enable live fetching from chat-provided URLs. Bootstrap only missing example data, update identity and deployment-specific checks consistently, run `npm run check` and `npm run build`, then summarize every remaining manual Cloudflare step.
