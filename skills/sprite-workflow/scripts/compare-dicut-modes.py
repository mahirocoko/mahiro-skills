#!/usr/bin/env python3
"""Run multiple dicut extraction modes and write a comparison report."""
from __future__ import annotations

import argparse
import json
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
        width = int(left)
        height = int(right)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected integer WIDTHxHEIGHT") from exc
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("dimensions must be positive")
    return width, height


def script_dir() -> Path:
    return Path(__file__).resolve().parent


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate:
        return candidate
    for path in ("/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        if Path(path).exists():
            return path
    raise SystemExit("ImageMagick 'magick' is required for compare-dicut-modes.py")


def run(command: Iterable[str], *, allow_fail: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0 and not allow_fail:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def validate_basename(option: str, value: str) -> str:
    if not value or Path(value).name != value or value in {".", ".."}:
        raise SystemExit(f"{option} must be a plain output basename")
    return value


def mode_args(mode: str) -> list[str]:
    if mode == "edge-connected":
        return ["--background-mode", "edge-connected", "--spill", "none"]
    if mode == "spill":
        return ["--background-mode", "color-distance", "--spill", "magenta"]
    raise SystemExit(f"unknown mode: {mode}")


def score_report(qa: dict, manifest: dict) -> float:
    score = 1000.0
    score += 180.0 if qa.get("ok") else -500.0
    score -= 80.0 * len(qa.get("failures", []))
    score -= 18.0 * len(qa.get("warnings", []))
    frames = qa.get("frames", [])
    residues = [frame.get("magentaResidue", 0) or 0 for frame in frames]
    score -= min(sum(residues) / 25.0, 120.0)
    centers = [frame.get("centerX") for frame in frames if isinstance(frame.get("centerX"), (int, float))]
    if centers:
        score -= (max(centers) - min(centers)) * 2
    detected = manifest.get("source", {}).get("detectedRuns")
    if detected:
        score += 12.0
    if manifest.get("source", {}).get("backgroundMode") == "edge-connected":
        score += 8.0
    if manifest.get("source", {}).get("backgroundMode") == "color-distance" and manifest.get("source", {}).get("sliceMode") == "component-x-runs":
        score += 2.0
    return round(score, 3)


def select_winner(ranked: list[dict], spill_win_margin: float) -> tuple[dict | None, str]:
    ok_items = [item for item in ranked if item.get("ok")]
    if not ok_items:
        return (ranked[0] if ranked else None), "no cleanup mode passed QA; top ranked failure is reported for diagnostics"
    by_mode = {item.get("mode"): item for item in ok_items}
    edge = by_mode.get("edge-connected")
    spill = by_mode.get("spill")
    if edge and spill:
        score_delta = float(spill.get("score", 0)) - float(edge.get("score", 0))
        if score_delta > spill_win_margin:
            return spill, f"spill exceeded edge-connected by {score_delta:.2f}, above margin {spill_win_margin:.2f}; verify detail preservation visually"
        return edge, f"edge-connected is the safer default for fur/fine edges and pink/magenta details; spill delta {score_delta:.2f} did not exceed margin {spill_win_margin:.2f}"
    if edge:
        return edge, "only edge-connected passed QA; safer default selected"
    if spill:
        return spill, "spill passed but edge-connected did not; inspect pink/detail loss before promotion"
    return ok_items[0], "selected first QA-passing mode"


def write_markdown(path: Path, payload: dict) -> None:
    lines = ["# Dicut Mode Comparison", ""]
    winner = payload.get("winner")
    lines += [f"Recommended winner: `{winner['mode']}`" if winner else "Recommended winner: none", ""]
    if payload.get("winnerReason"):
        lines += [f"Reason: {payload['winnerReason']}", ""]
    lines += ["| mode | ok | score | warnings | failures | output |", "| --- | --- | ---: | ---: | ---: | --- |"]
    for item in payload["ranked"]:
        lines.append(f"| {item['mode']} | {item['ok']} | {item['score']} | {item['warningCount']} | {item['failureCount']} | `{item['outputDir']}` |")
    lines += [
        "",
        "## Notes",
        "",
        "This report compares mechanical cleanup modes only. Visual honesty review is still required before promotion.",
        "Edge-connected is the safe default for fur/fine edges or subjects with pink/magenta details near a magenta key.",
        "Spill cleanup can reduce purple fringe, but it may erase real pink detail; only prefer it when it is clearly better across light, dark, and checker previews.",
        "Do not choose by dark preview alone; compare light, dark, checker, and source detail preservation.",
        "",
    ]
    path.write_text("\n".join(lines))


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare dicut extraction modes for one generated sprite sheet")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--frames", type=int, required=True)
    parser.add_argument("--frame-size", type=parse_size, required=True)
    parser.add_argument("--chroma-key", default="#ff00ff")
    parser.add_argument("--key-tolerance", default="0.16")
    parser.add_argument("--resize-percent", default="100")
    parser.add_argument("--slice-mode", choices=["fixed", "component-x-runs", "component-grid"], default="component-x-runs")
    parser.add_argument("--source-columns", type=int, default=0)
    parser.add_argument("--source-rows", type=int, default=0)
    parser.add_argument("--source-layout", choices=["horizontal", "grid"], default="horizontal")
    parser.add_argument("--component-run-padding", default="8")
    parser.add_argument("--component-min-body-area", default="0")
    parser.add_argument("--component-center-confidence", default="0.45")
    parser.add_argument("--component-overflow-distance", default="0")
    parser.add_argument("--gravity", default="center")
    parser.add_argument("--state", default="animation")
    parser.add_argument("--sheet-name", default="sprite-sheet.png")
    parser.add_argument("--preview-name", default="preview.gif")
    parser.add_argument("--duration-ms", default="90")
    parser.add_argument("--final-duration-ms", default="160")
    parser.add_argument("--max-magenta-residue", default="220")
    parser.add_argument("--spill-win-margin", type=float, default=24.0, help="Spill must exceed edge-connected score by this much before it becomes the recommended winner when both pass QA.")
    parser.add_argument("--mode", action="append", choices=["edge-connected", "spill"], help="Mode to run; defaults to both")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.frames <= 0:
        raise SystemExit("--frames must be positive")
    if not args.input.exists():
        raise SystemExit(f"input not found: {args.input}")

    magick_bin()
    validate_basename("--sheet-name", args.sheet_name)
    validate_basename("--preview-name", args.preview_name)
    out_root = args.output_dir
    if out_root.exists() and (not out_root.is_dir() or any(out_root.iterdir())):
        raise SystemExit(f"output directory must be absent or empty: {out_root}")
    out_root.mkdir(parents=True, exist_ok=True)
    modes = args.mode or ["edge-connected", "spill"]
    results = []
    scripts = script_dir()
    frame_size = f"{args.frame_size[0]}x{args.frame_size[1]}"

    for mode in modes:
        mode_dir = out_root / mode
        extract_command = [
            "python3", str(scripts / "extract-chroma-sheet.py"),
            "--input", str(args.input),
            "--output-dir", str(mode_dir),
            "--frames", str(args.frames),
            "--frame-size", frame_size,
            "--chroma-key", args.chroma_key,
            "--key-tolerance", str(args.key_tolerance),
            "--slice-mode", args.slice_mode,
            "--source-layout", args.source_layout,
            "--source-columns", str(args.source_columns),
            "--source-rows", str(args.source_rows),
            "--component-run-padding", str(args.component_run_padding),
            "--component-min-body-area", str(args.component_min_body_area),
            "--component-center-confidence", str(args.component_center_confidence),
            "--component-overflow-distance", str(args.component_overflow_distance),
            "--resize-percent", str(args.resize_percent),
            "--trim",
            "--gravity", args.gravity,
            "--state", args.state,
            "--sheet-name", args.sheet_name,
            "--preview-name", args.preview_name,
            "--duration-ms", str(args.duration_ms),
            "--final-duration-ms", str(args.final_duration_ms),
            "--source-note", f"compare-dicut-modes {mode}",
            "--json",
            *mode_args(mode),
        ]
        extracted = run(extract_command, allow_fail=True)
        if extracted.returncode != 0:
            results.append({
                "mode": mode,
                "ok": False,
                "score": -999.0,
                "warningCount": 0,
                "failureCount": 1,
                "outputDir": str(mode_dir),
                "error": (extracted.stderr or extracted.stdout).strip(),
            })
            continue
        sheet = mode_dir / args.sheet_name
        run(["python3", str(scripts / "make-qa-previews.py"), str(sheet), "--output-dir", str(mode_dir), "--json"])
        qa_path = mode_dir / "qa.json"
        run([
            "python3", str(scripts / "qa-sprite-sheet.py"), str(sheet),
            "--frames", str(args.frames),
            "--frame-size", frame_size,
            "--preserve-right-appendage",
            "--target-center-x", str(round(args.frame_size[0] / 2)),
            "--max-center-drift", "8",
            "--max-center-range", "12",
            "--max-magenta-residue", str(args.max_magenta_residue),
            "--max-bounds-x-range", "4",
            "--max-bounds-width-range", "4",
            "--report", str(qa_path),
            "--json",
        ], allow_fail=True)
        qa = read_json(qa_path)
        manifest = read_json(mode_dir / "manifest.json")
        results.append({
            "mode": mode,
            "ok": bool(qa.get("ok")),
            "score": score_report(qa, manifest),
            "warningCount": len(qa.get("warnings", [])),
            "failureCount": len(qa.get("failures", [])),
            "outputDir": str(mode_dir),
            "sheet": str(sheet),
            "previewLight": str(mode_dir / "preview-light.png"),
            "previewDark": str(mode_dir / "preview-dark.png"),
            "previewChecker": str(mode_dir / "preview-checker.png"),
            "qa": str(qa_path),
            "manifest": str(mode_dir / "manifest.json"),
        })

    ranked = sorted(results, key=lambda item: item["score"], reverse=True)
    winner, winner_reason = select_winner(ranked, args.spill_win_margin)
    payload = {"ok": bool(winner and winner.get("ok")), "winner": winner, "winnerReason": winner_reason, "ranked": ranked}
    (out_root / "compare-dicut-modes.json").write_text(json.dumps(payload, indent=2) + "\n")
    write_markdown(out_root / "compare-dicut-modes.md", payload)
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"winner: {winner['mode'] if winner else 'none'}")
        print(f"report: {out_root / 'compare-dicut-modes.md'}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
