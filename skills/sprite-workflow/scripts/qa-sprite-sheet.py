#!/usr/bin/env python3
"""Run practical QA gates for transparent sprite sheets."""
from __future__ import annotations

import argparse
import json
import re
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
    raise SystemExit("ImageMagick 'magick' is required for qa-sprite-sheet.py")


def run(command: Iterable[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def image_size(magick: str, path: Path) -> tuple[int, int]:
    result = run([magick, "identify", "-format", "%w %h", str(path)])
    width, height = result.stdout.strip().split()
    return int(width), int(height)


def alpha_bounds(magick: str, frame: Path) -> tuple[int, int, int, int] | None:
    result = run([magick, str(frame), "-alpha", "extract", "-trim", "-format", "%w %h %X %Y", "info:"])
    text = result.stdout.strip()
    if not text:
        return None
    width, height, x, y = text.split()
    width_i = int(width)
    height_i = int(height)
    if width_i <= 0 or height_i <= 0:
        return None
    return width_i, height_i, int(x), int(y)


def magenta_residue_count(magick: str, frame: Path) -> int:
    result = run([magick, str(frame), "txt:-"])
    count = 0
    pattern = re.compile(r"^(\d+),(\d+):.*srgba?\((\d+),(\d+),(\d+)(?:,(\d+(?:\.\d+)?))?")
    for line in result.stdout.splitlines()[1:]:
        match = pattern.match(line)
        if not match:
            continue
        r = int(match.group(3)); g = int(match.group(4)); b = int(match.group(5))
        alpha_raw = match.group(6)
        alpha = float(alpha_raw) if alpha_raw is not None else 1.0
        if alpha <= 0:
            continue
        if r > 150 and b > 130 and g < 120:
            count += 1
    return count


def connected_components(magick: str, frame: Path) -> list[dict[str, object]]:
    result = run([
        magick,
        str(frame),
        "-alpha",
        "extract",
        "-threshold",
        "1%",
        "-define",
        "connected-components:verbose=true",
        "-connected-components",
        "8",
        "null:",
    ])
    components: list[dict[str, object]] = []
    pattern = re.compile(r"^\s*(\d+):\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[^\s]+\s+(\d+)\s+srgb\((\d+),(\d+),(\d+)\)")
    for line in (result.stdout + result.stderr).splitlines():
        match = pattern.match(line)
        if not match:
            continue
        component_id, width, height, x, y, area, red, green, blue = map(int, match.groups())
        # Foreground in alpha-extract threshold output is white; background is black.
        foreground = red > 127 or green > 127 or blue > 127
        components.append({
            "id": component_id,
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "right": x + width,
            "bottom": y + height,
            "area": area,
            "foreground": foreground,
        })
    return components


def outside_expanded(bounds: dict[str, object], main: dict[str, object], padding: int) -> bool:
    left = int(main["x"]) - padding
    top = int(main["y"]) - padding
    right = int(main["right"]) + padding
    bottom = int(main["bottom"]) + padding
    return int(bounds["right"]) < left or int(bounds["x"]) > right or int(bounds["bottom"]) < top or int(bounds["y"]) > bottom


def sliver_components(components: list[dict[str, object]], *, min_area: int, max_thickness: int, min_aspect: float, main_padding: int) -> list[dict[str, object]]:
    foreground = [component for component in components if component.get("foreground")]
    if not foreground:
        return []
    main = max(foreground, key=lambda component: int(component["area"]))
    slivers: list[dict[str, object]] = []
    for component in foreground:
        if component is main:
            continue
        area = int(component["area"])
        width = int(component["width"])
        height = int(component["height"])
        if area < min_area:
            continue
        thin = min(width, height) <= max_thickness
        elongated = max(width, height) / max(1, min(width, height)) >= min_aspect
        if (thin or elongated) and outside_expanded(component, main, main_padding):
            slivers.append(component)
    return slivers


def main() -> int:
    parser = argparse.ArgumentParser(description="QA transparent sprite sheet dimensions, alpha bounds, residue, and appendage consistency")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--frame-size", type=parse_size, required=True)
    parser.add_argument("--edge-margin", type=int, default=2)
    parser.add_argument("--warn-edge-margin", type=int, default=6)
    parser.add_argument("--max-magenta-residue", type=int, default=12)
    parser.add_argument("--preserve-right-appendage", action="store_true")
    parser.add_argument("--target-center-x", type=float, default=None, help="Expected visual center X within each frame. Defaults to frame width / 2 when center drift checks are enabled.")
    parser.add_argument("--max-center-drift", type=float, default=0, help="Warn/fail when a frame center is farther than this from target center. 0 disables.")
    parser.add_argument("--max-center-range", type=float, default=0, help="Warn/fail when centerX range across frames exceeds this. 0 disables.")
    parser.add_argument("--warn-center-as-error", action="store_true")
    parser.add_argument("--max-bounds-x-range", type=float, default=0, help="Warn/fail when alpha-bounds x range across frames exceeds this. 0 disables.")
    parser.add_argument("--max-bounds-y-range", type=float, default=0, help="Warn/fail when alpha-bounds y range across frames exceeds this. 0 disables.")
    parser.add_argument("--max-bounds-width-range", type=float, default=0, help="Warn/fail when alpha-bounds width range across frames exceeds this. 0 disables.")
    parser.add_argument("--max-bounds-height-range", type=float, default=0, help="Warn/fail when alpha-bounds height range across frames exceeds this. 0 disables.")
    parser.add_argument("--warn-bounds-as-error", action="store_true")
    parser.add_argument("--max-sliver-components", type=int, default=-1, help="Maximum detached sliver components allowed. -1 disables.")
    parser.add_argument("--sliver-min-area", type=int, default=12)
    parser.add_argument("--sliver-max-thickness", type=int, default=4)
    parser.add_argument("--sliver-min-aspect", type=float, default=3.0)
    parser.add_argument("--sliver-main-padding", type=int, default=2)
    parser.add_argument("--min-width-ratio", type=float, default=0.75)
    parser.add_argument("--allow-bottom-edge", action="store_true", help="Allow alpha to touch the bottom baseline edge while still checking other edges")
    parser.add_argument("--warn-as-error", action="store_true")
    parser.add_argument("--report", type=Path, default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if not args.sheet.exists():
        raise SystemExit(f"sheet not found: {args.sheet}")
    magick = magick_bin()
    frame_width, frame_height = args.frame_size
    expected_size = (frame_width * args.frames, frame_height)
    sheet_size = image_size(magick, args.sheet)
    failures: list[str] = []
    warnings: list[str] = []
    frames: list[dict[str, object]] = []
    if sheet_size != expected_size:
        failures.append(f"sheet size {sheet_size[0]}x{sheet_size[1]} != expected {expected_size[0]}x{expected_size[1]}")

    with tempfile.TemporaryDirectory(prefix="sprite-qa-") as temp_raw:
        temp = Path(temp_raw)
        widths: list[int] = []
        centers: list[float] = []
        bounds_xs: list[int] = []
        bounds_ys: list[int] = []
        bounds_widths: list[int] = []
        bounds_heights: list[int] = []
        for index in range(args.frames):
            frame = temp / f"frame-{index:02d}.png"
            run([magick, str(args.sheet), "-crop", f"{frame_width}x{frame_height}+{index * frame_width}+0", "+repage", str(frame)])
            bounds = alpha_bounds(magick, frame)
            residue = magenta_residue_count(magick, frame)
            entry: dict[str, object] = {"index": index, "magentaResidue": residue}
            if bounds is None:
                failures.append(f"frame {index}: blank alpha")
            else:
                width, height, x, y = bounds
                widths.append(width)
                bounds_xs.append(x)
                bounds_ys.append(y)
                bounds_widths.append(width)
                bounds_heights.append(height)
                center_x = x + width / 2
                centers.append(center_x)
                entry["centerX"] = center_x
                entry["bounds"] = {"x": x, "y": y, "width": width, "height": height, "right": x + width, "bottom": y + height}
                if args.max_center_drift > 0:
                    target_center_x = args.target_center_x if args.target_center_x is not None else frame_width / 2
                    center_drift = abs(center_x - target_center_x)
                    entry["centerDrift"] = center_drift
                    if center_drift > args.max_center_drift:
                        message = f"frame {index}: center drift {center_drift:.1f}px from target {target_center_x:.1f}"
                        if args.warn_center_as_error:
                            failures.append(message)
                        else:
                            warnings.append(message)
                touches_hard = x <= args.edge_margin or y <= args.edge_margin or x + width >= frame_width - args.edge_margin or (not args.allow_bottom_edge and y + height >= frame_height - args.edge_margin)
                touches_warn = x <= args.warn_edge_margin or y <= args.warn_edge_margin or x + width >= frame_width - args.warn_edge_margin or (not args.allow_bottom_edge and y + height >= frame_height - args.warn_edge_margin)
                if touches_hard:
                    failures.append(f"frame {index}: alpha touches hard edge {entry['bounds']}")
                elif touches_warn:
                    warnings.append(f"frame {index}: alpha close to edge {entry['bounds']}")
            if residue > args.max_magenta_residue:
                warnings.append(f"frame {index}: magenta residue {residue}px")
            if args.max_sliver_components >= 0:
                slivers = sliver_components(
                    connected_components(magick, frame),
                    min_area=args.sliver_min_area,
                    max_thickness=args.sliver_max_thickness,
                    min_aspect=args.sliver_min_aspect,
                    main_padding=args.sliver_main_padding,
                )
                entry["sliverComponents"] = slivers
                if len(slivers) > args.max_sliver_components:
                    failures.append(f"frame {index}: detached sliver components {len(slivers)} > {args.max_sliver_components}")
            frames.append(entry)
        if args.max_center_range > 0 and centers:
            center_range = max(centers) - min(centers)
            if center_range > args.max_center_range:
                message = f"center range {center_range:.1f}px exceeds {args.max_center_range:.1f}px"
                if args.warn_center_as_error:
                    failures.append(message)
                else:
                    warnings.append(message)
        bounds_checks = [
            ("bounds x", bounds_xs, args.max_bounds_x_range),
            ("bounds y", bounds_ys, args.max_bounds_y_range),
            ("bounds width", bounds_widths, args.max_bounds_width_range),
            ("bounds height", bounds_heights, args.max_bounds_height_range),
        ]
        for label, values, maximum in bounds_checks:
            if maximum > 0 and values:
                value_range = max(values) - min(values)
                if value_range > maximum:
                    message = f"{label} range {value_range:.1f}px exceeds {maximum:.1f}px"
                    if args.warn_bounds_as_error:
                        failures.append(message)
                    else:
                        warnings.append(message)
        if args.preserve_right_appendage and widths:
            max_width = max(widths)
            min_allowed = max_width * args.min_width_ratio
            for entry in frames:
                bounds = entry.get("bounds")
                if isinstance(bounds, dict) and bounds.get("width", 0) < min_allowed:
                    warnings.append(f"frame {entry['index']}: bbox width {bounds['width']} below appendage ratio threshold {min_allowed:.1f}")

    ok = not failures and not (args.warn_as_error and warnings)
    payload = {"ok": ok, "sheet": str(args.sheet), "sheetSize": {"width": sheet_size[0], "height": sheet_size[1]}, "expectedSize": {"width": expected_size[0], "height": expected_size[1]}, "frames": frames, "warnings": warnings, "failures": failures}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(payload, indent=2) + "\n")
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print("sprite sheet qa ok" if ok else "sprite sheet qa failed")
        for warning in warnings:
            print(f"warning: {warning}")
        for failure in failures:
            print(f"failure: {failure}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
