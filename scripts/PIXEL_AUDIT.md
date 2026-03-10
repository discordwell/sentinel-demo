# Pixel Audit

Use [pixel_audit.py](/Users/discordwell/Projects/sentinel-demo/scripts/pixel_audit.py) to make the Figma-to-browser workflow measurable instead of visual guesswork.

## What it does

1. Pulls a Figma reference image.
2. If `FIGMA_TOKEN` is set, also fetches exact node JSON and flattens element geometry, fills, strokes, and typography into `figma-elements.json`.
3. Captures the target page with Playwright + Chrome, disables motion, waits for fonts, and writes `page-elements.json` with computed layout/style data for the selectors in [pixel_audit_targets.json](/Users/discordwell/Projects/sentinel-demo/scripts/pixel_audit_targets.json).
4. Produces `diff.png` plus `report.json` with mismatch metrics.
5. Writes per-target screenshots into `.pixel-audit/targets/`.
6. In token-backed mode, also writes `element-report.json` with geometry, typography, and color comparisons.

## Exact Mode

This is the mode to use for true pixel-accuracy. It requires a Figma API token and a URL that points at the final frame node.

```bash
FIGMA_TOKEN=... python3 scripts/pixel_audit.py \
  --figma-url 'https://www.figma.com/design/uNNC8cutz6O2g7UhvwZLk3/Sentinel-Landing-Page--SHARED---Copy-?node-id=0-1&p=f' \
  --page-url 'http://127.0.0.1:8050/' \
  --viewport 1440x5200 \
  --full-page \
  --max-mismatch-ratio 0.01
```

Artifacts land in `.pixel-audit/`:

- `figma-reference.png`
- `figma-nodes-raw.json`
- `figma-elements.json`
- `page-capture.png`
- `page-elements.json`
- `.pixel-audit/targets/*.png`
- `diff.png`
- `element-report.json`
- `report.json`

`page-elements.json` is the main bridge between design and implementation. It captures the rendered size, position, text, and computed styles for the named selectors in [pixel_audit_targets.json](/Users/discordwell/Projects/sentinel-demo/scripts/pixel_audit_targets.json), so the audit is not limited to whole-frame screenshots.

## Public Fallback

If you do not have `FIGMA_TOKEN`, the script falls back to the public oEmbed thumbnail. That is useful for rough alignment, but not for exact element extraction.

```bash
python3 scripts/pixel_audit.py \
  --figma-url 'https://www.figma.com/design/uNNC8cutz6O2g7UhvwZLk3/Sentinel-Landing-Page--SHARED---Copy-?node-id=0-1&p=f' \
  --page-url 'http://127.0.0.1:8050/' \
  --viewport 1440x900 \
  --reference-crop 0,0,210,240 \
  --page-crop 0,0,210,240
```

`--reference-crop` is `x,y,width,height` inside the public thumbnail and is only needed in thumbnail mode.
`--page-crop` lets you crop the captured page to the same region before diffing.

## Limits

Without `FIGMA_TOKEN`, Figma only exposes thumbnail-level reference imagery in this environment. That means the script can still capture the live DOM precisely, but it cannot fetch authoritative node geometry/colors from Figma until a token or an exact frame export is available.
