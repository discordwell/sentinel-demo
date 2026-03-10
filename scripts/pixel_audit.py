#!/usr/bin/env python3

import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFAULT_OUT = ".pixel-audit"
DEFAULT_DIFF_THRESHOLD = 8
DEFAULT_GEOMETRY_TOLERANCE = 1.5
DEFAULT_COLOR_TOLERANCE = 8
DEFAULT_WAIT_MS = 300
DEFAULT_HEADERS = {"User-Agent": "Mozilla/5.0"}
CAPTURE_STYLE_RESET = """
*, *::before, *::after {
  animation-delay: 0s !important;
  animation-duration: 0s !important;
  animation-iteration-count: 1 !important;
  caret-color: transparent !important;
  scroll-behavior: auto !important;
  transition-delay: 0s !important;
  transition-duration: 0s !important;
}
"""
CAPTURE_MANIFEST_JS = """
(targets) => {
  const round = (value) => Math.round(value * 100) / 100;
  const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
  const pickStyles = (styles) => ({
    color: styles.color,
    backgroundColor: styles.backgroundColor,
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    fontWeight: styles.fontWeight,
    lineHeight: styles.lineHeight,
    letterSpacing: styles.letterSpacing,
    textTransform: styles.textTransform,
    textAlign: styles.textAlign,
    borderRadius: styles.borderRadius,
    opacity: styles.opacity,
    gap: styles.gap,
    clipPath: styles.clipPath,
    boxShadow: styles.boxShadow,
    paddingTop: styles.paddingTop,
    paddingRight: styles.paddingRight,
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft,
    marginTop: styles.marginTop,
    marginRight: styles.marginRight,
    marginBottom: styles.marginBottom,
    marginLeft: styles.marginLeft,
    borderTopWidth: styles.borderTopWidth,
    borderTopColor: styles.borderTopColor,
    borderTopStyle: styles.borderTopStyle,
    borderRightWidth: styles.borderRightWidth,
    borderRightColor: styles.borderRightColor,
    borderRightStyle: styles.borderRightStyle,
    borderBottomWidth: styles.borderBottomWidth,
    borderBottomColor: styles.borderBottomColor,
    borderBottomStyle: styles.borderBottomStyle,
    borderLeftWidth: styles.borderLeftWidth,
    borderLeftColor: styles.borderLeftColor,
    borderLeftStyle: styles.borderLeftStyle
  });

  const serializeNode = (node, index) => {
    const rect = node.getBoundingClientRect();
    const styles = getComputedStyle(node);
    return {
      index,
      tag: node.tagName.toLowerCase(),
      id: node.id || null,
      classes: Array.from(node.classList),
      text: clean(node.innerText || node.textContent || ''),
      rect: {
        x: round(rect.left + window.scrollX),
        y: round(rect.top + window.scrollY),
        width: round(rect.width),
        height: round(rect.height)
      },
      computed: pickStyles(styles)
    };
  };

  return {
    page: {
      url: location.href,
      title: document.title,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      scrollSize: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      },
      devicePixelRatio: window.devicePixelRatio
    },
    targets: targets.map((target) => {
      const nodes = Array.from(document.querySelectorAll(target.selector));
      return {
        name: target.name,
        selector: target.selector,
        figmaName: target.figmaName || null,
        count: nodes.length,
        elements: nodes.map(serializeNode)
      };
    })
  };
}
"""


def default_audit_config():
    candidate = Path(__file__).with_name("pixel_audit_targets.json")
    return str(candidate) if candidate.exists() else ""


def parse_args():
    parser = argparse.ArgumentParser(
        description="Fetch Figma reference data, capture a page snapshot, and emit pixel + layout audit artifacts."
    )
    parser.add_argument("--figma-url", required=True, help="Public Figma design/file URL with node-id.")
    parser.add_argument("--page-url", required=True, help="Local or production URL to capture.")
    parser.add_argument("--out", default=DEFAULT_OUT, help="Directory for audit artifacts.")
    parser.add_argument("--figma-token", default=os.environ.get("FIGMA_TOKEN", ""), help="Optional Figma API token.")
    parser.add_argument("--chrome", default=DEFAULT_CHROME, help="Path to Chrome/Chromium executable.")
    parser.add_argument("--viewport", default="1440x900", help="Viewport for capture, e.g. 1440x900.")
    parser.add_argument(
        "--reference-crop",
        default="",
        help="Optional crop for public-thumbnail fallback as x,y,width,height.",
    )
    parser.add_argument(
        "--page-crop",
        default="",
        help="Optional crop for the captured page as x,y,width,height before diffing.",
    )
    parser.add_argument(
        "--audit-config",
        default=default_audit_config(),
        help="Optional JSON file of named selectors to capture into page-elements.json.",
    )
    parser.add_argument(
        "--wait-ms",
        type=int,
        default=DEFAULT_WAIT_MS,
        help="Additional time to wait after page load before capture.",
    )
    parser.add_argument(
        "--full-page",
        action="store_true",
        help="Capture a full-page screenshot instead of just the viewport.",
    )
    parser.add_argument(
        "--diff-threshold",
        type=int,
        default=DEFAULT_DIFF_THRESHOLD,
        help="Per-channel threshold for counting mismatched pixels.",
    )
    parser.add_argument(
        "--geometry-tolerance",
        type=float,
        default=DEFAULT_GEOMETRY_TOLERANCE,
        help="Allowed px delta for x/y/width/height comparisons.",
    )
    parser.add_argument(
        "--color-tolerance",
        type=int,
        default=DEFAULT_COLOR_TOLERANCE,
        help="Allowed max-channel delta for comparing colors.",
    )
    parser.add_argument(
        "--max-mismatch-ratio",
        type=float,
        default=None,
        help="Optional mismatch-ratio ceiling. Exits non-zero if exceeded.",
    )
    return parser.parse_args()


def parse_figma_url(url):
    match = re.search(r"figma\.com/(?:design|file)/([^/]+)/", url)
    if not match:
        raise ValueError("Could not parse Figma file key from URL.")

    file_key = match.group(1)
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    node_id = query.get("node-id", [""])[0]

    if not node_id:
        raise ValueError("Figma URL must include a node-id query parameter.")

    api_node_id = node_id.replace("-", ":") if ":" not in node_id else node_id
    return file_key, api_node_id, node_id


def ensure_dir(path):
    path.mkdir(parents=True, exist_ok=True)


def fetch_json(url, headers=None):
    merged_headers = dict(DEFAULT_HEADERS)
    merged_headers.update(headers or {})
    request = urllib.request.Request(url, headers=merged_headers)
    with urllib.request.urlopen(request) as response:
        return json.load(response)


def download(url, target, headers=None):
    merged_headers = dict(DEFAULT_HEADERS)
    merged_headers.update(headers or {})
    request = urllib.request.Request(url, headers=merged_headers)
    with urllib.request.urlopen(request) as response:
        target.write_bytes(response.read())


def normalize_color(color):
    if not color:
        return None

    return "#%02x%02x%02x" % (
        round(color.get("r", 0) * 255),
        round(color.get("g", 0) * 255),
        round(color.get("b", 0) * 255),
    )


def normalize_paint(paint):
    entry = {
        "type": paint.get("type"),
        "visible": paint.get("visible", True),
        "opacity": paint.get("opacity", 1),
    }

    color = normalize_color(paint.get("color"))
    if color:
        entry["color"] = color

    gradient_stops = paint.get("gradientStops") or []
    if gradient_stops:
        entry["gradientStops"] = [
            {
                "position": stop.get("position"),
                "color": normalize_color(stop.get("color")),
            }
            for stop in gradient_stops
        ]

    return entry


def flatten_node(node, bucket):
    box = node.get("absoluteBoundingBox") or {}
    style = node.get("style") or {}

    entry = {
        "id": node.get("id"),
        "name": node.get("name"),
        "type": node.get("type"),
        "x": box.get("x"),
        "y": box.get("y"),
        "width": box.get("width"),
        "height": box.get("height"),
        "cornerRadius": node.get("cornerRadius"),
        "fills": [normalize_paint(paint) for paint in node.get("fills", []) if paint.get("visible", True)],
        "strokes": [normalize_paint(paint) for paint in node.get("strokes", []) if paint.get("visible", True)],
        "strokeWeight": node.get("strokeWeight"),
        "opacity": node.get("opacity", 1),
        "characters": node.get("characters"),
        "fontFamily": style.get("fontFamily"),
        "fontSize": style.get("fontSize"),
        "fontWeight": style.get("fontWeight"),
        "lineHeightPx": style.get("lineHeightPx"),
        "letterSpacing": style.get("letterSpacing"),
        "textAlignHorizontal": style.get("textAlignHorizontal"),
    }
    bucket.append(entry)

    for child in node.get("children", []):
        flatten_node(child, bucket)


def fetch_figma_reference(args, out_dir):
    file_key, node_id, raw_node_id = parse_figma_url(args.figma_url)
    metadata = {
        "fileKey": file_key,
        "nodeId": node_id,
        "rawNodeId": raw_node_id,
        "figmaUrl": args.figma_url,
        "usedToken": bool(args.figma_token),
    }

    if args.figma_token:
        headers = {"X-Figma-Token": args.figma_token}
        encoded_node = urllib.parse.quote(node_id, safe="")
        node_url = f"https://api.figma.com/v1/files/{file_key}/nodes?ids={encoded_node}&depth=8"
        nodes_payload = fetch_json(node_url, headers=headers)
        (out_dir / "figma-nodes-raw.json").write_text(json.dumps(nodes_payload, indent=2))

        node_document = nodes_payload.get("nodes", {}).get(node_id, {}).get("document")
        flattened = []
        if node_document:
            box = node_document.get("absoluteBoundingBox") or {}
            metadata["nodeBounds"] = {
                "x": box.get("x"),
                "y": box.get("y"),
                "width": box.get("width"),
                "height": box.get("height"),
            }
            flatten_node(node_document, flattened)
            (out_dir / "figma-elements.json").write_text(json.dumps(flattened, indent=2))

        image_url = (
            f"https://api.figma.com/v1/images/{file_key}"
            f"?ids={encoded_node}&format=png&scale=2&use_absolute_bounds=true"
        )
        images_payload = fetch_json(image_url, headers=headers)
        (out_dir / "figma-images-raw.json").write_text(json.dumps(images_payload, indent=2))
        direct_image = images_payload.get("images", {}).get(node_id)
        if not direct_image:
            raise RuntimeError("Figma API returned no image for the requested node.")
        reference_path = out_dir / "figma-reference.png"
        download(direct_image, reference_path)
        metadata["referenceMode"] = "api"
        metadata["referenceImage"] = str(reference_path)
        return reference_path, metadata, flattened

    oembed_url = "https://www.figma.com/api/oembed?url=" + urllib.parse.quote(args.figma_url, safe="")
    oembed = fetch_json(oembed_url)
    (out_dir / "figma-oembed.json").write_text(json.dumps(oembed, indent=2))
    thumbnail_url = oembed.get("thumbnail_url")
    if not thumbnail_url:
        raise RuntimeError("Could not resolve Figma thumbnail URL from oEmbed.")

    reference_path = out_dir / "figma-thumbnail.png"
    download(thumbnail_url, reference_path)
    metadata["referenceMode"] = "thumbnail"
    metadata["referenceImage"] = str(reference_path)

    if args.reference_crop:
        x, y, width, height = parse_crop(args.reference_crop)
        cropped = out_dir / "figma-reference.png"
        with Image.open(reference_path) as source:
            source.crop((x, y, x + width, y + height)).save(cropped)
        metadata["referenceCrop"] = {
            "x": x,
            "y": y,
            "width": width,
            "height": height,
        }
        return cropped, metadata, []

    return reference_path, metadata, []


def parse_crop(value):
    try:
        x, y, width, height = [int(part.strip()) for part in value.split(",")]
    except Exception as exc:
        raise ValueError("Crop must be x,y,width,height") from exc

    return x, y, width, height


def parse_viewport(value):
    match = re.match(r"^(\d+)x(\d+)$", value)
    if not match:
        raise ValueError("Viewport must look like 1440x900")
    return int(match.group(1)), int(match.group(2))


def load_audit_targets(path_value):
    if not path_value:
        return []

    path = Path(path_value)
    if not path.exists():
        raise FileNotFoundError(f"Audit config not found: {path}")

    payload = json.loads(path.read_text())
    if not isinstance(payload, list):
        raise ValueError("Audit config must be a JSON array.")

    targets = []
    for entry in payload:
        if not isinstance(entry, dict) or not entry.get("name") or not entry.get("selector"):
            raise ValueError("Each audit target needs name and selector.")

        targets.append(
            {
                "name": entry["name"],
                "selector": entry["selector"],
                "figmaName": entry.get("figmaName"),
            }
        )

    return targets


def sanitize_filename(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "target"


def capture_page_snapshot(args, out_dir, targets):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        raise RuntimeError("playwright is required to capture DOM/layout manifests") from exc

    width, height = parse_viewport(args.viewport)
    page_path = out_dir / "page-capture.png"
    manifest_path = out_dir / "page-elements.json"
    target_shots_dir = out_dir / "targets"
    ensure_dir(target_shots_dir)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=args.chrome)
        page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
        page.goto(args.page_url, wait_until="networkidle", timeout=60000)
        page.add_style_tag(content=CAPTURE_STYLE_RESET)
        page.evaluate("() => window.scrollTo(0, 0)")
        page.evaluate("() => document.fonts ? document.fonts.ready.then(() => true) : true")
        if args.wait_ms > 0:
            page.wait_for_timeout(args.wait_ms)

        manifest = page.evaluate(CAPTURE_MANIFEST_JS, targets)
        page.screenshot(path=str(page_path), full_page=args.full_page, animations="disabled")

        target_shots = []
        for target in targets:
            locator = page.locator(target["selector"])
            count = locator.count()
            if not count:
                target_shots.append(
                    {
                        "name": target["name"],
                        "selector": target["selector"],
                        "status": "missing",
                    }
                )
                continue

            preview_path = target_shots_dir / f"{sanitize_filename(target['name'])}.png"
            try:
                locator.first.screenshot(path=str(preview_path), animations="disabled")
            except Exception as exc:
                target_shots.append(
                    {
                        "name": target["name"],
                        "selector": target["selector"],
                        "status": "error",
                        "error": str(exc),
                    }
                )
            else:
                target_shots.append(
                    {
                        "name": target["name"],
                        "selector": target["selector"],
                        "status": "ok",
                        "path": str(preview_path),
                    }
                )

        browser.close()

    manifest["targetShots"] = target_shots
    manifest_path.write_text(json.dumps(manifest, indent=2))

    return page_path, manifest_path, manifest, {"width": width, "height": height}


def crop_image(source_path, crop_value, output_path):
    x, y, width, height = parse_crop(crop_value)
    with Image.open(source_path) as source:
        source.crop((x, y, x + width, y + height)).save(output_path)
    return output_path, {"x": x, "y": y, "width": width, "height": height}


def normalize_reference(reference, metadata):
    if metadata.get("referenceMode") != "api":
        return reference

    bounds = metadata.get("nodeBounds") or {}
    width = round(bounds.get("width") or 0)
    height = round(bounds.get("height") or 0)
    if width <= 0 or height <= 0:
        return reference

    if reference.width == width and reference.height == height:
        return reference

    return reference.resize((width, height), Image.Resampling.LANCZOS)


def diff_images(reference_path, page_path, diff_path, threshold, metadata):
    with Image.open(reference_path).convert("RGBA") as reference:
        with Image.open(page_path).convert("RGBA") as page:
            reference = normalize_reference(reference, metadata)
            compare_width = min(reference.width, page.width)
            compare_height = min(reference.height, page.height)
            reference_compare = reference.crop((0, 0, compare_width, compare_height))
            page_compare = page.crop((0, 0, compare_width, compare_height))

            diff = ImageChops.difference(reference_compare, page_compare)
            diff.save(diff_path)

            stat = ImageStat.Stat(diff)
            mean = stat.mean
            extrema = stat.extrema

            mismatched = 0
            total = compare_width * compare_height
            pixels = diff.load()
            for y in range(compare_height):
                for x in range(compare_width):
                    rgba = pixels[x, y]
                    if any(channel > threshold for channel in rgba[:3]):
                        mismatched += 1

            return {
                "referenceSize": {"width": reference.width, "height": reference.height},
                "pageSize": {"width": page.width, "height": page.height},
                "comparedSize": {"width": compare_width, "height": compare_height},
                "meanAbsoluteDiff": {
                    "r": round(mean[0], 4),
                    "g": round(mean[1], 4),
                    "b": round(mean[2], 4),
                    "a": round(mean[3], 4),
                },
                "maxDiff": {
                    "r": extrema[0][1],
                    "g": extrema[1][1],
                    "b": extrema[2][1],
                    "a": extrema[3][1],
                },
                "mismatchedPixels": mismatched,
                "mismatchRatio": round(mismatched / total, 6) if total else 0,
                "threshold": threshold,
            }


def parse_float(value):
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value)

    match = re.search(r"-?\d+(?:\.\d+)?", str(value))
    return float(match.group(0)) if match else None


def parse_color(value):
    if not value:
        return None

    text = str(value).strip().lower()
    if text in {"transparent", "none"}:
        return None

    hex_match = re.fullmatch(r"#([0-9a-f]{6})", text)
    if hex_match:
        raw = hex_match.group(1)
        return {
            "r": int(raw[0:2], 16),
            "g": int(raw[2:4], 16),
            "b": int(raw[4:6], 16),
            "a": 1,
        }

    rgb_match = re.fullmatch(r"rgba?\(([^)]+)\)", text)
    if not rgb_match:
        return None

    parts = [part.strip() for part in rgb_match.group(1).split(",")]
    if len(parts) < 3:
        return None

    alpha = float(parts[3]) if len(parts) > 3 else 1
    return {
        "r": round(float(parts[0])),
        "g": round(float(parts[1])),
        "b": round(float(parts[2])),
        "a": alpha,
    }


def color_to_css(color):
    if not color:
        return None

    if color.get("a", 1) != 1:
        return "rgba({r}, {g}, {b}, {a})".format(**color)

    return "#{r:02x}{g:02x}{b:02x}".format(**color)


def color_delta(expected, actual):
    if not expected or not actual:
        return None

    return max(
        abs(expected["r"] - actual["r"]),
        abs(expected["g"] - actual["g"]),
        abs(expected["b"] - actual["b"]),
    )


def normalize_text(value):
    return re.sub(r"\s+", " ", (value or "")).strip().lower()


def pick_figma_fill(entry):
    fills = entry.get("fills") or []
    for fill in fills:
        if fill.get("color"):
            return fill["color"]
    return None


def load_figma_elements(out_dir):
    path = out_dir / "figma-elements.json"
    if not path.exists():
        return []
    return json.loads(path.read_text())


def compare_measure(expected, actual, tolerance):
    if expected is None or actual is None:
        return {"expected": expected, "actual": actual, "delta": None, "ok": None}

    delta = round(abs(float(expected) - float(actual)), 4)
    return {
        "expected": round(float(expected), 4),
        "actual": round(float(actual), 4),
        "delta": delta,
        "ok": delta <= tolerance,
    }


def compare_color_measure(expected, actual, tolerance):
    if not expected or not actual:
        return {"expected": expected, "actual": actual, "delta": None, "ok": None}

    delta = color_delta(parse_color(expected), parse_color(actual))
    return {
        "expected": expected,
        "actual": actual,
        "delta": delta,
        "ok": delta is not None and delta <= tolerance,
    }


def choose_figma_match(target, page_element, figma_elements):
    figma_name = target.get("figmaName")
    text_key = normalize_text(page_element.get("text"))
    candidates = []

    if figma_name:
        expected_name = normalize_text(figma_name)
        candidates = [entry for entry in figma_elements if normalize_text(entry.get("name")) == expected_name]
        if not candidates:
            candidates = [entry for entry in figma_elements if expected_name in normalize_text(entry.get("name"))]

    if not candidates and text_key:
        candidates = [entry for entry in figma_elements if normalize_text(entry.get("characters")) == text_key]

    if not candidates:
        return None

    def score(entry):
        score_value = 0
        if text_key and normalize_text(entry.get("characters")) == text_key:
            score_value -= 1000
        if page_element.get("text") and entry.get("type") == "TEXT":
            score_value -= 100

        entry_width = entry.get("width") or 0
        entry_height = entry.get("height") or 0
        score_value += abs(entry_width - page_element["rect"]["width"])
        score_value += abs(entry_height - page_element["rect"]["height"])
        return score_value

    return sorted(candidates, key=score)[0]


def compare_elements(targets, page_manifest, figma_elements, geometry_tolerance, color_tolerance):
    if not targets or not page_manifest:
        return None

    page_targets = {entry["name"]: entry for entry in page_manifest.get("targets", [])}
    results = []
    failing = 0

    for target in targets:
        page_target = page_targets.get(target["name"])
        target_result = {
            "name": target["name"],
            "selector": target["selector"],
            "figmaName": target.get("figmaName"),
            "matchStatus": "unmatched",
            "ok": None,
            "metrics": {},
        }

        if not page_target or not page_target.get("elements"):
            target_result["matchStatus"] = "missing-page-target"
            target_result["ok"] = False
            failing += 1
            results.append(target_result)
            continue

        page_element = page_target["elements"][0]
        figma_match = choose_figma_match(target, page_element, figma_elements)
        if not figma_match:
            target_result["matchStatus"] = "missing-figma-match"
            target_result["ok"] = False
            failing += 1
            results.append(target_result)
            continue

        target_result["matchStatus"] = "matched"
        target_result["figmaName"] = figma_match.get("name")
        target_result["figmaId"] = figma_match.get("id")
        target_result["figmaType"] = figma_match.get("type")

        metrics = {
            "x": compare_measure(figma_match.get("x"), page_element["rect"].get("x"), geometry_tolerance),
            "y": compare_measure(figma_match.get("y"), page_element["rect"].get("y"), geometry_tolerance),
            "width": compare_measure(figma_match.get("width"), page_element["rect"].get("width"), geometry_tolerance),
            "height": compare_measure(figma_match.get("height"), page_element["rect"].get("height"), geometry_tolerance),
            "opacity": compare_measure(figma_match.get("opacity"), parse_float(page_element["computed"].get("opacity")), 0.01),
            "cornerRadius": compare_measure(figma_match.get("cornerRadius"), parse_float(page_element["computed"].get("borderRadius")), geometry_tolerance),
        }

        if figma_match.get("characters"):
            metrics["text"] = {
                "expected": figma_match.get("characters"),
                "actual": page_element.get("text"),
                "ok": normalize_text(figma_match.get("characters")) == normalize_text(page_element.get("text")),
            }
            metrics["fontFamily"] = {
                "expected": figma_match.get("fontFamily"),
                "actual": page_element["computed"].get("fontFamily"),
                "ok": figma_match.get("fontFamily", "").lower() in page_element["computed"].get("fontFamily", "").lower(),
            }
            metrics["fontSize"] = compare_measure(
                figma_match.get("fontSize"),
                parse_float(page_element["computed"].get("fontSize")),
                geometry_tolerance,
            )
            metrics["fontWeight"] = compare_measure(
                figma_match.get("fontWeight"),
                parse_float(page_element["computed"].get("fontWeight")),
                1,
            )
            metrics["lineHeight"] = compare_measure(
                figma_match.get("lineHeightPx"),
                parse_float(page_element["computed"].get("lineHeight")),
                geometry_tolerance,
            )
            metrics["letterSpacing"] = compare_measure(
                figma_match.get("letterSpacing"),
                parse_float(page_element["computed"].get("letterSpacing")),
                geometry_tolerance,
            )

        fill_color = pick_figma_fill(figma_match)
        if fill_color:
            expected_color = color_to_css(parse_color(fill_color))
            if figma_match.get("type") == "TEXT":
                metrics["textColor"] = compare_color_measure(
                    expected_color,
                    page_element["computed"].get("color"),
                    color_tolerance,
                )
            else:
                metrics["backgroundColor"] = compare_color_measure(
                    expected_color,
                    page_element["computed"].get("backgroundColor"),
                    color_tolerance,
                )

        target_ok = True
        for metric in metrics.values():
            if isinstance(metric, dict) and metric.get("ok") is False:
                target_ok = False
                break

        target_result["metrics"] = metrics
        target_result["ok"] = target_ok
        if target_ok is False:
            failing += 1
        results.append(target_result)

    summary = {
        "targetsCompared": len(results),
        "failingTargets": failing,
        "passingTargets": len(results) - failing,
        "results": results,
    }
    return summary


def maybe_fail(report, args):
    if args.max_mismatch_ratio is None:
        return

    mismatch_ratio = report.get("mismatchRatio")
    if mismatch_ratio is not None and mismatch_ratio > args.max_mismatch_ratio:
        raise RuntimeError(
            f"Mismatch ratio {mismatch_ratio} exceeded ceiling {args.max_mismatch_ratio}"
        )


def main():
    args = parse_args()
    out_dir = Path(args.out)
    ensure_dir(out_dir)

    targets = load_audit_targets(args.audit_config)
    reference_path, metadata, figma_elements = fetch_figma_reference(args, out_dir)
    page_path, manifest_path, page_manifest, capture_viewport = capture_page_snapshot(args, out_dir, targets)

    if args.page_crop:
        cropped_page_path = out_dir / "page-capture-cropped.png"
        cropped_page_path, crop_meta = crop_image(page_path, args.page_crop, cropped_page_path)
        page_path = cropped_page_path
        metadata["pageCrop"] = crop_meta

    report = diff_images(reference_path, page_path, out_dir / "diff.png", args.diff_threshold, metadata)
    report["metadata"] = metadata
    report["captureViewport"] = capture_viewport
    report["pageManifest"] = str(manifest_path)
    report["auditTargets"] = len(targets)

    if not figma_elements:
        figma_elements = load_figma_elements(out_dir)

    if figma_elements:
        element_report = compare_elements(
            targets,
            page_manifest,
            figma_elements,
            args.geometry_tolerance,
            args.color_tolerance,
        )
        if element_report:
            element_report_path = out_dir / "element-report.json"
            element_report_path.write_text(json.dumps(element_report, indent=2))
            report["elementReport"] = str(element_report_path)
            report["elementSummary"] = {
                "targetsCompared": element_report["targetsCompared"],
                "failingTargets": element_report["failingTargets"],
                "passingTargets": element_report["passingTargets"],
            }

    report_path = out_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2))

    maybe_fail(report, args)

    print(
        json.dumps(
            {
                "report": str(report_path),
                "reference": str(reference_path),
                "page": str(page_path),
                "pageManifest": str(manifest_path),
                "diff": str(out_dir / "diff.png"),
                "mismatchRatio": report["mismatchRatio"],
                "referenceMode": metadata["referenceMode"],
                "usedToken": metadata["usedToken"],
                "auditTargets": len(targets),
                "elementSummary": report.get("elementSummary"),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"pixel_audit.py failed: {exc}", file=sys.stderr)
        sys.exit(1)
