"""One-off: turn public discovery files into owner-driven text templates (T4). Output is reviewed code."""
import re

exprs = []
def x(expression):
    exprs.append(expression)
    return f"\0{len(exprs) - 1}\0"

def sub(src, a, b):
    assert a in src, a
    return src.replace(a, b)

def common(src):
    src = src.replace("/john-viklund-cv.pdf", "/" + x("${owner.slug}") + "-cv.pdf")
    src = src.replace("Visit johnviklund.com.", "Visit " + x("${host}") + ".")
    src = src.replace("https://johnviklund.com", x("${owner.site.origin}"))
    src = src.replace("John Viklund", x("${owner.name.full}"))
    src = src.replace("John", x("${owner.name.short}"))
    left = re.findall(r"John|Viklund|johnviklund|2026-10-18|18 October 2026", src)
    assert not left, left
    escaped = src.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    return re.sub(r"\0(\d+)\0", lambda m: exprs[int(m[1])], escaped)

robots = common(open("public/robots.txt").read())
sitemap = common(open("public/sitemap.xml").read().replace("2026-10-18", x("${site.updatedAt}")))

llms = open("public/llms.txt").read()
llms = sub(llms, "> Conversational résumé for a CX AI Lead, applied-AI builder, product leader, and former AI startup founder.", "> Conversational résumé for a " + x("${site.person.description}"))
llms = sub(llms, "- [Public source](https://github.com/johnviklund/agent-cv): implementation, tests, and repository allowlist\n", x('${source ? `- [Public source](${source}): implementation, tests, and repository allowlist\\n` : ""}'))
llms = sub(llms, "; X (@johnviklund) and email give the fastest response; LinkedIn is an additional route, not a replacement for either.", x('${fastest ? `; ${fastest}, not a replacement for either` : ""}') + ".")
llms = sub(llms, "Data last updated: 2026-10-18", "Data last updated: " + x("${site.updatedAt}"))
llms = common(llms)

agents = open("public/AGENTS.md").read()
agents = sub(agents, "for John Viklund, CX AI Lead, applied-AI builder, product leader, and former AI startup founder.", "for " + x("${owner.name.full}") + ", " + x("${site.person.description}"))
agents = sub(agents, "- `https://github.com/johnviklund/agent-cv` — public source, tests, and repository-grounding manifest\n", x('${source ? `- \\`${source}\\` — public source, tests, and repository-grounding manifest\\n` : ""}'))
agents = sub(agents, " X (@johnviklund) and email give the fastest response; LinkedIn is an additional route there, not a replacement for either.", x('${fastest ? ` ${fastest} there, not a replacement for either.` : ""}'))
agents = sub(agents, "Public data last updated: 18 October 2026.", "Public data last updated: " + x("${longDate}") + ".")
agents = common(agents)

open("site/templates/discovery.mjs", "w").write('''import { xHandle } from "./html.mjs";

// Generated from the published discovery files, then reviewed: owner identity, links and dates come
// from owner.json and site.json; routes, API, tool names and limits stay engine text.

// The contact-preference clause, stated only when the owner publishes X, email and LinkedIn.
function fastestContact(owner) {
  const handle = xHandle(owner);
  return handle && owner.contact?.email && owner.links?.linkedin
    ? `X (@${handle}) and email give the fastest response; LinkedIn is an additional route`
    : "";
}

export function renderDiscovery({ owner, site }) {
  const source = owner.site.sourceRepository;
  const host = new URL(owner.site.origin).host;
  const fastest = fastestContact(owner);
  const longDate = new Date(`${site.updatedAt}T00:00:00Z`)
    .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return {
    "robots.txt": `''' + robots + '''`,
    "sitemap.xml": `''' + sitemap + '''`,
    "llms.txt": `''' + llms + '''`,
    "AGENTS.md": `''' + agents + '''`,
  };
}
''')
