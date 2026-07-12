#!/usr/bin/env python3
"""Roll up expected action/direction slots and report source reuse or missing coverage."""
from __future__ import annotations
import argparse, json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Roll up sprite batch coverage")
    parser.add_argument("manifests", nargs="+", type=Path)
    parser.add_argument("--expected", action="append", required=True, help="Expected ACTION:DIRECTION slot (repeatable)")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--error-on-missing", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(); expected = []
    for raw in args.expected:
        if ":" not in raw: raise SystemExit("--expected must use ACTION:DIRECTION")
        expected.append(tuple(raw.split(":", 1)))
    slots = {}; by_source = {}
    for path in args.manifests:
        data = json.loads(path.read_text()); action = data.get("action"); direction = data.get("direction")
        source_ids = (data.get("lineage") or {}).get("sourceIds") or []
        source_id = source_ids[-1] if source_ids else data.get("id") or str(path.resolve())
        if not action or not direction: raise SystemExit(f"{path}: action and direction metadata are required")
        key = f"{action}:{direction}"
        slots.setdefault(key, []).append({"manifest": str(path), "sourceId": source_id})
        by_source.setdefault(source_id, []).append(key)
    missing = [f"{a}:{d}" for a, d in expected if f"{a}:{d}" not in slots]
    duplicates = {key: values for key, values in slots.items() if len(values) > 1}
    reuse = {source: sorted(set(keys)) for source, keys in by_source.items() if len(set(keys)) > 1}
    payload = {"ok": not (args.error_on_missing and missing), "expectedSlots": [f"{a}:{d}" for a, d in expected], "slots": slots, "missingCoverage": missing, "duplicateSlotAssignments": duplicates, "sourceReuse": reuse, "uniqueSourceCount": len(by_source)}
    if args.output: args.output.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2) if args.json else f"missing: {len(missing)}, reused sources: {len(reuse)}")
    return 1 if args.error_on_missing and missing else 0

if __name__ == "__main__": raise SystemExit(main())
