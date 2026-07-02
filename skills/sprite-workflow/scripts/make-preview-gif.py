#!/usr/bin/env python3
"""Generate a GIF preview from manifest frames using Pillow when available."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate animated GIF preview from sprite manifest frames")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--default-duration", type=int, default=160)
    args = parser.parse_args()

    try:
        from PIL import Image
    except Exception:
        print("Pillow is required for GIF preview generation. Install it in the active Python environment, e.g. `python3 -m pip install Pillow`.")
        return 2

    data = json.loads(args.manifest.read_text())
    frames_data = data.get("frames") if isinstance(data.get("frames"), list) else []
    images = []
    durations = []
    for frame in frames_data:
        if not isinstance(frame, dict) or not frame.get("file"):
            continue
        image_path = args.manifest.parent / str(frame["file"])
        image = Image.open(image_path).convert("RGBA")
        images.append(image)
        durations.append(int(frame.get("durationMs") or args.default_duration))
    if not images:
        print("No frames found in manifest")
        return 1
    output = args.output or (args.manifest.parent / "preview.gif")
    images[0].save(output, save_all=True, append_images=images[1:], duration=durations, loop=0, disposal=2)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
