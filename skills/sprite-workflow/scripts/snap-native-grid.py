#!/usr/bin/env python3
"""Recover a bounded native pixel grid from a nearest-neighbor enlarged PNG."""
import argparse, hashlib, json, sys
from pathlib import Path

REVISION = "92173f04a14dfb58081694d8c0351cd1a51ee1a0"
ALGORITHM = "sprite-fusion-pixel-snapper-inspired-block-consensus-v1"


def fail(message, report_path=None, details=None):
    report = {"schemaVersion": 2, "status": "refused", "confidence": "none", "reason": message,
              "algorithm": {"name": ALGORITHM, "upstreamRevision": REVISION, "relationship": "MIT-derived/inspired; not exact Rust parity"}}
    if details: report.update(details)
    if report_path:
        Path(report_path).parent.mkdir(parents=True, exist_ok=True)
        Path(report_path).write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps(report, sort_keys=True), file=sys.stderr)
    return 2


def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def candidate(image, scale):
    width, height = image.size
    pixels = image.load(); total = exact = 0; agreement = 0.0; recovered = []
    for y in range(0, height, scale):
        row = []
        for x in range(0, width, scale):
            counts = {}
            for yy in range(y, y + scale):
                for xx in range(x, x + scale):
                    value = pixels[xx, yy]; counts[value] = counts.get(value, 0) + 1
            value, count = sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0]
            cells = scale * scale; agreement += count / cells; total += 1; exact += count == cells; row.append(value)
        recovered.append(row)
    return {"scale": scale, "agreement": agreement / total, "exactCellRatio": exact / total, "pixels": recovered}


def main():
    parser = argparse.ArgumentParser(description="Inspect or recover a native square pixel grid without overwriting the source.")
    parser.add_argument("input"); parser.add_argument("--mode", choices=["inspect", "explicit", "auto"], default="inspect")
    parser.add_argument("--grid-size", type=int, help="Integer enlargement factor for explicit mode")
    parser.add_argument("--output"); parser.add_argument("--report", required=True)
    args = parser.parse_args()
    try:
        from PIL import Image
    except ImportError:
        return fail("Pillow is required: install it with `python3 -m pip install Pillow`.", args.report)
    source_raw = Path(args.input); report_path = Path(args.report).resolve()
    if not source_raw.is_file() or source_raw.is_symlink() or source_raw.stat().st_nlink != 1: return fail("input must be a regular non-symlink, non-hardlinked file", report_path)
    source = source_raw.resolve(); output_requested = Path(args.output).resolve() if args.output else None
    if report_path == source or output_requested == source or (output_requested and output_requested == report_path): return fail("source/report/output collisions are forbidden", None)
    if report_path.exists() and (report_path.is_symlink() or report_path.stat().st_nlink != 1): return fail("report must not overwrite symlink/hardlink", None)
    if output_requested and output_requested.exists() and (output_requested.is_symlink() or output_requested.stat().st_nlink != 1): return fail("output must not overwrite symlink/hardlink", report_path)
    try: image = Image.open(source); image.load()
    except Exception as error: return fail(f"input is not a readable PNG: {error}", report_path)
    if image.format != "PNG": return fail("only PNG input is supported", report_path)
    if image.width != image.height: return fail("mixed/non-square input is outside stable scope", report_path)
    rgba = image.convert("RGBA"); alphas = {pixel[3] for pixel in rgba.getdata()}
    if not alphas.issubset({0, 255}): return fail("continuous alpha is outside stable binary-alpha/opaque scope", report_path)
    colors = set(rgba.getdata())
    if len(colors) > min(256, image.width * image.height // 3): return fail("continuous-tone/high-color input is outside stable scope", report_path)
    scales = [n for n in range(2, min(16, image.width) + 1) if image.width % n == 0]
    results = [candidate(rgba, n) for n in scales]
    if args.mode == "explicit":
        if not args.grid_size or args.grid_size < 2 or image.width % args.grid_size:
            return fail("explicit mode requires --grid-size >= 2 that divides both axes", report_path)
        chosen = next((item for item in results if item["scale"] == args.grid_size), None)
    else:
        qualified = [item for item in results if item["agreement"] >= .995 and item["exactCellRatio"] >= .95]
        perfect = [item for item in qualified if item["agreement"] == 1 and item["exactCellRatio"] == 1]
        if len(perfect) > 1:
            return fail("ambiguous nested/solid integer scales; use explicit mode", report_path, {"candidates": [{k: item[k] for k in ("scale", "agreement", "exactCellRatio")} for item in results]})
        chosen = max(qualified, key=lambda item: (item["scale"], item["exactCellRatio"], item["agreement"]), default=None)
    summaries = [{k: round(item[k], 6) if isinstance(item[k], float) else item[k] for k in ("scale", "agreement", "exactCellRatio")} for item in results]
    if not chosen or chosen["agreement"] < .995 or chosen["exactCellRatio"] < .95:
        return fail("fallback-only or low-confidence grid evidence; refusing recovery", report_path, {"candidates": summaries})
    confidence = "high" if chosen["agreement"] == 1 and chosen["exactCellRatio"] == 1 else "acceptable"
    output = output_requested
    if args.mode != "inspect" and not output: return fail("recovery mode requires --output", report_path)
    if output and output.exists() and output.samefile(source): return fail("source overwrite or hard-link overwrite is forbidden", report_path)
    cuts = {"source": [0, 0, image.width, image.height], "cell": [chosen["scale"], chosen["scale"]], "nativeDimensions": [image.width // chosen["scale"], image.height // chosen["scale"]]}
    report = {"schemaVersion": 2, "status": "inspected" if args.mode == "inspect" else "recovered", "mode": args.mode,
              "confidence": confidence, "source": {"path": str(source), "sha256": digest(source), "dimensions": list(image.size)},
              "cuts": cuts, "selectedScale": chosen["scale"], "agreement": chosen["agreement"], "exactCellRatio": chosen["exactCellRatio"],
              "candidates": summaries, "algorithm": {"name": ALGORITHM, "upstreamRevision": REVISION, "relationship": "MIT-derived/inspired; not exact Rust parity"}, "output": None}
    if args.mode != "inspect":
        native = Image.new("RGBA", tuple(cuts["nativeDimensions"])); native.putdata([p for row in chosen["pixels"] for p in row])
        output.parent.mkdir(parents=True, exist_ok=True); native.save(output, format="PNG", optimize=False, compress_level=9)
        report["output"] = {"path": str(output), "sha256": digest(output), "dimensions": list(native.size)}
    report_path.parent.mkdir(parents=True, exist_ok=True); report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps(report, sort_keys=True)); return 0

if __name__ == "__main__": raise SystemExit(main())
