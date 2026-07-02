#!/usr/bin/env python3
"""Generate a dependency-free HTML contact sheet from a sprite manifest."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an HTML contact sheet from manifest frames")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--scale", type=int, default=4)
    args = parser.parse_args()

    data = json.loads(args.manifest.read_text())
    frames = data.get("frames") if isinstance(data.get("frames"), list) else []
    frame_size = data.get("frameSize") if isinstance(data.get("frameSize"), list) else [32, 32]
    width, height = frame_size[0], frame_size[1]
    output = args.output or (args.manifest.parent / "contact-sheet.html")
    rel_base = output.parent

    cards: list[str] = []
    for frame in frames:
        if not isinstance(frame, dict):
            continue
        file_value = str(frame.get("file", ""))
        state = html.escape(str(frame.get("state", "unknown")))
        index = html.escape(str(frame.get("index", "?")))
        src_path = (args.manifest.parent / file_value).resolve()
        try:
            src = src_path.relative_to(rel_base.resolve())
        except ValueError:
            src = src_path
        cards.append(f'''<figure class="frame">
  <div class="sprite-box"><img src="{html.escape(str(src))}" alt="{state} {index}" /></div>
  <figcaption>{state} #{index}<br><code>{html.escape(file_value)}</code></figcaption>
</figure>''')

    css_width = width * args.scale
    css_height = height * args.scale
    doc = f'''<!doctype html>
<meta charset="utf-8">
<title>Sprite contact sheet</title>
<style>
  body {{ margin: 24px; background: #161616; color: #eee; font: 13px system-ui, sans-serif; }}
  .meta {{ color: #aaa; margin-bottom: 16px; }}
  .grid {{ display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }}
  .frame {{ margin: 0; padding: 10px; background: #222; border: 1px solid #333; border-radius: 8px; }}
  .sprite-box {{ width: {css_width}px; height: {css_height}px; display: grid; place-items: center; image-rendering: pixelated; background: conic-gradient(#333 25%, #292929 0 50%, #333 0 75%, #292929 0) 0 0 / 16px 16px; }}
  img {{ max-width: 100%; max-height: 100%; image-rendering: pixelated; }}
  figcaption {{ margin-top: 8px; max-width: {max(css_width, 120)}px; color: #ddd; }}
  code {{ color: #aaa; font-size: 11px; word-break: break-all; }}
</style>
<h1>Sprite contact sheet</h1>
<div class="meta">Frame size: {width}×{height} · Frames: {len(cards)} · Manifest: {html.escape(str(args.manifest))}</div>
<div class="grid">
{''.join(cards)}
</div>
'''
    output.write_text(doc)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
