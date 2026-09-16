<!-- Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4 · studied: yes · DNA-source: url -->
# Design — Agent CV

Locked design system for John Viklund's CV. `tokens.css` is canonical; `npm run sync:data` publishes its identical copy to `public/tokens.css`. Amend this system intentionally.

## System
- Genre: modern-minimal, with editorial content and a technical tone.
- Theme: Graphite & sea glass. Warm graphite surfaces, warm ivory text, muted sea-glass green accents, and heavy upright sans display.
- Homepage: Workbench adapted to a working chat, with a large left-aligned introduction and a bordered interaction area. Stack in reading order on narrow screens.
- Content pages: Long Document for CV, about and privacy; ruled lists for projects and experience. Preserve existing routes, copy and controllers.
- Navigation: compact N1b with existing destinations and a CSS disclosure on mobile. Footer: Ft2 inline credits and links, wrapping between complete links.
- Audience: recruiters, hiring managers and technical peers. Primary action: ask a grounded question about John's work.

## Provenance
Studied https://herdr.dev/ on 16 September 2026. John selected this public reference for his own CV brand by asking to lock its DNA and update the CV site. This is structural inspiration, not a reproduction of Herdr's identity, copy, logo or terminal demonstration.

The source declares Archivo, Inter and JetBrains Mono. The initial source palette used #17171a, #eae8ee and #cba6f7. On 16 September 2026, John requested a distinct colour identity. Agent CV now uses its own warm graphite (#20231f), ivory (#f0efe5) and sea glass (#9ccfbd) palette, converted to OKLCH below. The typography and layout remain locked. Layout rhythm was not verified by the URL-only study. Agent CV's layout must be verified in a browser separately.

## Typography and spacing
Archivo 700–900 for upright headings; Inter 400–700 for prose and controls; JetBrains Mono 400–500 for utility labels and code. Self-host Latin fonts and retain their OFL licenses. Use system fallbacks for other scripts. Display tracking is -0.055em, with a 0.98 line height; prose is 1.7. Use the named four-point spacing scale below.

## CTA voice and states
Sea-glass green fill with graphite text for the send action. Secondary links use an underline or a thin border. Corners are 2px. Use verb-first labels, at least 44px touch targets, and an immediate visible focus ring. Keep disabled/loading, error and feedback states distinguishable through text as well as colour. Preserve native form validation and existing live regions.

## Motion stance
No entrance, scroll, hover-scale or perpetual decorative animation. Streaming may retain its functional cursor. Reduced motion disables it. Success stays inline; no celebratory toast.

## Notes
No fabricated metrics, terminal chrome, numbered non-sequential section labels, gradient hero, oversized brand watermark or copied artwork. Keep factual claims and privacy disclosures intact. Long-form text must remain readable in dark mode. No client-side third-party font requests. At 320, 375, 414 and 768px, verify navigation, chat, comparison and document pages for overflow, focus and readable controls.

## Exports
### tokens.css
```css
/* Hallmark · theme: graphite-sea-glass · structural reference: https://herdr.dev/ · canonical tokens */
:root {
  --color-paper: oklch(25.154% 0.00861 137.822);
  --color-paper-2: oklch(29.041% 0.01139 145.274);
  --color-paper-3: oklch(33.162% 0.01540 145.217);
  --color-canvas: oklch(22.107% 0.00833 153.220);
  --color-ink: oklch(95.016% 0.01331 102.019);
  --color-ink-2: oklch(87.244% 0.01810 120.722);
  --color-muted: oklch(77.733% 0.02126 138.443);
  --color-rule: oklch(40.118% 0.01850 151.293);
  --color-rule-2: oklch(63.813% 0.02505 147.289);
  --color-accent: oklch(81.367% 0.05893 171.080);
  --color-accent-hover: oklch(88.151% 0.04896 170.020);
  --color-accent-ink: oklch(25.154% 0.00861 137.822);
  --color-focus: oklch(81.367% 0.05893 171.080);
  --color-success: oklch(84.870% 0.09143 127.176);
  --color-warning: oklch(83.148% 0.08220 81.564);
  --color-error: oklch(78.234% 0.07787 23.942);
  --font-display: "Archivo", "Arial Black", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --space-3xs: .25rem;
  --space-2xs: .5rem;
  --space-xs: .75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4rem;
  --space-3xl: 6rem;
  --space-4xl: 8rem;
  --text-xs: .75rem;
  --text-sm: .875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-display: clamp(3.25rem, 6.2vw, 6rem);
  --text-page: clamp(2.75rem, 5.5vw, 5rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 240ms;
  --rule-fine: 1px;
  --radius-card: 2px;
  --radius-input: 2px;
  --radius-button: 2px;
}
```

### Tailwind v4
```css
@theme {
  --color-paper: oklch(25.154% 0.00861 137.822);
  --color-paper-2: oklch(29.041% 0.01139 145.274);
  --color-paper-3: oklch(33.162% 0.01540 145.217);
  --color-canvas: oklch(22.107% 0.00833 153.220);
  --color-ink: oklch(95.016% 0.01331 102.019);
  --color-ink-2: oklch(87.244% 0.01810 120.722);
  --color-muted: oklch(77.733% 0.02126 138.443);
  --color-rule: oklch(40.118% 0.01850 151.293);
  --color-rule-2: oklch(63.813% 0.02505 147.289);
  --color-accent: oklch(81.367% 0.05893 171.080);
  --color-accent-hover: oklch(88.151% 0.04896 170.020);
  --color-accent-ink: oklch(25.154% 0.00861 137.822);
  --color-focus: oklch(81.367% 0.05893 171.080);
  --color-success: oklch(84.870% 0.09143 127.176);
  --color-warning: oklch(83.148% 0.08220 81.564);
  --color-error: oklch(78.234% 0.07787 23.942);
  --font-display: "Archivo", "Arial Black", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --spacing-3xs: .25rem;
  --spacing-2xs: .5rem;
  --spacing-xs: .75rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4rem;
  --spacing-3xl: 6rem;
  --spacing-4xl: 8rem;
  --text-xs: .75rem;
  --text-sm: .875rem;
  --text-base: 1rem;
  --text-md: 1.125rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5625rem;
  --text-2xl: 1.953rem;
  --text-3xl: 2.441rem;
  --text-display: clamp(3.25rem, 6.2vw, 6rem);
  --text-page: clamp(2.75rem, 5.5vw, 5rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-fast: 120ms;
  --dur-base: 180ms;
  --dur-slow: 240ms;
  --rule-fine: 1px;
  --radius-card: 2px;
  --radius-input: 2px;
  --radius-button: 2px;
}
```

### DTCG tokens.json
```json
{
  "color-paper": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.25154, 0.00861, 137.822], "alpha": 1}},
  "color-paper-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.29041, 0.01139, 145.274], "alpha": 1}},
  "color-paper-3": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.33162, 0.0154, 145.217], "alpha": 1}},
  "color-canvas": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.22107, 0.00833, 153.22], "alpha": 1}},
  "color-ink": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.95016, 0.01331, 102.019], "alpha": 1}},
  "color-ink-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.87244, 0.0181, 120.722], "alpha": 1}},
  "color-muted": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.77733, 0.02126, 138.443], "alpha": 1}},
  "color-rule": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.40118, 0.0185, 151.293], "alpha": 1}},
  "color-rule-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.63813, 0.02505, 147.289], "alpha": 1}},
  "color-accent": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.81367, 0.05893, 171.08], "alpha": 1}},
  "color-accent-hover": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.88151, 0.04896, 170.02], "alpha": 1}},
  "color-accent-ink": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.25154, 0.00861, 137.822], "alpha": 1}},
  "color-focus": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.81367, 0.05893, 171.08], "alpha": 1}},
  "color-success": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.8487, 0.09143, 127.176], "alpha": 1}},
  "color-warning": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.83148, 0.0822, 81.564], "alpha": 1}},
  "color-error": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.78234, 0.07787, 23.942], "alpha": 1}},
  "font-display": {"$type": "fontFamily", "$value": ["Archivo", "Arial Black", "system-ui", "sans-serif"]},
  "font-body": {"$type": "fontFamily", "$value": ["Inter", "system-ui", "sans-serif"]},
  "font-mono": {"$type": "fontFamily", "$value": ["JetBrains Mono", "ui-monospace", "monospace"]},
  "space-3xs": {"$type": "dimension", "$value": {"value": 0.25, "unit": "rem"}},
  "space-2xs": {"$type": "dimension", "$value": {"value": 0.5, "unit": "rem"}},
  "space-xs": {"$type": "dimension", "$value": {"value": 0.75, "unit": "rem"}},
  "space-sm": {"$type": "dimension", "$value": {"value": 1.0, "unit": "rem"}},
  "space-md": {"$type": "dimension", "$value": {"value": 1.5, "unit": "rem"}},
  "space-lg": {"$type": "dimension", "$value": {"value": 2.0, "unit": "rem"}},
  "space-xl": {"$type": "dimension", "$value": {"value": 3.0, "unit": "rem"}},
  "space-2xl": {"$type": "dimension", "$value": {"value": 4.0, "unit": "rem"}},
  "space-3xl": {"$type": "dimension", "$value": {"value": 6.0, "unit": "rem"}},
  "space-4xl": {"$type": "dimension", "$value": {"value": 8.0, "unit": "rem"}},
  "text-xs": {"$type": "dimension", "$value": {"value": 0.75, "unit": "rem"}},
  "text-sm": {"$type": "dimension", "$value": {"value": 0.875, "unit": "rem"}},
  "text-base": {"$type": "dimension", "$value": {"value": 1.0, "unit": "rem"}},
  "text-md": {"$type": "dimension", "$value": {"value": 1.125, "unit": "rem"}},
  "text-lg": {"$type": "dimension", "$value": {"value": 1.25, "unit": "rem"}},
  "text-xl": {"$type": "dimension", "$value": {"value": 1.5625, "unit": "rem"}},
  "text-2xl": {"$type": "dimension", "$value": {"value": 1.953, "unit": "rem"}},
  "text-3xl": {"$type": "dimension", "$value": {"value": 2.441, "unit": "rem"}},
  "ease-out": {"$type": "cubicBezier", "$value": [0.16, 1.0, 0.3, 1.0]},
  "ease-in": {"$type": "cubicBezier", "$value": [0.7, 0.0, 0.84, 0.0]},
  "ease-in-out": {"$type": "cubicBezier", "$value": [0.65, 0.0, 0.35, 1.0]},
  "dur-fast": {"$type": "duration", "$value": {"value": 120, "unit": "ms"}},
  "dur-base": {"$type": "duration", "$value": {"value": 180, "unit": "ms"}},
  "dur-slow": {"$type": "duration", "$value": {"value": 240, "unit": "ms"}},
  "rule-fine": {"$type": "dimension", "$value": {"value": 1.0, "unit": "px"}},
  "radius-card": {"$type": "dimension", "$value": {"value": 2.0, "unit": "px"}},
  "radius-input": {"$type": "dimension", "$value": {"value": 2.0, "unit": "px"}},
  "radius-button": {"$type": "dimension", "$value": {"value": 2.0, "unit": "px"}}
}
```
Responsive clamp sizes stay in CSS.

### shadcn/ui CSS variables
```css
:root {
  --background: var(--color-paper);
  --foreground: var(--color-ink);
  --card: var(--color-paper-2);
  --card-foreground: var(--color-ink);
  --popover: var(--color-paper-2);
  --popover-foreground: var(--color-ink);
  --primary: var(--color-accent);
  --primary-foreground: var(--color-accent-ink);
  --secondary: var(--color-paper-3);
  --secondary-foreground: var(--color-ink-2);
  --muted: var(--color-paper-3);
  --muted-foreground: var(--color-muted);
  --accent: var(--color-accent);
  --accent-foreground: var(--color-accent-ink);
  --destructive: var(--color-error);
  --border: var(--color-rule);
  --input: var(--color-rule-2);
  --ring: var(--color-focus);
  --radius: var(--radius-card);
}
```
These aliases consume `tokens.css`; retain the `oklch()` wrapper with current CSS-variable consumers.
