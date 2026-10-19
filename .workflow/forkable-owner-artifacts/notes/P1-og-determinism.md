P1 — Is the OG card render byte-stable, so a golden diff can cover it?
Variants: none. Ran `node scripts/build-og-image.mjs` once on a clean tree (chromium 
from /usr/bin/chromium) and hashed site/assets/og-image.png before and after.
Evidence: both runs sha256 23e27186…45e0a3 (committed file unchanged, `git status` clean).
Result: yes, byte-stable. A golden check can compare the PNG bytes. The PDF is not byte-stable
(Chromium stamps creation dates), so it is checked by page count, text and filename.
