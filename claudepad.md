# Claudepad — Sentinel Demo

## Session Summaries

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
- CSS transition 120ms ease-out on opacity for smooth grid effect
- Dirty tracking in JS — only ~50 DOM writes/frame vs full grid
- DM Mono + DM Serif Display fonts from Google Fonts

## Key Findings

- DNS wildcard for *.discordwell.com already pointed to ovh2, no manual DNS needed
- Caddy config at /etc/caddy/sites/sentinel.discordwell.com, files at /opt/sentinel/site/
- Browser automation resize_window doesn't reliably change the viewport in tab groups
