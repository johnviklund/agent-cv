"""One-off: extract John's page prose from public/*.html into site.json page sections (T4)."""
import html, json, re, sys

def read(page):
    return open(f"public/{page}/index.html").read()

def inline(fragment):
    fragment = re.sub(r"<strong>(.*?)</strong>", r"**\1**", fragment)
    fragment = re.sub(r"<code>(.*?)</code>", r"`\1`", fragment)
    fragment = re.sub(r'<a href="([^"]+)"[^>]*>(.*?)</a>', r"[\2](\1)", fragment)
    assert "<" not in fragment, fragment
    return html.unescape(fragment)

def block(line):
    line = line.strip()
    for tag, key in [("h2", "h2"), ("h3", "h3"), ("blockquote", "quote")]:
        m = re.fullmatch(rf"<{tag}>(.*)</{tag}>", line)
        if m: return {key: inline(m[1])}
    m = re.fullmatch(r'<p class="cv-kicker">(.*)</p>', line)
    if m: return {"kicker": inline(m[1])}
    m = re.fullmatch(r"<p>(.*)</p>", line)
    if m: return {"p": inline(m[1])}
    m = re.fullmatch(r"<ul>(.*)</ul>", line)
    if m: return {"list": [inline(item) for item in re.findall(r"<li>(.*?)</li>", m[1])]}
    raise ValueError(line)

def between(text, start, end):
    a = text.index(start) + len(start)
    return text[a:text.index(end, a)]

def header(text):
    m = re.search(r'<p class="eyebrow">(.*?)</p>\s*<h1>(.*?)</h1>\s*<p class="deck">(.*?)</p>', text)
    return {"eyebrow": inline(m[1]), "heading": inline(m[2]), "deck": inline(m[3])}

def description(text):
    return html.unescape(re.search(r'<meta name="description" content="([^"]*)">', text)[1])

pages = {}
t = read("about")
pages["about"] = {"description": description(t), **header(t),
    "body": [block(l) for l in between(t, '<article class="prose">\n', '      <a class="raw-link"').splitlines() if l.strip()]}
t = read("experience")
pages["experience"] = {"description": description(t), **header(t), "timeline": [
    {"date": inline(d), "title": inline(h), "text": inline(p)} for d, h, p in re.findall(
        r'<p class="timeline-date">(.*?)</p><div><h2>(.*?)</h2><p>(.*?)</p>', t)]}
t = read("projects")
items = []
for row in re.findall(r'<article class="project-row">\n(.*?)\n      </article>', t, re.S):
    title, summary = re.search(r'<h2 class="project-title">(.*?)</h2><p class="project-summary">(.*?)</p>', row).groups()
    sources = [{"label": inline(label.removesuffix(" ↗")), "href": href, **({"me": True} if rel.startswith("me ") else {})}
               for href, rel, label in re.findall(r'<a class="project-source" href="([^"]+)" rel="([^"]+)" target="_blank">(.*?)</a>', row)]
    items.append({"title": inline(title), "summary": inline(summary),
        "meta": inline(re.search(r'<p class="project-meta">(.*?)</p>', row)[1]), "sources": sources,
        "prompt": html.unescape(re.search(r'data-prompt="([^"]+)"', row)[1])})
pages["projects"] = {"description": description(t), **header(t), "items": items}
t = read("cv")
pages["cv"] = {"description": description(t),
    "body": [block(l) for l in between(t, '<article class="prose">\n', '    </article>').splitlines() if l.strip()],
    "footer": inline(re.search(r'<footer class="site-footer"><span>(.*?)</span>', t)[1])}
t = read("contact")
pages["contact"] = {"description": description(t), **header(t),
    "note": inline(re.search(r'<h2 id="contact-heading">.*?</h2>\s*<p>(.*?)</p>', t, re.S)[1]),
    "footer": inline(re.search(r'<footer class="site-footer"><span>(.*?)</span>', t)[1])}
t = read("privacy")
body = between(t, '<article class="prose privacy-prose">\n', '    </article>')
pages["privacy"] = {"sections": [[block(l) for l in chunk.splitlines() if l.strip()] for chunk in body.split("\n\n")]}
json.dump(pages, sys.stdout, indent=2, ensure_ascii=False)
