# PRD: Agent CV — Conversational Résumé Site

**Owner:** John
**Status:** Draft v0.2
**Last updated:** 2026-08-14

---

## 1. Overview

Instead of a traditional CV, publish a personal website with an embedded AI chat agent that represents John to recruiters and hiring managers. Visitors can ask questions about John's experience, projects, and background — or view a full traditional CV rendered as Markdown. Each job application gets a unique URL pre-loaded with that role's job description, giving the agent context to surface *relevant* experience.

**Primary objective:** Demonstrate — not just claim — that John does substantial AI work. The site itself is an AI project: agent architecture, prompt design, data curation, and AI-agent interoperability. Target audience is AI-related roles (AI engineering, AI product, applied AI, automation).

**Positioning:** Personal tool and portfolio piece. Explicitly *not* a SaaS venture (evaluated and rejected: narrow market, structural churn, weak willingness to pay, low defensibility).

## 2. Goals

- Show, through the medium itself, that John builds AI systems
- Give recruiters a low-friction, memorable way to explore John's work
- Surface the most relevant experience per application via JD-linked URLs
- Be readable by *both* humans and AI agents (recruiter-side bots, ATS AI, agentic screening tools)
- Learn from recruiter questions to improve the underlying data
- Always provide a traditional fallback (full CV as Markdown) so no one is blocked

## 3. Non-goals

- Not a SaaS product or multi-tenant platform
- No MCP server or installable components for the recruiter (hosted web chat only)
- No complex database — flat Markdown files as source of truth
- **The agent does not judge or score John's fit for a role.** It presents relevant experience; the recruiter draws the conclusion
- Agent does not negotiate, commit, or disclose salary expectations
- No PDF generation

## 4. Users

| User | Need |
|---|---|
| Recruiter (non-technical) | Quick summary, relevant highlights, full CV view, zero friction |
| Hiring manager (technical) | Deep-dives on AI projects, architecture decisions, working style |
| **AI agents** (recruiter-side bots, agentic screeners) | Machine-readable instructions and structured data (AGENTS.md, raw MD files) |
| John (admin) | Create application links, upload JDs, review analytics and question logs |

## 5. Core features (MVP)

### 5.1 Chat interface
- Single prompt box with 4 example queries beneath it:
  - "Summarize John's experience in 3 sentences"
  - "What AI/automation projects has John built?"
  - "What experience does John have relevant to this role?" (shown when a JD is linked)
  - "Show the full CV"
- Streaming responses, mobile-friendly

### 5.2 Data layer (Markdown files)
```
/data
  meta.md          # agent behavior, tone, boundaries, canned answers
  overview.md      # pitch, what I'm looking for, working style
  experience.md    # roles, dates, accomplishments
  projects.md      # AI project deep-dives (the centerpiece)
  skills.md        # strong / working knowledge / learning
  personal.md      # background, values, memorable specifics
  interests.md     # hobbies, side projects
  faq.md           # prewritten answers to common questions
```
All files concatenated into the system prompt (total content well under context limits). Versioned in Git.

Given the AI-role focus, `projects.md` carries the most weight: each entry should cover architecture, model choices, scale (e.g., 250k+ interactions), and outcomes — the details a technical interviewer would probe.

### 5.3 Full CV as Markdown
- "Show the full CV" renders `cv.md` — a complete, traditional CV — directly in the UI with clean typography
- Also served raw at a stable path (`/cv.md`) so it can be fetched, copied, or piped into any tool
- No PDF generation; recruiters who need a file can copy or print the rendered page

### 5.4 AI-agent interoperability
The site is a first-class citizen for AI visitors, which is itself part of the demonstration:

- **`/AGENTS.md`** — instructions for AI agents visiting the site: what this is, what data is available, how to query the chat API programmatically, what the agent will and won't answer, and a note that automated visitors are welcome
- **`/llms.txt`** — index of machine-readable resources (emerging convention for LLM-friendly sites)
- **Raw data access** — public MD files (`/cv.md`, `/projects.md`, `/overview.md`) served as plain Markdown at stable URLs; private files (meta.md, faq.md nuances) stay server-side
- **Structured metadata** — JSON-LD (`Person`, schema.org) in the page head for conventional parsers and ATS crawlers
- Optionally: a simple documented `POST /api/ask` endpoint so a recruiter's own agent can query John's agent directly — agent-to-agent conversation as a portfolio flex

### 5.5 Application links
- Unique slug per application: `site.com/a/x7k9m2`
- Each link stores: company, role, JD text, private notes, created/expiry dates, view count
- Agent context = base data files + that link's JD
- **Private notes are never included in agent context** (tracking only)
- Links can be expired or revoked from admin

### 5.6 Access control
- Unique link per application acts as lightweight auth
- Optional passcode ("code from my application email") for generic link
- Time-limited links (default 30-day expiry)
- Note: raw MD files and AGENTS.md are public by design — only chat + JD-linked context sits behind links

### 5.7 Admin dashboard
- Create/edit/expire application links
- Paste or upload JD
- View per-link engagement: views, question count, question log, human vs. bot traffic

## 6. Agent behavior requirements

- Grounded strictly in the data files — must say "I don't have that information, ask John directly" rather than fabricate
- **Never assesses or scores fit.** When a JD is present, the agent maps John's experience to the role's stated requirements ("the role asks for X; John has done Y") and leaves judgment to the recruiter. If asked directly "is John a good fit?", it responds along the lines of: "That's your call to make — here's the most relevant experience" and surfaces it
- Honest about what's in the data; no overselling (defined in meta.md)
- Deflects salary questions to direct conversation
- Shares personal details only when asked, never volunteers
- Can draft a tailored cover letter on request (JD-linked sessions)
- Treats AI-agent visitors the same as humans (same grounding rules, same boundaries)

## 7. Improvements identified in review

1. **Prompt injection protection.** Recruiters (human or bot) can send anything. The agent must resist attempts to extract the system prompt, private notes, or other applications' data, and must not follow instructions embedded in a pasted JD. Mitigation: private notes physically excluded from context; JD wrapped in clearly delimited data tags; meta.md includes explicit injection-resistance rules; per-link data isolation at the backend level. AI-agent traffic raises the bar here — assume adversarial inputs.
2. **Cost and abuse controls.** A public chat endpoint burning Claude API tokens needs rate limiting (per-IP and per-link), max conversation length, and a monthly spend cap with graceful degradation ("chat is temporarily unavailable — here's the full CV"). Bot traffic makes this more important, not less: rate-limit the `/api/ask` endpoint separately and consider a lower token budget for unauthenticated agent calls.
3. **GDPR compliance.** Logging recruiter questions is processing personal data, and EU rules apply (Sweden). Needs: a visible disclosure ("conversations may be reviewed to improve this system"), no linking of logs to identified individuals without consent, and a data retention window (e.g., auto-delete logs after 90 days).
4. **Contact capture / handoff.** Add a "Contact John" CTA and let the agent offer it when a recruiter signals interest ("Want to set up a call? Here's John's email / Calendly").
5. **Static fallback page.** A no-JS server-rendered summary (name, headline, key experience, link to `/cv.md`) so link previews and cautious corporate networks still get value. Largely covered by the raw-MD strategy; keep the landing page server-rendered.
6. **Session continuity.** Stateless for MVP; revisit if analytics show repeat visits.
7. **Answer quality feedback loop.** Log which questions the agent couldn't answer well — highest-signal input for improving the data files.
8. **Generic vs. linked entry point.** Bare domain = general mode, no JD, passcode-optional. Linked slugs add JD context.
9. **Content freshness marker.** "Data last updated" date visible in the UI, in AGENTS.md, and injected into agent context.

## 8. Tech stack (proposed)

- **Frontend:** Static site + edge functions (Vercel or Cloudflare Pages)
- **Backend:** Lightweight API route calling Claude API (Sonnet-class model for cost/quality balance)
- **Storage:** Markdown files in Git; application links in a single SQLite/KV table
- **Analytics:** Per-link view and question logging, human/bot classification, simple admin view

## 9. Success criteria

- A recruiter with zero instructions can get value in under 30 seconds
- The site reads clearly as "this person builds AI systems" within the first interaction
- At least one AI agent successfully consumes AGENTS.md / raw MD (visible in logs)
- Question logs produce at least one concrete data-file improvement per month of active job search
- API cost per active application under a few dollars

## 10. Open questions

- How much depth should the agent volunteer vs. wait to be asked? (Tune via meta.md iteration)
- Per-application links vs. one generic link + paste-in JD field? (Build generic first, add links if applying to >5 roles)
- Should `/api/ask` be fully open, or require the application-link token? (Open is a better flex; token is safer for cost)
- Custom domain and branding — personal domain or subdomain?

## 11. Phasing

**Phase 1 (MVP, ~1 weekend):** Generic link, chat over MD files, example queries, `/cv.md` + rendered CV view, AGENTS.md + llms.txt + raw MD files, disclosure notice, rate limiting.
**Phase 2:** JD-linked unique URLs, admin dashboard, per-link analytics, `POST /api/ask` documented endpoint.
**Phase 3 (optional):** Contact capture flow, session persistence, JSON-LD refinement, human/bot traffic classification.
