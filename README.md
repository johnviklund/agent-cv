# Agent CV

A chat-first conversational résumé for John Erik Viklund. The interface is deliberately slim: starter questions open a fresh grounded conversation, while navigation exposes human-readable subpages and stable Markdown resources for recruiters, ATS tools, and agents.

## Architecture

- Framework-free accessible HTML, CSS, and JavaScript
- Cloudflare Worker for `/api/ask`, `/api/health`, and `/api/contact`
- OpenAI Responses API with server-sent-event streaming
- Continuous browser conversations with a bounded rolling context window
- Client transcripts flattened into one bounded, untrusted upstream user message; caller-authored assistant roles are never trusted as model history
- Markdown source data bundled into the Worker prompt
- Cloudflare Rate Limiting binding for public chat traffic
- Atomic per-month chat budget reservations in a Cloudflare Durable Object
- Optional Workers KV question logs with 90-day TTL and no IP storage
- Static no-JavaScript content plus `/cv.md`, `/projects.md`, `/overview.md`, `/AGENTS.md`, and `/llms.txt`

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Set `OPENAI_API_KEY` in `.dev.vars`. The default model is `gpt-5.6-luna` with reasoning effort `none`, keeping this short grounded lookup fast and preserving the visible answer budget. Override these through `OPENAI_MODEL` and `OPENAI_REASONING_EFFORT`; supported efforts are `none`, `low`, `medium`, `high`, `xhigh`, and `max`. Use `max` only after representative quality, latency, and cost evaluation, with a suitable `MAX_OUTPUT_TOKENS` budget.

Run verification:

```sh
npm run build
```

## Cloudflare deployment

1. Authenticate Wrangler with the desired Cloudflare account.
2. The checked-in `CHAT_BUDGET` Durable Object binding and `v1` migration enforce `MONTHLY_REQUEST_CAP`. The Worker fails closed to the static CV if this binding is unavailable.
3. Optionally create a KV namespace for 90-day question logs:

   ```sh
   npx wrangler kv namespace create AGENT_CV_LOGS
   ```

4. Add its returned ID to `wrangler.jsonc`:

   ```jsonc
   "kv_namespaces": [
     { "binding": "LOGS", "id": "<namespace-id>" }
   ]
   ```

5. Add the OpenAI secret and, optionally, a public contact address:

   ```sh
   npx wrangler secret put OPENAI_API_KEY
   ```

   Set `CONTACT_EMAIL` in `wrangler.jsonc` or as a secret only when the address is intended to be public. If it is unset, `/api/contact` returns `null` and the contact page keeps its application-email fallback.

6. Deploy:

   ```sh
   npm run deploy
   ```

The UI and raw CV remain available when the model API or required budget binding is unavailable. The chat remains safely unavailable until the OpenAI secret is configured. The `LOGS` KV binding is optional and stores questions only; budget accounting never uses eventually consistent KV counters.

If a Wrangler command fails with `fetch failed` and `SSL_CERT_FILE` points to a missing certificate bundle, run it with the stale override removed. For example:

```sh
env -u SSL_CERT_FILE NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem npx wrangler login
```

## Data maintenance

Private agent behavior and curated source files live in `data/`. `npm run sync:data` copies the approved public Markdown files into `public/`. Keep precise project statuses and distinguish John's personal contribution from team work.
