T2 verification · engine d11fca9 · writer Opus 5.5

- John print HTML parity: buildCvPrintHtml(data/cv.md) before (wrangler email) and after (owner.json) both sha256 f762b6b25c683cf8af7fc4a8e2d4f4c8075a3b4191a9b510175f6f4f82893ed6.
- John PDF: `npm run build:site && npm run build:cv-pdf` → build/site/john-viklund-cv.pdf, 2 pages, 79 KB; `pdftotext -layout` output identical to the pre-change PDF (cmp exit 0); Title "John Viklund — CV"; pdffonts: 3 embedded fonts, none Type 3.
- `AGENT_CV_CHROMIUM_TESTS=1 node --test test/cv-pdf.test.mjs`: 7 passed, 0 failed (pre: 4). Real PDFs for the selected owner and Ada's fictional CV: ada-example-cv.pdf, 1–2 pages, pdftotext contains "Ada Example" and no John identity, no Type 3 fonts, no local paths; home page link equals the built filename.
- Red: the new header/footer/null-email cases and the updated John case fail against HEAD~ scripts/cv-pdf.mjs (3 failed).
- Mutation: `email && link(mailto…)` → `link(mailto…)` → null-email test red; restored.
- `npm run check`: 257 tests, 254 passed, 3 skipped (opt-in Chromium), 0 failed; static checks pass for 10 pages.
