# Agent CV

A chat-first conversational résumé for John Erik Viklund. The interface is deliberately slim: the grounded chat is the primary interaction, while human pages and stable Markdown resources make the same evidence legible to recruiters, ATS tools, crawlers, and agents.

Live site: [john-viklund-agent-cv.agent-cv.workers.dev](https://john-viklund-agent-cv.agent-cv.workers.dev/)

## What this demonstrates

- Framework-free accessible HTML, CSS, and JavaScript
- Cloudflare Worker with an OpenAI Responses API streaming boundary
- Markdown-grounded answers with prompt-injection resistance
- Continuous browser conversations using a bounded rolling request context
- Full private conversation-turn archival in Workers KV, with 90-day expiry and no intentional IP storage
- Helpful/not-helpful answer feedback and authenticated JSONL export for local analysis
- Bot access telemetry for the public machine-readable resources
- Explicitly allowlisted public GitHub repository snapshots for deeper project evidence
- Expiring `/a/:slug` application links with untrusted JD context and private admin notes kept outside the prompt
- Rate limiting plus atomic monthly budget reservations in a Durable Object
- Static no-JavaScript content, structured profile metadata, sitemap, canonical URLs, `/AGENTS.md`, and `/llms.txt`

## Architecture

The Worker serializes the visitor-controlled transcript into one upstream user message. Client-authored `assistant` roles remain untrusted copies rather than trusted model history. The upstream OpenAI stream is parsed and reduced to a small public SSE contract before reaching the browser.

Curated CV data is bundled into the Worker prompt. Public repository evidence is refreshed separately from [`config/repositories.json`](config/repositories.json). Only named repositories and named Markdown documents are fetched; arbitrary chat-provided URLs are never retrieved. Repository documents are bounded and labeled as untrusted evidence, so they cannot override curated CV facts or establish John's contribution by themselves.

Conversation turns are written to the configured `ARCHIVE` KV namespace. Each record contains the question, final answer, outcome, model, random session and turn identifiers, source page, coarse human/bot classification, and optional feedback. The private admin APIs require `ADMIN_API_TOKEN`.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Set `OPENAI_API_KEY` in `.dev.vars`. The default model is `gpt-5.6-luna` with reasoning effort `none`. Supported overrides are `none`, `low`, `medium`, `high`, `xhigh`, and `max`; use higher effort only after measuring answer quality, latency, and cost on representative questions.

The complete deployed knowledge bundle includes reviewed private source files that are intentionally excluded from this public repository. A fresh clone can create safe example placeholders without overwriting existing private files:

```sh
npm run bootstrap:data
npm run check
```

## Public repository grounding

Edit [`config/repositories.json`](config/repositories.json) to add a public project repository and the specific Markdown documents that may be ingested. Then refresh the snapshot:

```sh
npm run sync:repositories
```

Set `GITHUB_TOKEN` when higher GitHub API limits are needed. The generated `data/repositories.md` and `public/repositories.md` are reviewable, versioned artifacts. Run the refresh deliberately rather than fetching repositories during public chat requests.

## Conversation archive

The private dashboard is available at `/admin/`. Its bearer token remains in the current browser tab and is not written to local storage.

The same dashboard creates 1–90 day application links. A link exposes only the company, role, and expiry to its visitor; the Worker adds the stored job description to the model as explicitly untrusted data. Private notes never enter the prompt. Links can be revoked immediately.

To export the archive for a local AI agent:

```sh
npm run conversations:export
```

The resulting private JSONL file is written under ignored `exports/`. Each line is one conversation turn, and turns can be grouped chronologically by `sessionId`. Exported conversations must remain private and should be deleted when no longer needed.

## Cloudflare deployment

1. Authenticate Wrangler with the desired Cloudflare account.
2. Create a Workers KV namespace and replace the checked-in `ARCHIVE` ID if deploying a fork:

   ```sh
   npx wrangler kv namespace create ARCHIVE
   ```

3. Configure secrets:

   ```sh
   npx wrangler secret put OPENAI_API_KEY
   npm run setup:admin
   ```

   `setup:admin` generates the admin token, writes it to ignored `.dev.vars` with private file permissions, and configures the same value in Cloudflare without printing it.

4. Optionally set a deliberately public contact address through `CONTACT_EMAIL`. If unset, the contact page uses GitHub and the application-email fallback.
5. Deploy:

   ```sh
   npm run deploy
   ```

The UI and raw CV remain available when the model API is unavailable. The public chat fails closed if the OpenAI secret or monthly budget binding is missing. Archive failures never expose private errors through the public stream.

If Wrangler reports `fetch failed` and `SSL_CERT_FILE` points to a missing certificate bundle, remove the stale override for that command:

```sh
env -u SSL_CERT_FILE NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem npx wrangler login
```

## Data boundaries

Public, versioned data:

- `data/cv.md`
- `data/overview.md`
- `data/projects.md`
- `data/repositories.md`
- everything under `public/`

Private deployment data, secrets, raw logs, application notes, and job descriptions are excluded through `.gitignore`. The files under `examples/private-data/` exist only to make the public codebase reproducible; they are not John's complete knowledge bundle.

## License

Application code is available under the [MIT License](LICENSE). Personal résumé content remains attributable to John Erik Viklund; reuse it as personal biographical content only with appropriate permission.
