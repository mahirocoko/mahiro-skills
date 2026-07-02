#!/usr/bin/env python3
"""Summarize per-frame center and alpha-bounds jitter from qa-sprite-sheet reports."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def numeric_range(values: list[float]) -> float:
    return max(values) - min(values) if values else 0.0


def neighbor_deltas(values: list[float]) -> list[float]:
    return [round(abs(values[index] - values[index - 1]), 3) for index in range(1, len(values))]


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a motion jitter report from qa-sprite-sheet JSON")
    parser.add_argument("qa_report", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--max-center-delta", type=float, default=2.0)
    parser.add_argument("--max-bounds-x-delta", type=float, default=3.0)
    parser.add_argument("--max-bounds-width-delta", type=float, default=3.0)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not args.qa_report.exists():
        raise SystemExit(f"qa report not found: {args.qa_report}")
    data = json.loads(args.qa_report.read_text())
    frames = data.get("frames", [])
    centers: list[float] = []
    bounds_x: list[float] = []
    bounds_y: list[float] = []
    bounds_width: list[float] = []
    bounds_height: list[float] = []
    for frame in frames:
        if isinstance(frame.get("centerX"), (int, float)):
            centers.append(float(frame["centerX"]))
        bounds = frame.get("bounds") if isinstance(frame.get("bounds"), dict) else {}
        for key, bucket in (("x", bounds_x), ("y", bounds_y), ("width", bounds_width), ("height", bounds_height)):
            value = bounds.get(key)
            if isinstance(value, (int, float)):
                bucket.append(float(value))

    center_deltas = neighbor_deltas(centers)
    x_deltas = neighbor_deltas(bounds_x)
    width_deltas = neighbor_deltas(bounds_width)
    risky: list[dict[str, object]] = []
    for index, delta in enumerate(center_deltas, start=1):
        if delta > args.max_center_delta:
            risky.append({"between": [index - 1, index], "metric": "centerX", "delta": delta})
    for index, delta in enumerate(x_deltas, start=1):
        if delta > args.max_bounds_x_delta:
            risky.append({"between": [index - 1, index], "metric": "bounds.x", "delta": delta})
    for index, delta in enumerate(width_deltas, start=1):
        if delta > args.max_bounds_width_delta:
            risky.append({"between": [index - 1, index], "metric": "bounds.width", "delta": delta})

    payload = {
        "ok": len(risky) == 0,
        "source": str(args.qa_report),
        "ranges": {
            "centerX": round(numeric_range(centers), 3),
            "boundsX": round(numeric_range(bounds_x), 3),
            "boundsY": round(numeric_range(bounds_y), 3),
            "boundsWidth": round(numeric_range(bounds_width), 3),
            "boundsHeight": round(numeric_range(bounds_height), 3),
        },
        "neighborDeltas": {
            "centerX": center_deltas,
            "boundsX": x_deltas,
            "boundsWidth": width_deltas,
        },
        "riskyTransitions": risky,
        "notes": "Use this as a jitter warning, not final visual approval. Inspect preview GIF and adjacent-frame zooms.",
    }
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2) + "\n")
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print("motion jitter ok" if payload["ok"] else "motion jitter risk")
        print(json.dumps(payload["ranges"], indent=2))
        for risk in risky:
            print(f"risk: frames {risk['between']} {risk['metric']} delta {risk['delta']}")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
