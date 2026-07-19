#!/usr/bin/env python3
"""Bottom-align transparent frames using integer translation only, refusing clipping."""
from __future__ import annotations
import argparse, importlib.util, json, shutil, subprocess, tempfile
from pathlib import Path

HELPER_PATH = Path(__file__).with_name("derived-manifest.py")
SPEC = importlib.util.spec_from_file_location("sprite_derived_manifest", HELPER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load derived manifest helper")
HELPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HELPER)


def parse_size(value: str) -> tuple[int, int]:
    try:
        width, height = (int(part) for part in value.lower().replace("×", "x").split("x", 1))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected WIDTHxHEIGHT") from exc
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("dimensions must be positive")
    return width, height


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate: return candidate
    raise SystemExit("ImageMagick 'magick' is required for bottom-align-frames.py")


def run(command: list[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode: raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def bounds(magick: str, image: Path):
    text = run([magick, str(image), "-alpha", "extract", "-trim", "-format", "%w %h %X %Y", "info:"]).stdout.strip()
    if not text: return None
    width, height, x, y = map(int, text.split())
    return (width, height, x, y) if width > 0 and height > 0 else None


def safe_name(value: str, label: str) -> str:
    if not value or Path(value).name != value or value in {".", ".."}: raise SystemExit(f"{label} must be a safe basename")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description="Bottom-align sprite frames without resampling")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--frames", required=True, type=int)
    parser.add_argument("--frame-size", required=True, type=parse_size)
    parser.add_argument("--target-bottom-y", type=int, default=None, help="Exclusive alpha bottom coordinate; defaults to median")
    parser.add_argument("--max-shift", type=int, default=16)
    parser.add_argument("--source-manifest", type=Path, default=None)
    parser.add_argument("--sheet-name", default="sprite-sheet.png")
    parser.add_argument("--manifest-name", default="manifest.json")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    if args.frames <= 0 or args.max_shift < 0: raise SystemExit("frames must be positive and max-shift non-negative")
    if not args.input.is_file() or args.input.is_symlink() or args.input.stat().st_nlink != 1: raise SystemExit("input must be a regular non-symlink, non-hardlinked file")
    safe_name(args.sheet_name, "--sheet-name"); safe_name(args.manifest_name, "--manifest-name")
    if args.source_manifest and (not args.source_manifest.is_file() or args.source_manifest.is_symlink() or args.source_manifest.stat().st_nlink != 1): raise SystemExit("source manifest must be a regular non-symlink, non-hardlinked file")
    args.output_dir = args.output_dir.resolve()
    if args.input.resolve().is_relative_to(args.output_dir): raise SystemExit("input/output self-overwrite is forbidden")
    if args.output_dir.exists(): raise SystemExit("output directory must not already exist")
    magick = magick_bin(); fw, fh = args.frame_size
    args.output_dir.parent.mkdir(parents=True, exist_ok=True)
    measurements = []
    with tempfile.TemporaryDirectory(prefix="sprite-bottom-", dir=args.output_dir.parent) as raw:
        stage = Path(raw) / "publish"; stage.mkdir()
        frames_dir = stage / "frames"; frames_dir.mkdir()
        temp = Path(raw) / "work"; temp.mkdir()
        for index in range(args.frames):
            frame = temp / f"source-{index:02d}.png"
            run([magick, str(args.input), "-crop", f"{fw}x{fh}+{index * fw}+0", "+repage", str(frame)])
            measured = bounds(magick, frame)
            if measured is None: raise SystemExit(f"frame {index}: blank alpha; refusing alignment")
            width, height, x, y = measured
            measurements.append({"index": index, "frame": frame, "bounds": measured, "bottomYBefore": y + height})
        bottoms = sorted(int(item["bottomYBefore"]) for item in measurements)
        target = args.target_bottom_y if args.target_bottom_y is not None else bottoms[len(bottoms) // 2]
        shifts = []
        for item in measurements:
            index = int(item["index"]); width, height, x, y = item["bounds"]
            dy = int(target - int(item["bottomYBefore"]))
            if abs(dy) > args.max_shift: raise SystemExit(f"frame {index}: required shift {dy}px exceeds --max-shift {args.max_shift}")
            if x < 0 or x + width > fw or y + dy < 0 or y + height + dy > fh:
                raise SystemExit(f"frame {index}: translation dy={dy} would clip alpha; refusing alignment")
            out = frames_dir / f"frame-{index:02d}.png"
            run([magick, "-size", f"{fw}x{fh}", "xc:none", str(item["frame"]), "-geometry", f"+0{dy:+d}", "-compose", "over", "-composite", str(out)])
            shifts.append({"index": index, "bottomYBefore": item["bottomYBefore"], "bottomYAfter": target, "dx": 0, "dy": dy, "translationOnly": True})
        sheet = stage / args.sheet_name
        run([magick, *[str(frames_dir / f"frame-{i:02d}.png") for i in range(args.frames)], "+append", str(sheet)])
        manifest = json.loads(args.source_manifest.read_text()) if args.source_manifest else {"frameSize": [fw, fh], "states": ["animation"], "frames": []}
        frame_paths = [frames_dir / f"frame-{i:02d}.png" for i in range(args.frames)]
        HELPER.rewrite_frames(manifest, frame_paths, (fw, fh))
        manifest["artifacts"] = {"sheet": HELPER.artifact(sheet, (fw * args.frames, fh))}
        if args.source_manifest:
            HELPER.copy_native_review(manifest, args.source_manifest.resolve().parent, stage)
            HELPER.copy_provider_sources(manifest, args.source_manifest.resolve().parent, stage)
        lineage = manifest.setdefault("lineage", {})
        lineage["normalization"] = {"kind": "bottom-align", "sourceManifest": str(args.source_manifest.resolve()) if args.source_manifest else None, "translationOnly": True, "shifts": shifts}
        manifest.setdefault("schemaVersion", 2)
        manifest_path = stage / args.manifest_name; manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
        stage.rename(args.output_dir)
    sheet = args.output_dir / args.sheet_name
    manifest_path = args.output_dir / args.manifest_name
    payload = {"ok": True, "sheet": str(sheet), "manifest": str(manifest_path), "targetBottomY": target, "shifts": shifts}
    print(json.dumps(payload, indent=2) if args.json else f"sheet: {sheet}")
    return 0

if __name__ == "__main__": raise SystemExit(main())
