import {
  beacon, blocks, escapeHtml as e, htmlAttributes, profileLinks, sourceLink, updatedMonth, wordmark, xHandle,
} from "./html.mjs";

// Generated from the published pages, then reviewed: owner.json supplies identity, links and analytics;
// site.json supplies each page's copy. Markup outside the substitutions is the published page's.

const pageHeader = ({ eyebrow, heading, deck }) =>
  `<header class="page-header"><p class="eyebrow">${e(eyebrow)}</p><h1>${e(heading)}</h1><p class="deck">${e(deck)}</p></header>`;

const twitterLine = (owner) => (xHandle(owner) ? `  <meta name="twitter:site" content="@${e(xHandle(owner))}">\n` : "");

const projectRow = ({ title, summary, meta, sources, prompt }) => {
  const links = sources.map(({ label, href, me }) =>
    `<a class="project-source" href="${e(href)}" rel="${me ? "me " : ""}noopener noreferrer" target="_blank">${e(label)} ↗</a>`).join(" ");
  return `      <article class="project-row">
        <div><h2 class="project-title">${e(title)}</h2><p class="project-summary">${e(summary)}</p></div><div class="project-meta-block"><p class="project-meta">${e(meta)}</p>${links}</div><a class="project-action" href="/" data-prompt="${e(prompt)}">Ask about this project →</a>
      </article>`;
};

// The contact panel's X, email and LinkedIn lines; the email element stays for the contact controller.
const contactLines = (owner) => {
  const { x, linkedin } = owner.links ?? {};
  const email = owner.contact?.email;
  return [
    ...(x ? [`      <p class="contact-value"><a class="contact-email" href="${e(x)}" rel="me noopener noreferrer" target="_blank">@${e(xHandle(owner))} on X ↗</a></p>`] : []),
    `      <p class="contact-value" data-contact-value>${email ? `<a class="contact-email" href="mailto:${e(email)}">${e(email)}</a>` : ""}</p>`,
    `      <div class="contact-actions">${linkedin ? `<a href="${e(linkedin)}" rel="me noopener noreferrer" target="_blank">LinkedIn profile ↗</a>` : ""}</div>`,
  ].join("\n");
};

export function renderAbout({ owner, site }) {
  const page = site.pages.about;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>About — ${e(owner.name.full)}</title>
  <meta name="description" content="${e(page.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="About — ${e(owner.name.full)}">
  <meta property="og:description" content="${e(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/about/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/about/">
  <link rel="alternate" type="text/markdown" href="/overview.md" title="Professional overview in Markdown">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/navigation.js" type="module"></script><script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/" aria-current="page">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/" aria-current="page">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main">
    ${pageHeader(page)}
    <article class="prose">
${blocks(page.body, "      ", owner, "pages.about.body")}
      <a class="raw-link" href="/overview.md">Read the machine-readable overview →</a>
    </article>
    <section class="subpage-chat" aria-label="Ask about ${e(owner.name.short)}'s working style"><form action="/" method="get" data-subpage-form><label class="sr-only" for="about-question">Ask about ${e(owner.name.short)}'s working style</label><div class="composer"><input id="about-question" maxlength="1200" placeholder="Ask about working style or role preferences…" required><button class="send-button" type="submit" aria-label="Start a conversation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></form><p>Personal details are shared only when relevant and requested.</p></section>
  </main>
  <footer class="site-footer"><span>Grounded in ${e(owner.name.short)}'s CV · Updated ${e(updatedMonth(site))}</span><span class="footer-separator" aria-hidden="true">|</span><a href="/contact/">Contact ${e(owner.name.short)}</a><a href="/privacy/">Privacy</a>${sourceLink(owner, "Source ↗")}</footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderExperience({ owner, site }) {
  const page = site.pages.experience;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Experience — ${e(owner.name.full)}</title>
  <meta name="description" content="${e(page.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="Experience — ${e(owner.name.full)}">
  <meta property="og:description" content="${e(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/experience/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/experience/">
  <link rel="alternate" type="text/markdown" href="/cv.md" title="Full CV in Markdown">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/navigation.js" type="module"></script><script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/" aria-current="page">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/" aria-current="page">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main">
    ${pageHeader(page)}
    <section class="timeline" aria-label="Career timeline">
${page.timeline.map(({ date, title, text }) => `      <article class="timeline-item"><p class="timeline-date">${e(date)}</p><div><h2>${e(title)}</h2><p>${e(text)}</p></div></article>`).join("\n")}
    </section>
    <section class="subpage-chat" aria-label="Ask about ${e(owner.name.short)}'s experience"><form action="/" method="get" data-subpage-form><label class="sr-only" for="experience-question">Ask about ${e(owner.name.short)}'s experience</label><div class="composer"><input id="experience-question" maxlength="1200" placeholder="Ask about a role or career transition…" required><button class="send-button" type="submit" aria-label="Start an experience conversation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></form><p>The agent distinguishes verified dates from approximate role chronology.</p></section>
  </main>
  <footer class="site-footer"><span>Grounded in ${e(owner.name.short)}'s CV · Updated ${e(updatedMonth(site))}</span><span class="footer-separator" aria-hidden="true">|</span><a href="/cv/">Read the full CV</a><a href="/privacy/">Privacy</a>${sourceLink(owner, "Source ↗")}</footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderProjects({ owner, site }) {
  const page = site.pages.projects;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Projects — ${e(owner.name.full)}</title>
  <meta name="description" content="${e(page.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="AI Projects — ${e(owner.name.full)}">
  <meta property="og:description" content="${e(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/projects/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/projects/">
  <link rel="alternate" type="text/markdown" href="/projects.md" title="Selected projects in Markdown">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script src="/navigation.js" type="module"></script>
  <script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      ${wordmark(owner)}
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="/experience/">Experience</a><a href="/projects/" aria-current="page">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a>
      </nav>
      <details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/" aria-current="page">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details>
    </div>
  </header>

  <main id="main" class="page-main">
    <header class="page-header">
      <p class="eyebrow">${e(page.eyebrow)}</p>
      <h1>${e(page.heading)}</h1>
      <p class="deck">${e(page.deck)}</p>
    </header>

    <section class="project-list" aria-label="Selected projects">
${page.items.map(projectRow).join("\n")}
    </section>

    <section class="subpage-chat" aria-label="Ask about the projects">
      <form action="/" method="get" data-subpage-form><label class="sr-only" for="project-question">Ask about any project</label><div class="composer"><input id="project-question" maxlength="1200" placeholder="Ask about any project…" required><button class="send-button" type="submit" aria-label="Start a project conversation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></form>
      <p>Questions stay grounded in ${e(owner.name.short)}'s project data.</p>
    </section>
  </main>
  <footer class="site-footer"><span>Grounded answers only · Updated ${e(updatedMonth(site))}</span><span class="footer-separator" aria-hidden="true">|</span><a href="/projects.md">Raw projects.md</a><a href="/privacy/">Privacy</a>${sourceLink(owner, "Source ↗")}</footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderCv({ owner, site }) {
  const page = site.pages.cv;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Full CV — ${e(owner.name.full)}</title>
  <meta name="description" content="${e(page.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="Full CV — ${e(owner.name.full)}">
  <meta property="og:description" content="${e(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/cv/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/cv/">
  <link rel="alternate" type="text/markdown" href="/cv.md" title="Full CV in Markdown">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/navigation.js" type="module"></script><script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/" aria-current="page">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/" aria-current="page">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main">
    <header class="page-header"><p class="eyebrow">TRADITIONAL FORMAT · HUMAN & MACHINE READABLE</p><h1>Curriculum vitae.</h1><p class="deck">The complete fallback—read it here, fetch the raw Markdown, copy it or print it.</p><a class="raw-link" href="/${e(owner.slug)}-cv.pdf">Download PDF →</a> <a class="raw-link" href="/cv.md">Open raw cv.md →</a></header>
    <article class="prose">
${blocks(page.body, "      ", owner, "pages.cv.body")}
    </article>
  </main>
  <footer class="site-footer"><span>${e(page.footer)}</span><span class="footer-separator" aria-hidden="true">|</span><a href="/cv.md">Raw Markdown</a><a href="/privacy/">Privacy</a>${sourceLink(owner, "Source ↗")}</footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderContact({ owner, site }) {
  const page = site.pages.contact;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contact — ${e(owner.name.full)}</title>
  <meta name="description" content="${e(page.description)}">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="Contact — ${e(owner.name.full)}">
  <meta property="og:description" content="${e(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/contact/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/contact/">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/navigation.js" type="module"></script><script src="/app.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/" aria-current="page">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/" aria-current="page">Contact</a></nav></details></div></header>
  <main id="main" class="page-main">
    ${pageHeader(page)}
    <section class="contact-panel" aria-labelledby="contact-heading">
      <h2 id="contact-heading">Contact ${e(owner.name.short)} directly.</h2>
      <p>${e(page.note)}</p>
${contactLines(owner)}
    </section>
    <div class="machine-links" aria-label="Machine-readable resources"><a href="/AGENTS.md">AGENTS.md</a><a href="/llms.txt">llms.txt</a><a href="/cv.md">cv.md</a><a href="/projects.md">projects.md</a><a href="/repositories.md">repositories.md</a></div>
  </main>
  <footer class="site-footer"><span>${e(page.footer)}</span><span class="footer-separator" aria-hidden="true">|</span><a href="/privacy/">Privacy</a><a href="/">Ask ${e(owner.name.short)}'s agent</a></footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderPrivacy({ owner, site }) {
  const page = site.pages.privacy;
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Privacy — ${e(owner.name.full)}'s Agent CV</title>
  <meta name="description" content="How the Agent CV handles chat, transient role comparisons, processor retention, feedback, and private exports.">
  <meta name="theme-color" content="#20231f">
  <meta property="og:title" content="Privacy — ${e(owner.name.full)}'s Agent CV">
  <meta property="og:description" content="How the Agent CV handles chat, transient role comparisons, processor retention, feedback, and private exports.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${e(owner.site.origin)}/privacy/">
  <meta property="og:site_name" content="${e(owner.name.full)} — Agent CV">
  <meta property="og:image" content="${e(owner.site.origin)}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(site.meta.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
${twitterLine(owner)}  <link rel="canonical" href="${e(owner.site.origin)}/privacy/">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script src="/navigation.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main">
    <header class="page-header"><p class="eyebrow">PLAIN LANGUAGE · DATA MINIMIZATION</p><h1>Conversation privacy.</h1><p class="deck">The chat is designed to improve the CV without turning visitors into profiles.</p></header>
    <article class="prose privacy-prose">
${page.sections.map((section, index) => blocks(section, "      ", owner, `pages.privacy.sections[${index}]`)).join("\n\n")}
    </article>
  </main>
  <footer class="site-footer"><a href="/">Ask ${e(owner.name.short)}'s agent</a><span class="footer-separator" aria-hidden="true">|</span>${sourceLink(owner, "View source ↗")}</footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderApplication({ owner, site }) {
  return `<!doctype html>
<html ${htmlAttributes(owner)}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Role-specific Agent CV — ${e(owner.name.full)}</title>
  <meta name="description" content="A private, expiring role-specific entry point to ${e(owner.name.full)}'s grounded Agent CV.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#20231f">
  <link rel="describedby" href="/llms.txt" type="text/plain">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script src="/navigation.js" type="module"></script>
  <script src="/app.js" type="module"></script>
  <script src="/application.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Application navigation"><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile application navigation"><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main application-main" data-application-page>
    <header class="page-header">
      <p class="eyebrow">PRIVATE LINK · ROLE-SPECIFIC CONTEXT</p>
      <h1>A focused conversation.</h1>
      <p class="deck" data-application-heading>Loading the role context…</p>
    </header>
    <section class="application-context" aria-labelledby="application-context-heading">
      <p class="application-company" data-application-company>APPLICATION</p>
      <h2 id="application-context-heading" data-application-role>Role context</h2>
      <p>The assistant can map the supplied job description to ${e(owner.name.short)}'s documented experience and draft grounded application material. It will not score fit, invent qualifications, or reveal private notes.</p>
    </section>
    <ol class="starter-list application-starters" aria-label="Suggested role-specific questions">
      <li><a href="/" data-prompt="Map ${e(owner.name.short)}'s documented experience to the most important requirements in this role."><span><span class="starter-number">01</span>Map relevant experience</span><span aria-hidden="true">→</span></a></li>
      <li><a href="/" data-prompt="Which of ${e(owner.name.short)}'s projects best demonstrate the capabilities requested in this role?"><span><span class="starter-number">02</span>Find relevant projects</span><span aria-hidden="true">→</span></a></li>
      <li><a href="/" data-prompt="Draft a concise cover letter for this role using only documented facts."><span><span class="starter-number">03</span>Draft a cover letter</span><span aria-hidden="true">→</span></a></li>
    </ol>
    <section class="subpage-chat" aria-label="Ask a role-specific question">
      <form action="/" method="get" data-subpage-form><label class="sr-only" for="application-question">Ask about relevant experience</label><div class="composer"><input id="application-question" maxlength="1200" placeholder="Ask a role-specific question…" required><button class="send-button" type="submit" aria-label="Start a role-specific conversation"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></form>
      <p>This expiring link adds the supplied job description to the private prompt context.</p>
    </section>
  </main>
  <footer class="site-footer"><a href="/privacy/">Privacy</a><span class="footer-separator" aria-hidden="true">|</span><a href="/cv/">Full CV</a></footer>
${beacon(owner)}</body>
</html>
`;
}

export function renderAdmin({ owner, site }) {
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Private archive — ${e(owner.name.full)}</title>
  <meta name="description" content="Private administration for the Agent CV conversation archive.">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#20231f">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <script src="/navigation.js" type="module"></script>
  <script src="/admin.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Private navigation"><a href="/">Public site</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile private navigation"><a href="/">Public site</a></nav></details></div></header>
  <main id="main" class="page-main admin-main">
    <header class="page-header">
      <p class="eyebrow">PRIVATE · AUTHENTICATED</p>
      <h1>Conversation archive.</h1>
      <p class="deck">Review usage signals and export grounded conversations as JSONL for local analysis and follow-up interviews.</p>
    </header>

    <section class="admin-auth" aria-labelledby="admin-auth-heading">
      <h2 id="admin-auth-heading">Connect to the archive</h2>
      <form data-admin-form>
        <label for="admin-token">Admin API token</label>
        <div class="composer admin-token-composer">
          <input id="admin-token" name="token" type="password" autocomplete="current-password" required placeholder="Paste token for this session">
          <button class="admin-connect" type="submit">Load</button>
        </div>
      </form>
      <p class="admin-note">The token remains in this browser tab only. It is never written to local storage.</p>
      <p data-admin-status aria-live="polite"></p>
    </section>

    <section class="admin-dashboard" data-admin-dashboard hidden aria-labelledby="admin-dashboard-heading">
      <div class="admin-dashboard-heading">
        <div><p class="eyebrow">ROLLING ARCHIVE</p><h2 id="admin-dashboard-heading">Signals at a glance</h2></div>
        <button type="button" class="project-action admin-export" data-admin-export>Download conversations.jsonl →</button>
      </div>
      <dl class="admin-stats" data-admin-stats></dl>
      <p class="admin-note">Exports contain visitor questions, assistant answers, outcomes, coarse human/bot classification, and feedback. They never contain logged IP addresses or hidden prompts.</p>

      <section class="admin-conversation-review" aria-labelledby="admin-conversation-review-heading">
        <div class="admin-dashboard-heading">
          <div><p class="eyebrow">LEARNING LOOP</p><h2 id="admin-conversation-review-heading">Conversation candidates</h2></div>
        </div>
        <p class="admin-note">Browse private turns by application and session. Filters use “any match”: a turn appears when it has at least one selected signal.</p>
        <form class="admin-review-filters" data-review-filters>
          <fieldset>
            <legend>Learning signals</legend>
            <label><input type="checkbox" name="reason" value="failed" checked> Failed</label>
            <label><input type="checkbox" name="reason" value="incomplete" checked> Incomplete</label>
            <label><input type="checkbox" name="reason" value="not_helpful" checked> Not helpful</label>
            <label><input type="checkbox" name="reason" value="unanswered" checked> Unanswered</label>
          </fieldset>
        </form>
        <button type="button" class="admin-export admin-review-load" data-review-load>Load conversation candidates →</button>
        <div class="admin-review-list" data-review-list></div>
        <div class="admin-review-actions">
          <button type="button" class="admin-connect" data-review-brief disabled>Download private agent brief</button>
          <button type="button" class="admin-export" data-review-clear disabled>Clear classifications</button>
        </div>
        <p class="admin-note">Classify every visible candidate before creating the brief. The brief contains private transcript text: keep it out of Git, review it with Codex locally, and delete it when the review purpose is complete.</p>
        <p data-review-status aria-live="polite">No candidates selected for a brief.</p>
      </section>

      <section class="admin-applications" aria-labelledby="admin-applications-heading">
        <div class="admin-dashboard-heading"><div><p class="eyebrow">ROLE CONTEXT</p><h2 id="admin-applications-heading">Application links</h2></div></div>
        <form class="admin-application-form" data-application-form>
          <div><label for="application-company">Company</label><input id="application-company" name="company" maxlength="100" required></div>
          <div><label for="application-role">Role</label><input id="application-role" name="role" maxlength="140" required></div>
          <div class="admin-field-wide"><label for="application-jd">Job description</label><textarea id="application-jd" name="jobDescription" maxlength="24000" rows="9" required></textarea></div>
          <div class="admin-field-wide"><label for="application-notes">Private notes — never added to the AI prompt</label><textarea id="application-notes" name="privateNotes" maxlength="4000" rows="3"></textarea></div>
          <div><label for="application-expiry">Expires after</label><select id="application-expiry" name="expiresDays"><option value="30">30 days</option><option value="14">14 days</option><option value="60">60 days</option><option value="90">90 days</option></select></div>
          <button class="admin-connect" type="submit">Create private link</button>
        </form>
        <p data-application-status aria-live="polite"></p>
        <div class="admin-application-list" data-application-list></div>
      </section>
    </section>
  </main>
</body>
</html>
`;
}

export function renderNotFound({ owner, site }) {
  return `<!doctype html>
<html lang="${e(owner.site.lang)}">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — ${e(owner.name.full)}</title>
  <meta name="description" content="The requested Agent CV page could not be found.">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script src="/navigation.js" type="module"></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><div class="header-inner">${wordmark(owner)}<nav class="desktop-nav" aria-label="Primary navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav><details class="mobile-nav"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile navigation"><a href="/experience/">Experience</a><a href="/projects/">Projects</a><a href="/about/">About</a><a href="/cv/">Full CV</a><a href="/contact/">Contact</a></nav></details></div></header>
  <main id="main" class="page-main"><header class="page-header"><p class="eyebrow accent-label">404 · NOT FOUND</p><h1>This path ends here.</h1><p class="deck">The conversation can continue from the homepage, or you can use the traditional CV.</p><div class="machine-links"><a href="/">Ask ${e(owner.name.short)}'s agent →</a><a href="/cv/">Read the full CV →</a></div></header></main>
${beacon(owner)}</body>
</html>
`;
}
