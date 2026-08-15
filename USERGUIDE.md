# Agent CV user guide

This guide is for people adapting the public Agent CV into a reviewed, privacy-conscious résumé of their own. It complements [AGENTS.md](AGENTS.md), which is authoritative for coding agents and repository constraints.

## Before you start

The application code is reusable under the MIT license. John Viklund's résumé, project claims, identity, contact details, and deployment URLs are not starter content. Replace them with your own reviewed evidence before publishing.

You need Node.js, npm, a Cloudflare account, an OpenAI API key, and a GitHub account only if you want repository evidence. Never paste API keys, admin tokens, private repository content, job descriptions, application notes, or raw conversation exports into an issue, commit, or agent prompt that may leave your trusted environment.

## Set up a local checkout

```sh
git clone https://github.com/johnviklund/agent-cv.git
cd agent-cv
npm ci
cp .dev.vars.example .dev.vars
npm run bootstrap:data
npm run check
```

Add your local `OPENAI_API_KEY` to `.dev.vars`. The bootstrap command copies six generic files from `examples/private-data/` only when their matching private `data/*.md` files do not exist. Run it again at any time: reviewed files are preserved.

For local development:

```sh
npm run dev
```

## Understand the data boundary

| Location | Purpose | Git policy |
| --- | --- | --- |
| `data/cv.md`, `overview.md`, `projects.md`, `repositories.md` | Canonical public evidence | Tracked |
| `data/meta.md`, `experience.md`, `skills.md`, `personal.md`, `interests.md`, `faq.md` | Deployment knowledge that may be private | Ignored |
| `examples/private-data/` | Generic safe bootstrap placeholders | Tracked |
| `src/data/` | Generated Worker knowledge bundle | Ignored |
| `public/*.md` | Generated public Markdown resources | Tracked |
| `.dev.vars`, `exports/` | Local secrets and private archive exports | Ignored |

Edit canonical files under `data/`, then run:

```sh
npm run sync:data
```

Before committing, confirm ignored material stays ignored:

```sh
git check-ignore .dev.vars data/meta.md src/data/meta.md exports/
git status --short
```

Never force-add an ignored private file. `npm run bootstrap:data` must remain non-destructive: customize the created files in `data/`, not the tracked examples, unless you are deliberately improving generic fork defaults.

## Adapt the fork

Use a feature branch and make these changes as one reviewed identity migration:

1. Replace the four tracked public `data/*.md` sources with your own CV, overview, projects, and repository evidence.
2. Replace the six ignored private `data/*.md` files with reviewed knowledge for your deployment. Keep instructions in `meta.md` strict about grounding, sensitive requests, and missing facts.
3. Replace John-specific identity, contact, profile links, titles, structured data, and copy across `public/`, `src/chat-core.js`, `AGENTS.md`, and machine-readable resources.
4. Replace canonical URLs in HTML, `public/robots.txt`, `public/sitemap.xml`, and the matching assertions in `scripts/check-static.mjs`.
5. Change the Worker `name`, public `CONTACT_EMAIL`, and KV namespace ID in `wrangler.jsonc`. Remove the public email value if you prefer the contact page's profile-only fallback.
6. Change the default URL used by `scripts/export-conversations.mjs` or always supply its `--url` option.
7. Replace `config/repositories.json` with only public repositories and named Markdown or text documents you approve. An empty array is valid if you do not want repository evidence yet.
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

1. Authenticate Wrangler with the Cloudflare account that will own the deployment.
2. Create a KV namespace and place its returned ID in the `ARCHIVE` binding in `wrangler.jsonc`:

   ```sh
   npx wrangler kv namespace create ARCHIVE
   ```

3. Configure the OpenAI secret:

   ```sh
   npx wrangler secret put OPENAI_API_KEY
   ```

4. Generate and configure the private admin token:

   ```sh
   npm run setup:admin
   ```

   This writes the same token to ignored `.dev.vars` with private file permissions and to Cloudflare without printing it.

5. Review `OPENAI_MODEL`, reasoning effort, request cap, retention, contact email, rate limit, and binding values in `wrangler.jsonc`.
6. Run `npm run build` for the Worker packaging dry run.
7. Deploy with `npm run deploy`.
8. Set your custom domain, then update canonical metadata, discovery resources, export URL, and static checks together. Run `npm run check` again.

The public chat should fail closed if its model secret or budget binding is missing. Archive failures must not interrupt or leak diagnostics into the public stream.

## Review project freshness privately

Copy `config/project-sources.example.json` to the ignored `config/project-sources.private.json`. Every approved source records a review timestamp, named evidence documents, and the canonical public files it should be compared with. Public and private repositories use `owner/repository`; local folders use an absolute path or a path relative to the private manifest.

```json
{
  "schemaVersion": 1,
  "publicRepositories": [{
    "project": "Public Project",
    "repository": "owner/project",
    "documents": ["README.md", "ARCHITECTURE.md"],
    "canonicalFiles": ["data/projects.md", "data/cv.md"],
    "lastReviewedAt": "2026-08-15T16:10:00.000Z"
  }],
  "privateRepositories": [],
  "localFolders": [{
    "project": "Local Project",
    "path": "/absolute/path/to/project",
    "documents": ["README.md"],
    "canonicalFiles": ["data/projects.md"],
    "lastReviewedAt": "2026-08-15T16:10:00.000Z"
  }]
}
```

Run `npm run projects:review`. The command checks GitHub's remaining API allowance before fetching, reads only the named sources, compares them with the listed canonical Markdown, and writes a mode-`0600` proposal packet under ignored `project-reviews/`. Set `GITHUB_TOKEN` when the anonymous allowance is too low and whenever a private repository is listed. Repository and local content remains untrusted evidence. The command never changes canonical content, advances review timestamps, synchronizes public data, or deploys anything.

## Maintain the site

- Update canonical Markdown under `data/`, run `npm run sync:data`, review generated changes, and run `npm run check`.
- Refresh `config/repositories.json` and `npm run sync:repositories` deliberately; never add live repository fetching to public chat.
- Keep the source-review manifest private: copy `config/project-sources.example.json` to `config/project-sources.private.json`, list only approved public/private repositories and named documents under local project folders, and set an ISO 8601 UTC `lastReviewedAt` timestamp on every source. Run `npm run projects:review` to write a private proposal queue under `project-reviews/`. Review its untrusted evidence, manually approve any canonical edits, then advance review timestamps yourself; the command never edits or publishes source content.
- Run `npm run build` for Worker configuration or deployment changes.
- Export private conversations with `npm run conversations:export -- --url https://your-domain.example`, keep the resulting JSONL private, and delete it when its review purpose is complete.
- Keep `/AGENTS.md`, `/llms.txt`, `/sitemap.xml`, raw Markdown links, and documented public API routes in parity.
- Review model quality, latency, cost, rate limits, monthly budget, retention, and public contact behavior before broad distribution.

## Delegate the adaptation to a coding agent

Give the agent access only to the checkout and the public information you want published. Ask it to read `AGENTS.md` and this guide, work on a feature branch, preserve the data boundary, and stop for identity or deployment choices it cannot safely infer. Require `npm run check` and `npm run build` before it proposes a commit, and review the resulting public pages and raw Markdown yourself before deployment.
