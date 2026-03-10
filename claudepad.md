# Claudepad — Sentinel Demo

## Session Summaries

### 2026-03-10T11:00Z — Judgment Card SVG Grid Decorations
Replaced CSS ::before thin-line grid decorations with proper inline SVG grids matching Figma.

**Completed:**
- 4 inline SVGs (8x6 grids of 10px colored rectangles, 2px gaps)
- Saturation-computed colors: #AF816A (40%), #CC7B52 (70%), #E6753C (98%), #E8753A (100%)
- Different focal points per card (card1: col5/row3, card2: col5/row2, card3: col4/row1, card4: col6/row4)
- CSS updated: .judgment__grid-deco replaces ::before pseudo-element, opacity 0.55
- Deployed, verified via browser automation, committed & pushed

### 2026-03-10T09:30Z — Pixel-Accuracy Revision (Figma Match)
Implemented 10-point revision plan for pixel-for-pixel Figma accuracy.

**Completed:**
- Grid hover effect rewritten: Chebyshev distance stepped rings using filter:saturate() (40%/70%/98%)
- Hero section: left-aligned, bottom-left positioned (was centered)
- Nav + Footer: Added "S" icon logo mark (bordered square with S character)
- Track Record: Replaced bar chart with inline SVG line chart (4 series over 2021-2025)
- Judgment cards: Added card numbering (01-04) + inline SVG grid decorations
- Briefings: Added issue numbers (Issue #47-43) + carousel prev/next arrow buttons with JS scroll
- Leadership: Added colored left accent bars (orange/sage) + section description paragraph
- Foresight team: Added specialty roles under each name
- Footer: Restructured from 3-column to flat link row (About, Writing, Open Source, Careers)
- Visual polish: warm dark background (#1E1A17), taller research cards (120px min-height)
- Deployed & wet tested all sections + grid hover + carousel arrows

### 2026-03-10T08:00Z — Initial Build & Deploy
Built the full Sentinel landing page from Figma design. Greenfield project — plain HTML/CSS/JS, no build step.

**Completed:**
- All 11 sections: Nav, Hero (interactive grid), Press Logos, Research Focus, Track Record, Judgment, Briefings, Leadership, Foresight, Newsletter, Footer
- Interactive grid hover effect (grid-effect.js) — cells near cursor become transparent, revealing dark background
- Responsive CSS (1024px tablet, 768px mobile breakpoints)
- Hamburger menu toggle
- Compared against Figma and corrected copy, layout, card styles to match
- Wet test: grid hover, CTA click-through, smooth scroll, all sections
- Hard wet test: rapid mouse movement, edge cases
- Deployed to sentinel.discordwell.com via Caddy + rsync to ovh2

**Key decisions:**
- 48px grid cells desktop, 36px mobile, 2px gap between cells
- CSS transition 120ms ease-out on filter:saturate() for smooth grid effect
- Dirty tracking in JS — only ~50 DOM writes/frame vs full grid
- DM Mono + DM Serif Display fonts from Google Fonts

## Key Findings

- DNS wildcard for *.discordwell.com already pointed to ovh2, no manual DNS needed
- Caddy config at /etc/caddy/sites/sentinel.discordwell.com, files at /opt/sentinel/site/
- Browser automation resize_window doesn't reliably change the viewport in tab groups
