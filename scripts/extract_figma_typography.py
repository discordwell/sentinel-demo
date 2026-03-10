#!/usr/bin/env python3

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIGMA_ELEMENTS_PATH = ROOT / ".pixel-audit" / "exact-desktop-1-102" / "figma-elements.json"
OUTPUT_PATH = ROOT / "assets" / "figma" / "typography.css"

FONT_STACKS = {
    "Inter": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "Martian Mono": '"Martian Mono", monospace',
}

TYPOGRAPHY_MAP = [
    {
        "selector": ".hero__title",
        "node_id": "1:319",
        "label": "Hero Title",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".hero__panel .button",
        "node_id": "1:317",
        "label": "Hero CTA",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".signup__copy .eyebrow",
        "node_id": "1:650",
        "label": "Signup Eyebrow",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".signup__title",
        "node_id": "1:653",
        "label": "Signup Title",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".signup__text",
        "node_id": "1:655",
        "label": "Signup Body",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".signup__field input",
        "node_id": "1:658",
        "label": "Signup Input",
        "media": "(min-width: 1025px)",
    },
    {
        "selector": ".signup__form .button",
        "node_id": "1:660",
        "label": "Signup Button",
        "media": "(min-width: 1025px)",
    },
]


def format_px(value: float | int | None) -> str | None:
    if value is None:
        return None
    rounded = round(value)
    if abs(value - rounded) < 1e-6:
        return f"{rounded}px"
    return f"{value:.4f}".rstrip("0").rstrip(".") + "px"


def load_elements() -> dict[str, dict]:
    elements = json.loads(FIGMA_ELEMENTS_PATH.read_text())
    return {item["id"]: item for item in elements}


def build_rules(elements_by_id: dict[str, dict]) -> dict[str, list[str]]:
    rules_by_media: dict[str, list[str]] = {}

    for entry in TYPOGRAPHY_MAP:
        element = elements_by_id[entry["node_id"]]
        font_stack = FONT_STACKS.get(element["fontFamily"], f'"{element["fontFamily"]}", sans-serif')
        declarations = [
            f"  font-family: {font_stack};",
            f"  font-size: {format_px(element['fontSize'])};",
            f"  font-weight: {element['fontWeight']};",
            f"  line-height: {format_px(element['lineHeightPx'])};",
            f"  letter-spacing: {format_px(element['letterSpacing'] or 0)};",
        ]
        block = [
            f"/* {entry['label']} ({entry['node_id']}: {element['name']}) */",
            f"{entry['selector']} {{",
            *declarations,
            "}",
        ]
        rules_by_media.setdefault(entry["media"], []).append("\n".join(block))

    return rules_by_media


def write_css(rules_by_media: dict[str, list[str]]) -> None:
    lines = [
        "/* Generated from Figma node typography by scripts/extract_figma_typography.py */",
        "/* Source: .pixel-audit/exact-desktop-1-102/figma-elements.json */",
        "",
    ]

    for media, blocks in rules_by_media.items():
        lines.append(f"@media {media} {{")
        for block in blocks:
            lines.append(block)
            lines.append("")
        if lines[-1] == "":
            lines.pop()
        lines.append("}")
        lines.append("")

    OUTPUT_PATH.write_text("\n".join(lines).rstrip() + "\n")


def main() -> None:
    elements_by_id = load_elements()
    rules_by_media = build_rules(elements_by_id)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_css(rules_by_media)


if __name__ == "__main__":
    main()
