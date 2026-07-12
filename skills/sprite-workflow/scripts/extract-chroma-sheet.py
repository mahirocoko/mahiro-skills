#!/usr/bin/env python3
"""Extract a cleaned transparent sprite sheet from a chroma-key generated sheet."""
from __future__ import annotations

import argparse
import json
import re
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


def run_bytes(command: Iterable[str]) -> bytes:
    result = subprocess.run(list(command), capture_output=True)
    if result.returncode != 0:
        stderr = result.stderr.decode("utf8", errors="replace").strip()
        stdout = result.stdout.decode("utf8", errors="replace").strip()
        raise SystemExit(stderr or stdout or "command failed")
    return result.stdout


def edge_connected_commands(width: int, height: int, tolerance: float) -> list[str]:
    fuzz = f"{max(0.0, min(1.0, tolerance)) * 100:.3f}%"
    points = [(0, 0), (max(0, width - 1), 0), (0, max(0, height - 1)), (max(0, width - 1), max(0, height - 1))]
    commands = ["-alpha", "set", "-fuzz", fuzz, "-fill", "none"]
    for x, y in points:
        commands += ["-draw", f"color {x},{y} floodfill"]
    return commands


def detect_component_x_runs(magick: str, path: Path, width: int, height: int, frames: int, tolerance: float, min_column_alpha: int, padding: int) -> list[tuple[int, int]] | None:
    raw = run_bytes([
        magick,
        str(path),
        *edge_connected_commands(width, height, tolerance),
        "-alpha", "extract",
        "-depth", "8",
        "gray:-",
    ])
    expected = width * height
    if len(raw) < expected:
        return None
    column_counts = [0] * width
    data = raw[:expected]
    for y in range(height):
        row = data[y * width:(y + 1) * width]
        for x, value in enumerate(row):
            if value > 0:
                column_counts[x] += 1
    active = [count >= min_column_alpha for count in column_counts]
    runs: list[list[int]] = []
    in_run = False
    start = 0
    for index, is_active in enumerate(active):
        if is_active and not in_run:
            start = index
            in_run = True
        elif not is_active and in_run:
            if index - start > 2:
                runs.append([start, index])
            in_run = False
    if in_run:
        runs.append([start, width])
    runs = [[left, right] for left, right in runs if sum(column_counts[left:right]) > min_column_alpha * 3]
    while len(runs) > frames:
        gap, merge_index = min((runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1))
        runs[merge_index] = [runs[merge_index][0], runs[merge_index + 1][1]]
        del runs[merge_index + 1]
    if len(runs) != frames:
        return None
    padded: list[tuple[int, int]] = []
    for index, (left, right) in enumerate(runs):
        left_limit = 0
        right_limit = width
        if index > 0:
            left_limit = (runs[index - 1][1] + left) // 2
        if index < len(runs) - 1:
            right_limit = (right + runs[index + 1][0]) // 2
        padded_left = max(left_limit, left - padding)
        padded_right = min(right_limit, right + padding)
        if padded_right <= padded_left:
            padded_left, padded_right = left, right
        padded.append((max(0, padded_left), min(width, padded_right)))
    return padded


def detect_component_grid(magick: str, path: Path, width: int, height: int, columns: int, rows: int, tolerance: float, padding: int, min_body_area: int, center_confidence: float, overflow_distance: int) -> tuple[list[tuple[int, int, int, int]], list[dict[str, object]]] | None:
    """Recover exactly one confident body from each nominal row-major cell."""
    result = run([magick, str(path), *edge_connected_commands(width, height, tolerance), "-alpha", "extract", "-threshold", "1%", "-define", "connected-components:verbose=true", "-connected-components", "8", "null:"])
    pattern = re.compile(r"^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[^\s]+\s+(\d+)\s+(?:srgb\((\d+),(\d+),(\d+)\)|gray\((\d+)\))")
    components: list[dict[str, object]] = []
    for line in (result.stdout + result.stderr).splitlines():
        match = pattern.match(line)
        if not match:
            continue
        component_width, component_height, x, y, area = map(int, match.groups()[:5])
        colors, gray = match.groups()[5:8], match.group(9)
        red, green, blue = ((int(gray),) * 3) if gray is not None else tuple(map(int, colors))
        if max(red, green, blue) > 127 and area >= 4:
            components.append({"x": x, "y": y, "width": component_width, "height": component_height, "area": area, "centerX": x + component_width / 2, "centerY": y + component_height / 2})

    cell_area = (width / columns) * (height / rows)
    required_area = min_body_area or max(4, round(cell_area * 0.02))
    cells: list[tuple[int, int, int, int]] = []
    for row in range(rows):
        for column in range(columns):
            cells.append((width * column // columns, height * row // rows, width * (column + 1) // columns, height * (row + 1) // rows))

    assignments: list[dict[str, object]] = []
    claimed: set[int] = set()
    for cell_index, (cell_left, cell_top, cell_right, cell_bottom) in enumerate(cells):
        cell_width, cell_height = cell_right - cell_left, cell_bottom - cell_top
        candidates: list[tuple[int, dict[str, object]]] = []
        local: list[tuple[int, dict[str, object]]] = []
        for component_index, component in enumerate(components):
            center_x, center_y = float(component["centerX"]), float(component["centerY"])
            if not (cell_left <= center_x < cell_right and cell_top <= center_y < cell_bottom):
                continue
            local.append((component_index, component))
            centered = abs(center_x - (cell_left + cell_right) / 2) <= cell_width * center_confidence and abs(center_y - (cell_top + cell_bottom) / 2) <= cell_height * center_confidence
            contained = int(component["x"]) >= cell_left and int(component["y"]) >= cell_top and int(component["x"]) + int(component["width"]) <= cell_right and int(component["y"]) + int(component["height"]) <= cell_bottom
            if int(component["area"]) >= required_area and centered and contained:
                candidates.append((component_index, component))
        if len(candidates) != 1:
            return None
        body_index, body = candidates[0]
        # A second substantial component is ambiguous even when it misses the center gate.
        if any(index != body_index and int(item["area"]) >= max(required_area, round(int(body["area"]) * 0.5)) for index, item in local):
            return None
        claimed.add(body_index)
        assignments.append({"cell": {"index": cell_index, "column": cell_index % columns, "row": cell_index // columns, "bounds": [cell_left, cell_top, cell_right, cell_bottom]}, "body": body, "nearbyFx": []})

    for component_index, component in enumerate(components):
        if component_index in claimed:
            continue
        center_x, center_y = float(component["centerX"]), float(component["centerY"])
        column = min(columns - 1, max(0, int(center_x * columns / width)))
        row = min(rows - 1, max(0, int(center_y * rows / height)))
        assignment = assignments[row * columns + column]
        cell_left, cell_top, cell_right, cell_bottom = assignment["cell"]["bounds"]
        overflow = max(cell_left - int(component["x"]), cell_top - int(component["y"]), int(component["x"]) + int(component["width"]) - cell_right, int(component["y"]) + int(component["height"]) - cell_bottom, 0)
        if overflow > overflow_distance:
            return None
        assignment["nearbyFx"].append(component)

    crops: list[tuple[int, int, int, int]] = []
    for assignment in assignments:
        cell_left, cell_top, cell_right, cell_bottom = assignment["cell"]["bounds"]
        included = [assignment["body"], *assignment["nearbyFx"]]
        left = max(0, cell_left - overflow_distance, min(int(item["x"]) for item in included) - padding)
        top = max(0, cell_top - overflow_distance, min(int(item["y"]) for item in included) - padding)
        right = min(width, cell_right + overflow_distance, max(int(item["x"]) + int(item["width"]) for item in included) + padding)
        bottom = min(height, cell_bottom + overflow_distance, max(int(item["y"]) + int(item["height"]) for item in included) + padding)
        if right <= left or bottom <= top:
            return None
        crops.append((left, top, right - left, bottom - top))
    return crops, assignments


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
    parser.add_argument("--background-mode", choices=["color-distance", "edge-connected"], default="color-distance", help="color-distance removes all key-like pixels; edge-connected flood-fills only background connected to image edges.")
    parser.add_argument("--spill", choices=["none", "magenta", "green"], default="magenta")
    parser.add_argument("--source-layout", choices=["horizontal", "grid"], default="horizontal")
    parser.add_argument("--slice-mode", choices=["fixed", "component-x-runs", "component-grid"], default="fixed", help="fixed supports row-major grids; component modes fail closed when recovery is ambiguous.")
    parser.add_argument("--source-columns", type=int, default=0)
    parser.add_argument("--source-rows", type=int, default=0)
    parser.add_argument("--component-min-column-alpha", type=int, default=8)
    parser.add_argument("--component-run-padding", type=int, default=8)
    parser.add_argument("--component-min-body-area", type=int, default=0, help="Minimum component area for a grid body; 0 derives 2%% of nominal cell area.")
    parser.add_argument("--component-center-confidence", type=float, default=0.45, help="Maximum body-center offset from cell center as a fraction of cell dimensions.")
    parser.add_argument("--component-overflow-distance", type=int, default=0, help="Maximum pixels detached FX may extend beyond its nominal cell.")
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
    parser.add_argument("--source-job", type=Path, default=None, help="Optional job.json supplying schema-v2 metadata and lineage")
    parser.add_argument("--action", default="")
    parser.add_argument("--direction", default="")
    parser.add_argument("--content-policy", default="")
    parser.add_argument("--anchor-policy", default="")
    parser.add_argument("--source-id", action="append", default=[])
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if args.resize_percent <= 0:
        raise SystemExit("--resize-percent must be positive")
    if args.component_min_body_area < 0 or not 0 < args.component_center_confidence <= 0.5 or args.component_overflow_distance < 0:
        raise SystemExit("component confidence values must be non-negative and center confidence must be in (0, 0.5]")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    magick = magick_bin()
    input_width, input_height = image_size(magick, args.input)
    columns = args.source_columns or (args.frames if args.source_layout == "horizontal" else 0)
    rows = args.source_rows or (1 if args.source_layout == "horizontal" else 0)
    if columns <= 0 or rows <= 0 or columns * rows < args.frames:
        raise SystemExit("source grid requires positive columns/rows with enough row-major cells")
    if args.slice_mode == "component-grid" and columns * rows != args.frames:
        raise SystemExit("component-grid requires exactly one requested frame per nominal cell")
    source_cell_width = args.source_cell_width or (input_width // columns)
    source_cell_height = input_height // rows
    crop_width = args.crop_width or source_cell_width
    crop_height = args.crop_height or source_cell_height
    frame_width, frame_height = args.frame_size
    output_dir = args.output_dir
    for option, name in (("--sheet-name", args.sheet_name), ("--preview-name", args.preview_name), ("--manifest-name", args.manifest_name)):
        if not name or Path(name).name != name or name in {".", ".."}:
            raise SystemExit(f"{option} must be a plain output basename")
    if output_dir.exists() and (not output_dir.is_dir() or any(output_dir.iterdir())):
        raise SystemExit(f"output directory must be absent or empty: {output_dir}")
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    expression = alpha_fx_expression(args.chroma_key, args.key_tolerance, args.spill)
    detected_runs = None
    if args.slice_mode == "component-x-runs":
        detected_runs = detect_component_x_runs(
            magick,
            args.input,
            input_width,
            input_height,
            args.frames,
            args.key_tolerance,
            args.component_min_column_alpha,
            args.component_run_padding,
        )
        if detected_runs is None:
            raise SystemExit("component-x-runs detection failed; no fixed-slice fallback was applied")
    component_assignments = None
    component_crops = None
    if args.slice_mode == "component-grid":
        recovered = detect_component_grid(magick, args.input, input_width, input_height, columns, rows, args.key_tolerance, args.component_run_padding, args.component_min_body_area, args.component_center_confidence, args.component_overflow_distance)
        if recovered is None:
            raise SystemExit("component-grid detection failed; no fixed-grid fallback was applied")
        component_crops, component_assignments = recovered
    clear_by_frame: dict[int, list[tuple[int, int, int, int]]] = {}
    for frame, x, y, width, height in args.clear_region:
        clear_by_frame.setdefault(frame, []).append((x, y, width, height))

    frame_entries = []
    for index in range(args.frames):
        crop_height_current = crop_height
        if component_crops:
            crop_x, crop_y, crop_width_current, crop_height_current = component_crops[index]
        elif detected_runs:
            left, right = detected_runs[index]
            crop_x = left
            crop_width_current = max(1, right - left)
            crop_y = args.crop_y
        else:
            column, row = index % columns, index // columns
            crop_x = column * source_cell_width + args.crop_x_offset
            crop_y = row * source_cell_height + args.crop_y
            if index == args.frames - 1 and args.last_crop_x is not None:
                crop_x = args.last_crop_x
            crop_width_current = crop_width
        crop_x = max(0, min(crop_x, max(0, input_width - crop_width_current)))
        crop_y = max(0, min(crop_y, max(0, input_height - crop_height_current)))
        frame_path = frames_dir / frame_name(index)
        command = [
            magick,
            str(args.input),
            "-crop",
            f"{crop_width_current}x{crop_height_current}+{crop_x}+{crop_y}",
            "+repage",
        ]
        if args.background_mode == "edge-connected":
            command += edge_connected_commands(crop_width_current, crop_height_current, args.key_tolerance)
        else:
            command += [
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
        "frameCount": args.frames,
        "states": [args.state],
        "frames": frame_entries,
        "anchors": {"default": [round(frame_width / 2), max(0, frame_height - 4)]},
        "provenance": {"sourceLane": "codex", "usage": "source-candidate"},
        "artifacts": {"sheet": sheet_path.name, "previewGif": preview_path.name},
        "source": {
            "input": str(args.input),
            "chromaKey": "#{:02x}{:02x}{:02x}".format(*args.chroma_key),
            "backgroundMode": args.background_mode,
            "sliceMode": args.slice_mode,
            "detectedRuns": detected_runs,
            "grid": {"columns": columns, "rows": rows, "order": "row-major", "mode": args.slice_mode},
            "componentAssignments": component_assignments,
            "crop": {"sourceCellWidth": source_cell_width, "sourceCellHeight": source_cell_height, "cropWidth": crop_width, "cropHeight": crop_height, "cropXOffset": args.crop_x_offset, "cropY": args.crop_y},
            "resizePercent": args.resize_percent,
            "trim": args.trim,
            "note": args.source_note,
        },
    }
    source_job = {}
    if args.source_job:
        if not args.source_job.exists():
            raise SystemExit(f"source job not found: {args.source_job}")
        source_job = json.loads(args.source_job.read_text())
    metadata = {
        "action": args.action or source_job.get("action") or (source_job.get("spriteContext") or {}).get("action"),
        "direction": args.direction or source_job.get("direction"),
        "contentPolicy": args.content_policy or source_job.get("contentPolicy"),
        "anchorPolicy": args.anchor_policy or source_job.get("anchorPolicy"),
    }
    lineage = source_job.get("lineage") if isinstance(source_job.get("lineage"), dict) else {}
    source_ids = list(dict.fromkeys([*lineage.get("sourceIds", []), *args.source_id]))
    if source_job.get("id") and source_job["id"] not in source_ids:
        source_ids.append(source_job["id"])
    if args.source_job or any(metadata.values()) or source_ids:
        manifest["schemaVersion"] = 2
        manifest.update({key: value for key, value in metadata.items() if value})
        manifest["lineage"] = {**lineage, "sourceIds": source_ids}
        manifest["source"]["job"] = str(args.source_job) if args.source_job else None
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
