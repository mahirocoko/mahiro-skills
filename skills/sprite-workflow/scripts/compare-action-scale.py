#!/usr/bin/env python3
"""Compare median body scale across action QA reports (warning-first)."""
from __future__ import annotations
import argparse, json, statistics
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare cross-action median body scale")
    parser.add_argument("reports", nargs="+", type=Path)
    parser.add_argument("--max-ratio-delta", type=float, default=0.10, help="Allowed fractional delta from cohort median")
    parser.add_argument("--exclude", action="append", default=[], help="Explicit action id exclusion (repeatable)")
    parser.add_argument("--error-on-warning", action="store_true")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    entries = []; excluded = []
    for path in args.reports:
        data = json.loads(path.read_text()); action = data.get("action") or path.stem
        if action in args.exclude:
            excluded.append({"action": action, "report": str(path), "reason": "explicit --exclude"}); continue
        heights = [float(frame["bounds"]["height"]) for frame in data.get("frames", []) if isinstance(frame.get("bounds"), dict) and isinstance(frame["bounds"].get("height"), (int, float))]
        if not heights: raise SystemExit(f"{path}: no measurable frame bounds")
        entries.append({"action": action, "report": str(path), "medianHeight": statistics.median(heights)})
    if len(entries) < 2: raise SystemExit("at least two non-excluded action reports are required")
    cohort = statistics.median(item["medianHeight"] for item in entries); warnings = []
    for item in entries:
        item["ratioToCohort"] = round(item["medianHeight"] / cohort, 4) if cohort else 0
        delta = abs(item["medianHeight"] - cohort) / cohort if cohort else 0
        if delta > args.max_ratio_delta: warnings.append(f"{item['action']}: median scale delta {delta:.1%} exceeds {args.max_ratio_delta:.1%}")
    payload = {"ok": not (args.error_on_warning and warnings), "warningFirst": True, "cohortMedianHeight": cohort, "actions": entries, "exclusions": excluded, "warnings": warnings}
    if args.output: args.output.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2) if args.json else "\n".join(warnings or ["action scale comparison ok"]))
    return 1 if args.error_on_warning and warnings else 0

if __name__ == "__main__": raise SystemExit(main())
