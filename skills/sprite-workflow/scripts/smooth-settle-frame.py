#!/usr/bin/env python3
"""Replace a noisy animation frame with a stable neighbor/hold frame and rebuild sheet/preview."""
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
        return int(left), int(right)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected integer WIDTHxHEIGHT") from exc


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate:
        return candidate
    for path in ("/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        if Path(path).exists():
            return path
    raise SystemExit("ImageMagick 'magick' is required for smooth-settle-frame.py")


def run(command: Iterable[str]) -> None:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Replace a jittery settle frame with a stable source frame and rebuild a sprite sheet")
    parser.add_argument("--input", required=True, type=Path, help="Input sprite sheet")
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--frame-size", type=parse_size, required=True)
    parser.add_argument("--replace-index", type=int, required=True)
    parser.add_argument("--source-index", type=int, required=True)
    parser.add_argument("--sheet-name", default="smoothed-sheet.png")
    parser.add_argument("--preview-name", default="smoothed-preview.gif")
    parser.add_argument("--duration-ms", type=int, default=120)
    parser.add_argument("--final-duration-ms", type=int, default=180)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if args.replace_index < 0 or args.replace_index >= args.frames or args.source_index < 0 or args.source_index >= args.frames:
        raise SystemExit("replace/source index out of range")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    magick = magick_bin()
    out = args.output_dir
    frames_dir = out / "frames"
    if out.exists():
        shutil.rmtree(out)
    frames_dir.mkdir(parents=True, exist_ok=True)
    frame_width, frame_height = args.frame_size
    frame_paths: list[Path] = []
    for index in range(args.frames):
        frame = frames_dir / f"frame-{index:02d}.png"
        run([magick, str(args.input), "-crop", f"{frame_width}x{frame_height}+{index * frame_width}+0", "+repage", str(frame)])
        frame_paths.append(frame)
    shutil.copy2(frame_paths[args.source_index], frame_paths[args.replace_index])
    sheet = out / args.sheet_name
    preview = out / args.preview_name
    run([magick, *map(str, frame_paths), "+append", str(sheet)])
    gif_args: list[str] = [magick, "-dispose", "background"]
    for index, frame in enumerate(frame_paths):
        delay = args.final_duration_ms if index == args.frames - 1 else args.duration_ms
        gif_args.extend(["-delay", str(max(1, round(delay / 10))), str(frame)])
    gif_args.extend(["-loop", "0", str(preview)])
    run(gif_args)
    report = out / "smooth-settle-report.md"
    report.write_text(
        f"# Smooth Settle Frame Report\n\nReplaced frame `{args.replace_index:02d}` with frame `{args.source_index:02d}`.\n\n"
        "Use this only when the replacement reduces a visible jitter/pop and the repeated/held frame is acceptable for the motion.\n"
    )
    if args.json:
        import json
        print(json.dumps({"sheet": str(sheet), "previewGif": str(preview), "report": str(report), "replaceIndex": args.replace_index, "sourceIndex": args.source_index}, indent=2))
    else:
        print(f"wrote {sheet}")
        print(f"wrote {preview}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
