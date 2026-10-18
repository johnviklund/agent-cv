// Escapes text for HTML text and double-quoted attributes.
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Escapes a single-quoted attribute, such as the analytics beacon's JSON, leaving double quotes readable.
export function escapeSingleQuoted(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&#39;");
}

// JSON for an inline <script>: no value can close the element or break a JavaScript line.
export function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const PROFILE_LINKS = [["linkedin", "LinkedIn"], ["github", "GitHub"], ["x", "X"]];

// The owner's configured profile links, in display order.
export function profileLinks(owner) {
  return PROFILE_LINKS
    .filter(([key]) => owner.links?.[key])
    .map(([key, label]) => ({ key, label, href: owner.links[key] }));
}
