#!/usr/bin/env python3
"""Validate a sprite workflow manifest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

SOURCE_LANES = {"codex", "gemini", "imagegen", "manual", "external-reference"}
USAGE_CHOICES = {"reference-only", "source-candidate", "production-approved"}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def is_pair(value: Any) -> bool:
    return isinstance(value, list) and len(value) == 2 and all(isinstance(item, int) and item >= 0 for item in value)


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text())
    except Exception as exc:
        return [f"invalid JSON: {exc}"]

    frame_size = data.get("frameSize")
    if not (isinstance(frame_size, list) and len(frame_size) == 2 and all(isinstance(item, int) and item > 0 for item in frame_size)):
        fail(errors, "frameSize must be [positiveInt, positiveInt]")

    states = data.get("states")
    if not (isinstance(states, list) and states and all(isinstance(item, str) and item for item in states)):
        fail(errors, "states must be a non-empty string array")
        state_set: set[str] = set()
    else:
        state_set = set(states)

    frames = data.get("frames")
    if not isinstance(frames, list):
        fail(errors, "frames must be an array")
        frames = []
    for index, frame in enumerate(frames):
        if not isinstance(frame, dict):
            fail(errors, f"frames[{index}] must be an object")
            continue
        file_value = frame.get("file")
        state_value = frame.get("state")
        frame_index = frame.get("index")
        duration = frame.get("durationMs")
        if not isinstance(file_value, str) or not file_value:
            fail(errors, f"frames[{index}].file must be a non-empty string")
        else:
            frame_path = (path.parent / file_value).resolve()
            if not frame_path.exists():
                fail(errors, f"frames[{index}].file missing: {file_value}")
        if state_set and state_value not in state_set:
            fail(errors, f"frames[{index}].state must be one of states")
        if not isinstance(frame_index, int) or frame_index < 0:
            fail(errors, f"frames[{index}].index must be a non-negative integer")
        if duration is not None and (not isinstance(duration, int) or duration <= 0):
            fail(errors, f"frames[{index}].durationMs must be positive when provided")

    anchors = data.get("anchors", {})
    if anchors is not None:
        if not isinstance(anchors, dict):
            fail(errors, "anchors must be an object")
        else:
            for name, value in anchors.items():
                if not isinstance(name, str) or not is_pair(value):
                    fail(errors, f"anchors.{name} must be [x, y]")

    provenance = data.get("provenance")
    if not isinstance(provenance, dict):
        fail(errors, "provenance must be an object")
    else:
        if provenance.get("sourceLane") not in SOURCE_LANES:
            fail(errors, f"provenance.sourceLane must be one of {sorted(SOURCE_LANES)}")
        if provenance.get("usage") not in USAGE_CHOICES:
            fail(errors, f"provenance.usage must be one of {sorted(USAGE_CHOICES)}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate sprite workflow manifest")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--json", action="store_true", help="Print machine-readable result")
    args = parser.parse_args()
    errors = validate(args.manifest)
    result = {"ok": not errors, "manifest": str(args.manifest), "errors": errors}
    if args.json:
        print(json.dumps(result, indent=2))
    elif errors:
        print("manifest invalid:")
        for error in errors:
            print(f"- {error}")
    else:
        print(f"manifest ok: {args.manifest}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
