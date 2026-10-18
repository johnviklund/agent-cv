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

// "Oct 2026" from site.json updatedAt.
export function updatedMonth(site) {
  return new Date(`${site.updatedAt}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

// The owner's X handle without the @, or null.
export function xHandle(owner) {
  return owner.links?.x ? new URL(owner.links.x).pathname.split("/").filter(Boolean)[0] : null;
}

export function wordmark(owner) {
  const { full } = owner.name;
  return `<a class="wordmark" href="/" aria-label="${escapeHtml(full)}, home">${escapeHtml(full.toLocaleUpperCase(owner.site.lang))}</a>`;
}

// The analytics beacon line, or nothing when no token is configured.
export function beacon(owner) {
  const token = owner.analytics?.cloudflareBeaconToken;
  return token
    ? `  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${escapeSingleQuoted(`{"token": ${JSON.stringify(token)}}`)}'></script>\n`
    : "";
}

// A link to the owner's public source repository, or nothing.
export function sourceLink(owner, label, rel = "noopener noreferrer") {
  const repository = owner.site.sourceRepository;
  return repository ? `<a href="${escapeHtml(repository)}" rel="${rel}" target="_blank">${label}</a>` : "";
}

const SAFE_HREF = /^(https:\/\/[^/\s]|\/(?!\/)|#)\S*$/;

// Plain text with **bold**, `code` and [label](href); everything else is escaped. Links to the owner's
// own profiles carry rel="me", and external links open in a new tab.
export function inline(text, owner, field) {
  const profiles = new Set(profileLinks(owner).map(({ href }) => escapeHtml(href)));
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      if (!SAFE_HREF.test(href)) throw new Error(`site.json: ${field} has an unsafe link ${href}`);
      if (!href.startsWith("https://")) return `<a href="${href}">${label}</a>`;
      return `<a href="${href}" rel="${profiles.has(href) ? "me " : ""}noopener noreferrer" target="_blank">${label}</a>`;
    });
}

const BLOCKS = { p: "p", h2: "h2", h3: "h3", quote: "blockquote" };

// One line per block: p, h2, h3, quote, kicker (a CV meta line) or list.
export function blocks(list, indent, owner, field) {
  return list.map((block, index) => {
    const [kind, ...extra] = Object.keys(block);
    const at = `${field}[${index}]`;
    if (extra.length) throw new Error(`site.json: ${at} must have exactly one block type`);
    const value = block[kind];
    if (kind === "list") return `${indent}<ul>${value.map((item, i) => `<li>${inline(item, owner, `${at}.list[${i}]`)}</li>`).join("")}</ul>`;
    if (kind === "kicker") return `${indent}<p class="cv-kicker">${inline(value, owner, `${at}.kicker`)}</p>`;
    return `${indent}<${BLOCKS[kind]}>${inline(value, owner, `${at}.${kind}`)}</${BLOCKS[kind]}>`;
  }).join("\n");
}
