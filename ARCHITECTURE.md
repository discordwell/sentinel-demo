# Sentinel Landing Page — Architecture

## Overview
Single-page static marketing site for Sentinel. No build tools, no framework — plain HTML/CSS/JS served as static files.

## Page Structure

```
index.html
├── <nav>            — Fixed dark navbar, logo + hamburger
├── <section#hero>   — Orange grid with interactive transparency effect
│   ├── .hero__grid  — Absolute overlay of grid cells (pointer-events: none)
│   └── .hero__content — Headline + CTA (z-index above grid)
├── <section#press>  — Press logo bar
├── <section#research> — 6 colored category cards (3x2 → 2col → 1col)
├── <section#track-record> — CSS-only bar chart
├── <section#judgment> — 4 feature cards (2x2)
├── <section#briefings> — Horizontal-scroll card carousel
├── <section#leadership> — Team photos + bios
├── <section#foresight> — Name row
├── <section#newsletter> — Email signup CTA
└── <footer>         — Logo + links
```

## Interactive Grid Effect (grid-effect.js)

### Algorithm
1. On load, measure `#hero` and generate a grid of `<div class="grid-cell">` elements
2. Pre-compute cell center coordinates in a flat array
3. On `mousemove` over `#hero`, use `requestAnimationFrame` to:
   - Calculate distance from cursor to each cell center
   - Set opacity proportional to distance (closer = more transparent)
   - **Dirty tracking**: only touch DOM for cells entering/leaving active radius
   - **Early exit**: skip sqrt if dx or dy exceeds radius
4. On `mouseleave`, reset all cells to full opacity
5. Touch support: `touchmove` maps to same logic, `touchend` resets

### Performance Budget
- ~50 DOM writes per frame (dirty set), not ~500 (full grid)
- No layout thrash — only opacity changes (composite-only)
- `will-change: opacity` on grid cells

## CSS Architecture
- Custom properties for all design tokens (colors, spacing, fonts)
- Section-by-section organization
- Responsive: 1024px (tablet), 768px (mobile)
- No utility classes — semantic class names

## Deployment
- Static file hosting
- No build step required
