// Cloudflare static-asset headers; the CSP lists the hash of every inline script the pages carry.
export function renderHeaders({ owner, scriptHashes }) {
  const hashes = scriptHashes.map((hash) => `'${hash}'`).join(" ");
  const pdf = `${owner.slug}-cv.pdf`;
  return `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com ${hashes}; style-src 'self'; img-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), tools=(self)
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY

/*.md
  Access-Control-Allow-Origin: *
  Content-Type: text/markdown; charset=utf-8

/llms.txt
  Access-Control-Allow-Origin: *

/evidence.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

/sitemap.xml
  Content-Type: application/xml; charset=utf-8

/${pdf}
  Content-Type: application/pdf
  Content-Disposition: inline; filename="${pdf}"
  Cache-Control: public, max-age=0, must-revalidate
`;
}
