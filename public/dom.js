export function createLink(text, href) {
  const link = document.createElement("a");
  link.textContent = text;
  link.href = href;
  if (isExternal(href)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  return link;
}

function isExternal(href) {
  if (!/^https?:\/\//i.test(href)) return false;
  return new URL(href).origin !== globalThis.location?.origin;
}

// The page owner, from the data-owner-* attributes the site renders on <html>.
export function readOwner(doc = globalThis.document) {
  const element = doc?.documentElement;
  const { ownerName = "", ownerShortName = "", ownerSlug = "" } = element?.dataset ?? {};
  return { name: ownerName, shortName: ownerShortName, slug: ownerSlug, lang: element?.lang || undefined };
}
