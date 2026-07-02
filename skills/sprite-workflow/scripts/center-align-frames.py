#!/usr/bin/env python3
"""Center-align frames in a transparent sprite sheet by alpha bounds."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Iterable


def parse_size(value: str) -> tuple[int, int]:
    raw = value.lower().replace("×", "x")
    if "x" not in raw:
        raise argparse.ArgumentTypeError("expected WIDTHxHEIGHT")
    left, right = raw.split("x", 1)
    try:
        width = int(left)
        height = int(right)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected integer WIDTHxHEIGHT") from exc
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("dimensions must be positive")
    return width, height


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate:
        return candidate
    for path in ("/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        if Path(path).exists():
            return path
    raise SystemExit("ImageMagick 'magick' is required for center-align-frames.py")


def run(command: Iterable[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def alpha_bounds(magick: str, frame: Path) -> tuple[int, int, int, int] | None:
    result = run([magick, str(frame), "-alpha", "extract", "-trim", "-format", "%w %h %X %Y", "info:"])
    text = result.stdout.strip()
    if not text:
        return None
    width, height, x, y = map(int, text.split())
    if width <= 0 or height <= 0:
        return None
    return width, height, x, y


def main() -> int:
    parser = argparse.ArgumentParser(description="Center-align transparent sprite frames by alpha bounds")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=int)
    parser.add_argument("--frame-size", required=True, type=parse_size)
    parser.add_argument("--target-center-x", type=float, default=None)
    parser.add_argument("--max-shift", type=int, default=16)
    parser.add_argument("--sheet-name", default="sprite-sheet.png")
    parser.add_argument("--preview-name", default="preview.gif")
    parser.add_argument("--duration-ms", type=int, default=90)
    parser.add_argument("--final-duration-ms", type=int, default=560)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if args.max_shift < 0:
        raise SystemExit("--max-shift must be non-negative")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    magick = magick_bin()
    frame_width, frame_height = args.frame_size
    target_center_x = args.target_center_x if args.target_center_x is not None else frame_width / 2
    output_dir = args.output_dir
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    sheet_path = output_dir / args.sheet_name
    preview_path = output_dir / args.preview_name
    shifts = []

    with tempfile.TemporaryDirectory(prefix="sprite-center-") as temp_raw:
        temp = Path(temp_raw)
        for index in range(args.frames):
            cropped = temp / f"source-{index:02d}.png"
            out = frames_dir / f"frame-{index:02d}.png"
            run([magick, str(args.input), "-crop", f"{frame_width}x{frame_height}+{index * frame_width}+0", "+repage", str(cropped)])
            bounds = alpha_bounds(magick, cropped)
            dx = 0
            center_x = None
            if bounds:
                width, _height, x, _y = bounds
                center_x = x + width / 2
                dx = round(target_center_x - center_x)
                dx = max(-args.max_shift, min(args.max_shift, dx))
            run([magick, "-size", f"{frame_width}x{frame_height}", "xc:none", str(cropped), "-geometry", f"{dx:+d}+0", "-compose", "over", "-composite", str(out)])
            shifts.append({"index": index, "centerXBefore": center_x, "dx": dx})

    run([magick, *[str(frames_dir / f"frame-{index:02d}.png") for index in range(args.frames)], "+append", str(sheet_path)])
    preview_command = [magick, "-dispose", "background"]
    for index in range(args.frames):
        delay = max(1, round((args.final_duration_ms if index == args.frames - 1 else args.duration_ms) / 10))
        preview_command += ["-delay", str(delay), str(frames_dir / f"frame-{index:02d}.png")]
    preview_command += ["-loop", "0", str(preview_path)]
    run(preview_command)

    payload = {"ok": True, "outputDir": str(output_dir), "sheet": str(sheet_path), "previewGif": str(preview_path), "targetCenterX": target_center_x, "shifts": shifts}
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"sheet: {sheet_path}")
        print(f"preview: {preview_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
