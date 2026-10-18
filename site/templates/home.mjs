import { escapeHtml as e, escapeSingleQuoted, profileLinks, scriptJson as j } from "./html.mjs";

const item = (indent, { title, text, href }) => {
  const external = href.startsWith("https://");
  const attributes = external ? ' rel="noopener noreferrer" target="_blank"' : "";
  return `${indent}<li><a href="${e(href)}"${attributes}><strong>${e(title)}${external ? " ↗" : ""}</strong><span>${e(text)}</span></a></li>`;
};

// The home page: owner.json supplies identity, links and analytics; site.json supplies the copy.
export function renderHome({ owner, site }) {
  const { full, short } = owner.name;
  const { home, meta, person } = site;
  const origin = owner.site.origin;
  const title = `${full} — Agent CV`;
  const links = profileLinks(owner);
  const handle = owner.links?.x && new URL(owner.links.x).pathname.split("/").filter(Boolean)[0];
  const updatedMonth = new Date(`${site.updatedAt}T00:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  const linkList = (items) => items.map((entry) => item("              ", entry)).join("\n");

  const head = `  <title>${e(title)}</title>
  <meta name="description" content="${e(meta.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(meta.ogDescription)}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${e(origin)}/">
  <meta property="og:site_name" content="${e(title)}">
  <meta property="og:image" content="${e(origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${handle ? `  <meta name="twitter:site" content="@${e(handle)}">\n` : ""}  <link rel="canonical" href="${e(origin)}/">
  <link rel="alternate" type="text/markdown" href="/overview.md" title="Professional overview in Markdown">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": ${j(`${origin}/#profile`)},
    "url": ${j(`${origin}/`)},
    "name": ${j(title)},
    "dateModified": ${j(site.updatedAt)},
    "mainEntity": {
      "@type": "Person",
      "@id": ${j(`${origin}/#${owner.slug}`)},
      "name": ${j(full)},
      "url": ${j(`${origin}/`)},
      "description": ${j(person.description)},
      "jobTitle": ${j(person.jobTitle)},
${person.worksFor ? `      "worksFor": { "@type": "Organization", "name": ${j(person.worksFor)} },\n` : ""}      "address": { "@type": "PostalAddress", "addressLocality": ${j(person.locality)}, "addressCountry": ${j(person.country)} },
      "sameAs": [${links.map(({ href }) => j(href)).join(", ")}],
      "knowsAbout": [${person.knowsAbout.map(j).join(", ")}]
    }
  }
  </script>
`;
  const contactLinks = [
    ...(owner.contact?.email ? [`<a href="mailto:${e(owner.contact.email)}">Email</a>`] : []),
    ...links.map(({ href, label }) => `<a href="${e(href)}" rel="me noopener noreferrer" target="_blank">${label} ↗</a>`),
    `<a href="/cv/">Full CV →</a>`,
    `<a href="/${e(owner.slug)}-cv.pdf">PDF ↓</a>`,
  ].map((link) => `              ${link}`).join("\n");
  const starters = home.starters.map(({ label, prompt, href }) =>
    `              <li><a href="${e(href)}" data-prompt="${e(prompt)}"><span>${e(label)}</span><span aria-hidden="true">→</span></a></li>`).join("\n");
  const followups = home.followups.map(({ label, prompt }) =>
    `            <button type="button" data-followup="${e(prompt)}">${e(label)}</button>`).join("\n");
  const repository = owner.site.sourceRepository;
  const source = repository ? `      <a href="${e(repository)}" rel="me noopener noreferrer" target="_blank">Source ↗</a>\n` : "";
  const token = owner.analytics?.cloudflareBeaconToken;
  const beacon = token
    ? `  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${escapeSingleQuoted(`{"token": ${JSON.stringify(token)}}`)}'></script>\n`
    : "";

  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${head}  <script src="/navigation.js" type="module"></script>
  <script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="wordmark" href="/" aria-label="${e(full)}, home">${e(full.toLocaleUpperCase(owner.site.lang))}</a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="/experience/">Experience</a>
        <a href="/projects/">Projects</a>
        <a href="/about/">About</a>
        <a href="/cv/">Full CV</a>
        <a href="/contact/">Contact</a>
      </nav>
      <details class="mobile-nav">
        <summary aria-label="Open navigation">Menu</summary>
        <nav aria-label="Mobile navigation">
          <a href="/experience/">Experience</a>
          <a href="/projects/">Projects</a>
          <a href="/about/">About</a>
          <a href="/cv/">Full CV</a>
          <a href="/contact/">Contact</a>
        </nav>
      </details>
    </div>
  </header>

  <main id="main" class="home" data-home>
    <div class="home-stage">
      <section class="hero" data-workspace-home aria-labelledby="home-title">
        <div class="hero-intro">
          <div class="hero-copy">
            <p class="eyebrow">${e(home.eyebrow)}</p>
            <h1 id="home-title">${e(home.heading.first)}<br><span>${e(home.heading.second)}</span></h1>
            <p class="hero-deck">${e(home.deck)}</p>
            <nav class="hero-contact" aria-label="Contact ${e(short)}">
${contactLinks}
            </nav>

          </div>
          <div class="home-interaction">
            <h2 class="interaction-title">Ask my agent.</h2>
            <p class="interaction-note">Grounded in my CV and project record.</p>
            <form class="chat-form" data-home-form>
              <label class="sr-only" for="home-question">Ask about ${e(short)}'s experience</label>
              <div class="composer">
                <input id="home-question" data-initial-input data-chat-control name="question" maxlength="1200" autocomplete="off" placeholder="Ask a question…" required>
                <button class="send-button" data-chat-control type="submit" aria-label="Send question">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>
            </form>

            <ol class="starter-list" aria-label="Suggested questions">
${starters}
              <li><a href="/#compare" data-workspace-mode="compare" data-compare-entry><span>Compare up to three roles</span><span aria-hidden="true">→</span></a></li>
              <li><a href="/cv/"><span>Show the full CV</span><span aria-hidden="true">→</span></a></li>
            </ol>
            <p class="workspace-message" data-workspace-message role="status" hidden></p>

            <noscript>
              <section class="noscript-summary">
                <h2>${e(full)}</h2>
                <p>${e(home.summary)}</p>
                <a href="/cv/">Read the full CV →</a>
              </section>
            </noscript>
          </div>
        </div>

        <div class="home-profile">
          <section aria-labelledby="proof-title">
            <h2 class="eyebrow" id="proof-title">Proof points</h2>
            <ul class="proof-list">
${linkList(home.proof)}
            </ul>
          </section>
          <section aria-labelledby="work-title">
            <h2 class="eyebrow" id="work-title">Selected work</h2>
            <ul class="work-list">
${linkList(home.work)}
            </ul>
          </section>
        </div>

        <section class="conversation-shell" data-conversation aria-label="Conversation" hidden>
          <div class="conversation-toolbar">
            <span>CONVERSATION 01</span>
            <button class="text-button" data-start-over type="button">Start over ↗</button>
          </div>
          <div data-message-list></div>
          <form class="chat-form conversation-composer" data-home-form data-conversation-composer>
            <label class="sr-only" for="followup-question">Ask a follow-up</label>
            <div class="composer">
              <input id="followup-question" data-chat-control maxlength="1200" autocomplete="off" placeholder="Ask a follow-up…" required>
              <button class="send-button" data-chat-control type="submit" aria-label="Send follow-up">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </form>
          <div class="followups" data-followups hidden aria-label="Suggested follow-up questions">
${followups}
          </div>
        </section>
      </section>

      <section class="comparison-workspace" data-comparison-workspace hidden aria-labelledby="comparison-title">
        <header class="comparison-header">
          <div>
            <p class="eyebrow">ROLE COMPARISON · PUBLIC EVIDENCE ONLY</p>
            <h1 id="comparison-title" tabindex="-1">Read the roles side by side.</h1>
            <p class="comparison-deck">Paste up to three openings. The dossier aligns their requirements with what ${e(short)}'s published CV and project record can support—without scores, rankings or hiring recommendations.</p>
          </div>
          <a class="comparison-back" href="/" data-comparison-back>← Back to conversation</a>
        </header>

        <form class="comparison-form" data-comparison-form novalidate>
          <div class="comparison-form-heading">
            <div>
              <p class="eyebrow">THE BRIEFS</p>
              <h2>Roles to examine</h2>
            </div>
            <span data-role-count>2 of 3 roles</span>
          </div>
          <details class="comparison-batch">
            <summary id="comparison-batch-summary">Import multiple roles</summary>
            <div class="comparison-batch-panel" role="region" aria-labelledby="comparison-batch-summary">
              <p>Import one to three roles as JSON (<code>{ "roles": [...] }</code>) or Markdown with an explicit <code>## Role:</code> or <code>## Role title:</code> marker per role and optional <code>Company:</code> and <code>Description:</code> labels. Other headings stay inside the role description. <a href="/positions-template.md" download>Download Markdown template</a>.</p>
              <label for="comparison-role-batch">Role batch</label>
              <textarea id="comparison-role-batch" data-role-batch rows="10" placeholder="## Role: Product Manager&#10;Company: Example&#10;Description:&#10;## Responsibilities&#10;Define the roadmap, prioritize requirements and measure adoption."></textarea>
              <div class="comparison-batch-actions">
                <input class="comparison-file-input" id="comparison-role-file" data-role-file type="file" aria-label="Choose a Markdown or JSON role file" accept=".md,.markdown,.json,text/markdown,application/json,text/plain">
                <button class="secondary-action" data-import-roles type="button">Import roles</button>
              </div>
              <p class="comparison-batch-status" data-role-batch-status role="status"></p>
            </div>
          </details>
          <div class="role-editor-list" data-role-editors></div>
          <div class="role-editor-actions">
            <button class="secondary-action" data-add-role type="button">+ Add another role</button>
          </div>
          <p class="comparison-privacy-note"><strong>Before you compare:</strong> review the detected requirements above. Explicit requirement sections take priority over summary prose; common informational sections and employment boilerplate are excluded. Only the role title, company and detected requirement statements are sent to OpenAI for analysis. The complete draft stays in memory while this page is open and, when available, in this browser session. It may remain in your provider or browser-agent account history.</p>
          <p class="comparison-form-error" data-comparison-form-error role="alert"></p>
          <div class="comparison-submit-row">
            <button class="primary-action" data-compare-submit type="submit">Compare the evidence</button>
            <button class="secondary-action" data-compare-cancel type="button" hidden>Cancel analysis</button>
            <button class="secondary-action" data-compare-clear type="button" hidden>Clear comparison</button>
            <span>Requirements stay in source order. The comparison never decides which role is “best.”</span>
          </div>
        </form>

        <p class="comparison-storage-note" data-comparison-storage-note role="status" hidden>Private session storage is unavailable. The comparison remains fully usable in memory until this page closes.</p>
        <p class="comparison-state-indicator" data-comparison-state role="status">Comparison draft ready for editing.</p>
        <div class="comparison-live sr-only" data-comparison-status aria-live="polite" aria-atomic="true"></div>
        <section class="comparison-error" data-comparison-error tabindex="-1" hidden aria-labelledby="comparison-error-title">
          <p class="eyebrow" data-comparison-error-label>COMPARISON UNAVAILABLE</p>
          <h2 id="comparison-error-title" data-comparison-error-title>Check the role briefs and try again.</h2>
          <p data-comparison-error-copy></p>
          <div class="comparison-error-actions">
            <button class="secondary-action" data-comparison-retry type="button">Try again</button>
            <a href="/cv/">Read the full CV instead →</a>
          </div>
        </section>

        <section class="comparison-result" data-comparison-result hidden aria-labelledby="comparison-caption">
          <header class="comparison-result-heading">
            <div>
              <p class="eyebrow">THE EVIDENCE LEDGER</p>
              <h2 id="comparison-caption" data-comparison-caption tabindex="-1">One record, several role lenses.</h2>
            </div>
            <div class="comparison-result-meta">
              <p data-comparison-result-notice></p>
              <div class="comparison-export-actions" role="group" aria-label="Export comparison">
                <button class="text-button" data-export-comparison="markdown" type="button">Export Markdown</button>
                <button class="text-button" data-export-comparison="json" type="button">Export JSON</button>
              </div>
            </div>
          </header>
          <div class="comparison-table-scroll" data-comparison-table role="region" tabindex="0" aria-label="Scrollable role comparison table"></div>
          <section class="comparison-unmapped" data-comparison-unmapped aria-label="Requirements not assessed" hidden></section>
          <section class="comparison-evidence-library" data-comparison-evidence-library aria-labelledby="comparison-evidence-library-title" hidden>
            <div class="comparison-library-heading">
              <p class="eyebrow">CANONICAL EVIDENCE REFERENCES</p>
              <h3 id="comparison-evidence-library-title">Evidence cited in this comparison</h3>
            </div>
            <div data-comparison-evidence-items></div>
          </section>
          <p class="comparison-method-note"><strong>How to read this:</strong> “Not documented yet” means the public record is silent—not that ${e(short)} lacks the capability. Open a cell to inspect the original role wording, evidence and questions worth asking.</p>
        </section>
      </section>
    </div>

    <footer class="home-footer">
      <span>Grounded in ${e(short)}'s CV · Updated ${e(updatedMonth)}</span>
      <span class="footer-separator" aria-hidden="true">|</span>
      <span>Conversations may be reviewed · Logs delete after 90 days</span>
      <span class="footer-separator" aria-hidden="true">|</span>
      <a href="/privacy/">Privacy</a>
${source}    </footer>
  </main>
${beacon}</body>
</html>
`;
}
