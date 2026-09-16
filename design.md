<!-- Hallmark · pre-emit critique: P4 H4 E4 S5 R5 V4 · studied: yes · DNA-source: url -->
# Design — Agent CV

Locked design system for John Viklund's CV. `tokens.css` is canonical; `npm run sync:data` publishes its identical copy to `public/tokens.css`. Amend this system intentionally.

## System
- Genre: modern-minimal, with editorial content and a technical tone.
- Theme: studied-DNA. Dark charcoal, lavender accents, heavy upright sans display.
- Homepage: Workbench adapted to a working chat, with a large left-aligned introduction and a bordered interaction area. Stack in reading order on narrow screens.
- Content pages: Long Document for CV, about and privacy; ruled lists for projects and experience. Preserve existing routes, copy and controllers.
- Navigation: compact N1b with existing destinations and a CSS disclosure on mobile. Footer: Ft2 inline credits and links, wrapping between complete links.
- Audience: recruiters, hiring managers and technical peers. Primary action: ask a grounded question about John's work.

## Provenance
Studied https://herdr.dev/ on 16 September 2026. John selected this public reference for his own CV brand by asking to lock its DNA and update the CV site. This is structural inspiration, not a reproduction of Herdr's identity, copy, logo or terminal demonstration.

The source declares Archivo, Inter and JetBrains Mono. Source colours are converted from sRGB hex to OKLCH below. Its default background is #17171a, text #eae8ee and accent #cba6f7. Layout rhythm was not verified by the URL-only study. Agent CV's layout must be verified in a browser separately.

## Typography and spacing
Archivo 700–900 for upright headings; Inter 400–700 for prose and controls; JetBrains Mono 400–500 for utility labels and code. Self-host Latin fonts and retain their OFL licenses. Use system fallbacks for other scripts. Display tracking is -0.055em, with a 0.98 line height; prose is 1.7. Use the named four-point spacing scale below.

## CTA voice and states
Lavender fill with dark text for the send action. Secondary links use an underline or a thin border. Corners are 2px. Use verb-first labels, at least 44px touch targets, and an immediate visible focus ring. Keep disabled/loading, error and feedback states distinguishable through text as well as colour. Preserve native form validation and existing live regions.

## Motion stance
No entrance, scroll, hover-scale or perpetual decorative animation. Streaming may retain its functional cursor. Reduced motion disables it. Success stays inline; no celebratory toast.

## Notes
No fabricated metrics, terminal chrome, numbered non-sequential section labels, gradient hero, oversized brand watermark or copied artwork. Keep factual claims and privacy disclosures intact. Long-form text must remain readable in dark mode. No client-side third-party font requests. At 320, 375, 414 and 768px, verify navigation, chat, comparison and document pages for overflow, focus and readable controls.

## Exports
### tokens.css
```css
/* Hallmark · theme: studied-DNA · source: https://herdr.dev/ · canonical tokens */
:root {
  --color-paper: oklch(20.593% 0.00589 285.871);
  --color-paper-2: oklch(23.672% 0.00759 285.806);
  --color-paper-3: oklch(27.067% 0.00918 285.770);
  --color-canvas: oklch(18.356% 0.00607 285.787);
  --color-ink: oklch(93.427% 0.00829 301.350);
  --color-ink-2: oklch(84.778% 0.00829 293.883);
  --color-muted: oklch(75.696% 0.00994 292.732);
  --color-rule: oklch(33.213% 0.01397 285.614);
  --color-rule-2: oklch(56.786% 0.01688 294.200);
  --color-accent: oklch(78.715% 0.11867 304.769);
  --color-accent-hover: oklch(85.338% 0.08091 305.053);
  --color-accent-ink: oklch(20.593% 0.00589 285.871);
  --color-focus: oklch(78.715% 0.11867 304.769);
  --color-success: oklch(84.988% 0.09995 158.098);
  --color-warning: oklch(83.652% 0.09509 84.896);
  --color-error: oklch(80.253% 0.09192 9.946);
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
  --color-paper: oklch(20.593% 0.00589 285.871);
  --color-paper-2: oklch(23.672% 0.00759 285.806);
  --color-paper-3: oklch(27.067% 0.00918 285.770);
  --color-canvas: oklch(18.356% 0.00607 285.787);
  --color-ink: oklch(93.427% 0.00829 301.350);
  --color-ink-2: oklch(84.778% 0.00829 293.883);
  --color-muted: oklch(75.696% 0.00994 292.732);
  --color-rule: oklch(33.213% 0.01397 285.614);
  --color-rule-2: oklch(56.786% 0.01688 294.200);
  --color-accent: oklch(78.715% 0.11867 304.769);
  --color-accent-hover: oklch(85.338% 0.08091 305.053);
  --color-accent-ink: oklch(20.593% 0.00589 285.871);
  --color-focus: oklch(78.715% 0.11867 304.769);
  --color-success: oklch(84.988% 0.09995 158.098);
  --color-warning: oklch(83.652% 0.09509 84.896);
  --color-error: oklch(80.253% 0.09192 9.946);
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
  "color-paper": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.20593, 0.00589, 285.871], "alpha": 1}},
  "color-paper-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.23672, 0.00759, 285.806], "alpha": 1}},
  "color-paper-3": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.27067, 0.00918, 285.77], "alpha": 1}},
  "color-canvas": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.18356000000000003, 0.00607, 285.787], "alpha": 1}},
  "color-ink": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.93427, 0.00829, 301.35], "alpha": 1}},
  "color-ink-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.8477800000000001, 0.00829, 293.883], "alpha": 1}},
  "color-muted": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.75696, 0.00994, 292.732], "alpha": 1}},
  "color-rule": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.33213000000000004, 0.01397, 285.614], "alpha": 1}},
  "color-rule-2": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.56786, 0.01688, 294.2], "alpha": 1}},
  "color-accent": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.78715, 0.11867, 304.769], "alpha": 1}},
  "color-accent-hover": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.8533799999999999, 0.08091, 305.053], "alpha": 1}},
  "color-accent-ink": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.20593, 0.00589, 285.871], "alpha": 1}},
  "color-focus": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.78715, 0.11867, 304.769], "alpha": 1}},
  "color-success": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.84988, 0.09995, 158.098], "alpha": 1}},
  "color-warning": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.83652, 0.09509, 84.896], "alpha": 1}},
  "color-error": {"$type": "color", "$value": {"colorSpace": "oklch", "components": [0.80253, 0.09192, 9.946], "alpha": 1}},
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
