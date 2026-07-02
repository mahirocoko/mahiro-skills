#!/usr/bin/env python3
"""Extract a cleaned transparent sprite sheet from a chroma-key generated sheet."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
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


def parse_color(value: str) -> tuple[int, int, int]:
    raw = value.strip()
    if raw.startswith("#"):
        raw = raw[1:]
    if len(raw) != 6:
        raise argparse.ArgumentTypeError("expected #RRGGBB")
    try:
        return int(raw[0:2], 16), int(raw[2:4], 16), int(raw[4:6], 16)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected #RRGGBB") from exc


def parse_region(value: str) -> tuple[int, int, int, int, int]:
    # FRAME:X,Y,W,H
    try:
        frame_raw, region_raw = value.split(":", 1)
        x_raw, y_raw, w_raw, h_raw = region_raw.split(",", 3)
        frame = int(frame_raw)
        x = int(x_raw)
        y = int(y_raw)
        width = int(w_raw)
        height = int(h_raw)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected FRAME:X,Y,W,H") from exc
    if frame < 0 or width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("frame must be >=0 and region dimensions positive")
    return frame, x, y, width, height


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate:
        return candidate
    for path in ("/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        if Path(path).exists():
            return path
    raise SystemExit("ImageMagick 'magick' is required for extract-chroma-sheet.py")


def run(command: Iterable[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def image_size(magick: str, path: Path) -> tuple[int, int]:
    result = run([magick, "identify", "-format", "%w %h", str(path)])
    width_raw, height_raw = result.stdout.strip().split()
    return int(width_raw), int(height_raw)


def alpha_fx_expression(color: tuple[int, int, int], tolerance: float, spill: str) -> str:
    r, g, b = (channel / 255 for channel in color)
    base = f"(sqrt((r-{r:.6f})*(r-{r:.6f})+(g-{g:.6f})*(g-{g:.6f})+(b-{b:.6f})*(b-{b:.6f}))<{tolerance:.6f})"
    if spill == "magenta":
        # Removes anti-aliased magenta/purple key spill while sparing warmer pink details better than plain fuzz.
        spill_expr = "((r>0.16)&&(b>0.16)&&(g<0.24)&&(b>r*0.55)&&(r>b*0.45))"
        return f"({base}||{spill_expr})?0:a"
    if spill == "green":
        spill_expr = "((g>0.16)&&(r<0.30)&&(b<0.30)&&(g>r*1.45)&&(g>b*1.45))"
        return f"({base}||{spill_expr})?0:a"
    return f"{base}?0:a"


def frame_name(index: int) -> str:
    return f"frame-{index:02d}.png"


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract transparent frames/sheet from a chroma-key generated sheet")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--frame-size", type=parse_size, required=True)
    parser.add_argument("--chroma-key", type=parse_color, default=parse_color("#ff00ff"))
    parser.add_argument("--key-tolerance", type=float, default=0.22)
    parser.add_argument("--spill", choices=["none", "magenta", "green"], default="magenta")
    parser.add_argument("--source-layout", choices=["horizontal"], default="horizontal")
    parser.add_argument("--source-cell-width", type=int, default=0, help="Raw generated cell step width. Defaults to input width / frames.")
    parser.add_argument("--crop-width", type=int, default=0, help="Raw crop width per frame. Defaults to source-cell-width.")
    parser.add_argument("--crop-height", type=int, default=0, help="Raw crop height. Defaults to input height.")
    parser.add_argument("--crop-x-offset", type=int, default=0)
    parser.add_argument("--crop-y", type=int, default=0)
    parser.add_argument("--last-crop-x", type=int, default=None)
    parser.add_argument("--resize-percent", type=float, default=100)
    parser.add_argument("--trim", action="store_true", help="Trim transparent bounds after key removal before resize/extent.")
    parser.add_argument("--gravity", default="south")
    parser.add_argument("--state", default="animation")
    parser.add_argument("--sheet-name", default="sprite-sheet.png")
    parser.add_argument("--preview-name", default="preview.gif")
    parser.add_argument("--manifest-name", default="manifest.json")
    parser.add_argument("--duration-ms", type=int, default=90)
    parser.add_argument("--final-duration-ms", type=int, default=560)
    parser.add_argument("--clear-region", action="append", type=parse_region, default=[], help="Clear a frame-local region after extraction. Format FRAME:X,Y,W,H")
    parser.add_argument("--source-note", default="")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if args.resize_percent <= 0:
        raise SystemExit("--resize-percent must be positive")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    magick = magick_bin()
    input_width, input_height = image_size(magick, args.input)
    source_cell_width = args.source_cell_width or round(input_width / args.frames)
    crop_width = args.crop_width or source_cell_width
    crop_height = args.crop_height or input_height
    frame_width, frame_height = args.frame_size
    output_dir = args.output_dir
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    expression = alpha_fx_expression(args.chroma_key, args.key_tolerance, args.spill)
    clear_by_frame: dict[int, list[tuple[int, int, int, int]]] = {}
    for frame, x, y, width, height in args.clear_region:
        clear_by_frame.setdefault(frame, []).append((x, y, width, height))

    frame_entries = []
    for index in range(args.frames):
        crop_x = index * source_cell_width + args.crop_x_offset
        if index == args.frames - 1 and args.last_crop_x is not None:
            crop_x = args.last_crop_x
        crop_x = max(0, min(crop_x, max(0, input_width - crop_width)))
        crop_y = max(0, min(args.crop_y, max(0, input_height - crop_height)))
        frame_path = frames_dir / frame_name(index)
        command = [
            magick,
            str(args.input),
            "-crop",
            f"{crop_width}x{crop_height}+{crop_x}+{crop_y}",
            "+repage",
            "-alpha",
            "set",
            "-channel",
            "A",
            "-fx",
            expression,
            "+channel",
        ]
        if args.trim:
            command += ["-trim", "+repage"]
        command += [
            "-filter",
            "Lanczos",
            "-resize",
            f"{args.resize_percent}%",
            "-background",
            "none",
            "-gravity",
            args.gravity,
            "-extent",
            f"{frame_width}x{frame_height}",
            str(frame_path),
        ]
        run(command)
        for x, y, width, height in clear_by_frame.get(index, []):
            run([
                magick,
                str(frame_path),
                "-region",
                f"{width}x{height}+{x}+{y}",
                "-channel",
                "A",
                "-evaluate",
                "set",
                "0",
                "+channel",
                "+region",
                str(frame_path),
            ])
        frame_entries.append({
            "file": f"frames/{frame_path.name}",
            "state": args.state,
            "index": index,
            "durationMs": args.final_duration_ms if index == args.frames - 1 else args.duration_ms,
        })

    sheet_path = output_dir / args.sheet_name
    preview_path = output_dir / args.preview_name
    manifest_path = output_dir / args.manifest_name
    run([magick, *[str(frames_dir / frame_name(index)) for index in range(args.frames)], "+append", str(sheet_path)])
    preview_command = [magick, "-dispose", "background"]
    for index in range(args.frames):
        delay = max(1, round((args.final_duration_ms if index == args.frames - 1 else args.duration_ms) / 10))
        preview_command += ["-delay", str(delay), str(frames_dir / frame_name(index))]
    preview_command += ["-loop", "0", str(preview_path)]
    run(preview_command)

    manifest = {
        "frameSize": [frame_width, frame_height],
        "states": [args.state],
        "frames": frame_entries,
        "anchors": {"default": [round(frame_width / 2), max(0, frame_height - 4)]},
        "provenance": {"sourceLane": "codex", "usage": "source-candidate"},
        "artifacts": {"sheet": sheet_path.name, "previewGif": preview_path.name},
        "source": {
            "input": str(args.input),
            "chromaKey": "#{:02x}{:02x}{:02x}".format(*args.chroma_key),
            "crop": {"sourceCellWidth": source_cell_width, "cropWidth": crop_width, "cropHeight": crop_height, "cropXOffset": args.crop_x_offset, "cropY": args.crop_y},
            "resizePercent": args.resize_percent,
            "trim": args.trim,
            "note": args.source_note,
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    payload = {"ok": True, "outputDir": str(output_dir), "sheet": str(sheet_path), "previewGif": str(preview_path), "manifest": str(manifest_path)}
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"sheet: {sheet_path}")
        print(f"preview: {preview_path}")
        print(f"manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
