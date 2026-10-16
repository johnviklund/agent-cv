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
