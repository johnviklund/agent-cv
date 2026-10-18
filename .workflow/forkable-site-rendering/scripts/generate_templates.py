"""One-off: turn public/*.html into owner-driven template functions (T4). Output is reviewed code."""
import re

def sub(src, a, b, count=1):
    assert src.count(a) >= 1, a
    return src.replace(a, b) if count == 0 else src.replace(a, b, count)

def region(src, start, end, replacement):
    a = src.index(start) + len(start)
    return src[:a] + replacement + src[src.index(end, a):]

def globals_(src, owner_page):
    src = sub(src, '<html lang="en">', '<html lang="${e(owner.site.lang)}">')
    src = sub(src, '<a class="wordmark" href="/" aria-label="John Viklund, home">JOHN VIKLUND</a>', '${wordmark(owner)}')
    src = src.replace("""  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "c7d9e434c60a4ce794a639192a5247ff"}'></script>\n""", "${beacon(owner)}")
    if owner_page:
        desc = re.search(r'<meta name="description" content="([^"]*)">', src)[1]
        src = src.replace(f'content="{desc}"', 'content="${e(page.description)}"')
    src = src.replace('  <meta name="twitter:site" content="@johnviklund">\n', "${twitter}")
    src = src.replace('content="John Viklund — CX AI Lead at Volvo Cars. Applied-AI builder and product leader. johnviklund.com"', 'content="${e(site.meta.ogImageAlt)}"')
    src = src.replace('<a href="https://github.com/johnviklund/agent-cv" rel="noopener noreferrer" target="_blank">Source ↗</a>', '${sourceLink(owner, "Source ↗")}')
    src = src.replace('<a href="https://github.com/johnviklund/agent-cv" rel="noopener noreferrer" target="_blank">View source ↗</a>', '${sourceLink(owner, "View source ↗")}')
    src = src.replace("Updated Oct 2026", "Updated ${e(updatedMonth(site))}")
    src = src.replace("https://johnviklund.com", "${e(owner.site.origin)}")
    src = src.replace("/john-viklund-cv.pdf", "/${e(owner.slug)}-cv.pdf")
    src = src.replace("John Viklund", "${e(owner.name.full)}")
    src = src.replace("John", "${e(owner.name.short)}")
    left = re.findall(r"John|Viklund|johnviklund|johnwik|c7d9|Volvo|Oct 2026", src)
    assert not left, left
    return src

import glob
for f in glob.glob("public/**/*.html", recursive=True):
    assert "`" not in open(f).read() and "${" not in open(f).read(), f

pages = {}
def page_header(src):
    return re.sub(r'<header class="page-header"><p class="eyebrow">.*?</p><h1>.*?</h1><p class="deck">.*?</p></header>',
                  lambda m: '${pageHeader(page)}', src, count=1)

t = open("public/about/index.html").read()
t = page_header(t)
t = region(t, '<article class="prose">\n', '      <a class="raw-link"', '${blocks(page.body, "      ", owner, "pages.about.body")}\n')
pages["About"] = ("about", t)

t = open("public/experience/index.html").read()
t = page_header(t)
t = region(t, '<section class="timeline" aria-label="Career timeline">\n', '    </section>', '${page.timeline.map(({ date, title, text }) => `      <article class="timeline-item"><p class="timeline-date">${e(date)}</p><div><h2>${e(title)}</h2><p>${e(text)}</p></div></article>`).join("\\n")}\n')
pages["Experience"] = ("experience", t)

t = open("public/projects/index.html").read()
t = sub(t, '<p class="eyebrow">SELECTED WORK · 2026</p>', '<p class="eyebrow">${e(page.eyebrow)}</p>')
t = sub(t, '<h1>AI projects, in practice.</h1>', '<h1>${e(page.heading)}</h1>')
t = re.sub(r'<p class="deck">.*?</p>', '<p class="deck">${e(page.deck)}</p>', t, count=1)
t = region(t, '<section class="project-list" aria-label="Selected projects">\n', '    </section>', '${page.items.map(projectRow).join("\\n")}\n')
pages["Projects"] = ("projects", t)

t = open("public/cv/index.html").read()
t = region(t, '<article class="prose">\n', '    </article>', '${blocks(page.body, "      ", owner, "pages.cv.body")}\n')
t = sub(t, '<footer class="site-footer"><span>Data updated 15 Oct 2026</span>', '<footer class="site-footer"><span>${e(page.footer)}</span>')
pages["Cv"] = ("cv", t)

t = open("public/contact/index.html").read()
t = page_header(t)
t = region(t, '<h2 id="contact-heading">Contact John directly.</h2>\n', '    </section>', '''      <p>${e(page.note)}</p>
${contactLines(owner)}
''')
t = sub(t, '<span>Gothenburg, Sweden · Open internationally</span>', '<span>${e(page.footer)}</span>')
pages["Contact"] = ("contact", t)

t = open("public/privacy/index.html").read()
t = region(t, '<article class="prose privacy-prose">\n', '    </article>', '${page.sections.map((section, index) => blocks(section, "      ", owner, `pages.privacy.sections[${index}]`)).join("\\n\\n")}\n')
pages["Privacy"] = ("privacy", t)

for name, path in [("Application", "application/index.html"), ("Admin", "admin/index.html"), ("NotFound", "404.html")]:
    pages[name] = (None, open(f"public/{path}").read())

out = ['''import {
  beacon, blocks, escapeHtml as e, profileLinks, sourceLink, updatedMonth, wordmark, xHandle,
} from "./html.mjs";

// Generated from the published pages, then reviewed: owner.json supplies identity, links and analytics;
// site.json supplies each page's copy. Markup outside the substitutions is the published page's.

const pageHeader = ({ eyebrow, heading, deck }) =>
  `<header class="page-header"><p class="eyebrow">${e(eyebrow)}</p><h1>${e(heading)}</h1><p class="deck">${e(deck)}</p></header>`;

const twitterLine = (owner) => (xHandle(owner) ? `  <meta name="twitter:site" content="@${e(xHandle(owner))}">\\n` : "");

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
  ].join("\\n");
};
''']
for name, (key, src) in pages.items():
    body = globals_(src, key not in (None, "privacy"))
    body = body.replace("${twitter}", "${twitterLine(owner)}")
    head = f"\nexport function render{name}({{ owner, site }}) {{\n"
    if key: head += f"  const page = site.pages.{key};\n"
    out.append(head + "  return `" + body + "`;\n}\n")
open("site/templates/pages.mjs", "w").write("".join(out))
