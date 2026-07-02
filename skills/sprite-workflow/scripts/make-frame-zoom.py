#!/usr/bin/env python3
"""Create adjacent-frame zoom/contact images for sprite sheet visual QA."""
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path
from typing import Iterable


def parse_size(value: str) -> tuple[int, int]:
    raw = value.lower().replace("×", "x")
    if "x" not in raw:
        raise argparse.ArgumentTypeError("expected WIDTHxHEIGHT")
    left, right = raw.split("x", 1)
    try:
        width = int(left); height = int(right)
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
    raise SystemExit("ImageMagick 'magick' is required for make-frame-zoom.py")


def run(command: Iterable[str]) -> None:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate zoomed frame strips and optional adjacent-frame strips for sprite animation QA")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--frame-size", type=parse_size, required=True)
    parser.add_argument("--scale", type=int, default=3)
    parser.add_argument("--background", default="#f4efe5")
    parser.add_argument("--name", default="frames-zoom.png")
    parser.add_argument("--adjacent", type=int, action="append", default=[], help="Frame index to make a previous/current/next zoom strip for. Repeatable.")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if args.scale <= 0:
        raise SystemExit("--scale must be positive")
    if not args.sheet.exists():
        raise SystemExit(f"sheet not found: {args.sheet}")

    magick = magick_bin()
    frame_width, frame_height = args.frame_size
    out = args.output_dir
    frames_dir = out / "zoom-frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    frame_paths: list[Path] = []
    for index in range(args.frames):
        frame = frames_dir / f"frame-{index:02d}.png"
        run([magick, str(args.sheet), "-crop", f"{frame_width}x{frame_height}+{index * frame_width}+0", "+repage", str(frame)])
        frame_paths.append(frame)

    out.mkdir(parents=True, exist_ok=True)
    strip = out / args.name
    run([magick, *map(str, frame_paths), "-background", args.background, "-gravity", "center", "+append", "-filter", "point", "-resize", f"{args.scale * 100}%", str(strip)])

    adjacent_outputs: list[str] = []
    for index in args.adjacent:
        if index < 0 or index >= args.frames:
            raise SystemExit(f"adjacent index out of range: {index}")
        start = max(0, index - 1)
        end = min(args.frames - 1, index + 1)
        selected = frame_paths[start:end + 1]
        dest = out / f"frame-{index:02d}-adjacent-zoom.png"
        run([magick, *map(str, selected), "-background", args.background, "-gravity", "center", "+append", "-filter", "point", "-resize", f"{args.scale * 100}%", str(dest)])
        adjacent_outputs.append(str(dest))

    if args.json:
        import json
        print(json.dumps({"strip": str(strip), "adjacent": adjacent_outputs}, indent=2))
    else:
        print(f"wrote {strip}")
        for dest in adjacent_outputs:
            print(f"wrote {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
