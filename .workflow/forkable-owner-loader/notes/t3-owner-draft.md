# T3 draft — John's owner.json and site.json

Values come from `wrangler.jsonc`, `config/admin-origin.json` and `public/index.html` at ccba344.
Validated with `loadOwner({ root })` against `schemas/owner.schema.json`: slug `john-viklund`.
Judgement calls: `headline` is the home hero deck's first sentence; `deploy.vars` omits
`CONTACT_EMAIL` (it lives in `contact.email`). Nothing reads either value until U2.

## owner.json

```json
{
  "schemaVersion": 1,
  "slug": "john-viklund",
  "name": { "full": "John Viklund", "short": "John" },
  "headline": "Applied-AI builder and product leader",
  "location": "Gothenburg, Sweden",
  "site": {
    "origin": "https://johnviklund.com",
    "hosts": ["johnviklund.com", "www.johnviklund.com"],
    "lang": "en",
    "sourceRepository": "https://github.com/johnviklund/agent-cv"
  },
  "links": {
    "linkedin": "https://www.linkedin.com/in/johnviklund/",
    "x": "https://x.com/johnviklund",
    "github": "https://github.com/johnviklund"
  },
  "contact": { "email": "johnwik@gmail.com" },
  "analytics": { "cloudflareBeaconToken": "c7d9e434c60a4ce794a639192a5247ff" },
  "deploy": {
    "workerName": "john-viklund-agent-cv",
    "archiveNamespaceId": "66eaa9b0f9724e31980aec66972ad219",
    "vars": {
      "OPENAI_MODEL": "gpt-6-luna",
      "OPENAI_REASONING_EFFORT": "none",
      "MAX_OUTPUT_TOKENS": "700",
      "MONTHLY_REQUEST_CAP": "1000",
      "COMPARISON_MODEL": "gpt-6-luna",
      "COMPARISON_MAX_OUTPUT_TOKENS": "8000",
      "COMPARISON_MONTHLY_REQUEST_CAP": "60",
      "ARCHIVE_RETENTION_DAYS": "90"
    }
  }
}
```

## site.json

```json
{
  "schemaVersion": 1
}
```
