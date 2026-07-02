#!/usr/bin/env python3
"""Pick a best candidate from qa-sprite-sheet JSON reports."""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def score_report(path: Path) -> tuple[float, dict]:
    data = json.loads(path.read_text())
    failures = data.get("failures") or []
    warnings = data.get("warnings") or []
    frames = data.get("frames") or []
    score = 1000.0
    score -= len(failures) * 500
    score -= len(warnings) * 35
    score -= sum(float(frame.get("magentaResidue", 0) or 0) for frame in frames) * 0.2
    if data.get("ok"):
        score += 250
    return score, data


def main() -> int:
    parser = argparse.ArgumentParser(description="Score candidate QA JSON reports and select a winner")
    parser.add_argument("reports", nargs="+", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    ranked = []
    for report in args.reports:
        if not report.exists():
            raise SystemExit(f"report not found: {report}")
        score, data = score_report(report)
        ranked.append({"report": str(report), "score": score, "ok": bool(data.get("ok")), "warningCount": len(data.get("warnings") or []), "failureCount": len(data.get("failures") or [])})
    ranked.sort(key=lambda item: item["score"], reverse=True)
    payload = {"ok": bool(ranked), "winner": ranked[0] if ranked else None, "ranked": ranked}
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(payload, indent=2) + "\n")
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        winner = payload["winner"]
        if winner:
            print(f"winner: {winner['report']} score={winner['score']:.1f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
