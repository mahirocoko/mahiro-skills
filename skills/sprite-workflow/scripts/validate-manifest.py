#!/usr/bin/env python3
"""Validate sprite manifests and hash-pinned production artifacts."""
from __future__ import annotations
import argparse, hashlib, json, math, os
from pathlib import Path
from typing import Any

SOURCE_LANES = {"codex", "gemini", "imagegen", "manual", "external-reference"}
USAGE_CHOICES = {"reference-only", "source-candidate", "production-approved"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""): digest.update(chunk)
    return digest.hexdigest()


def pair(value: Any, positive: bool = False) -> bool:
    minimum = 1 if positive else 0
    return isinstance(value, list) and len(value) == 2 and all(isinstance(v, int) and not isinstance(v, bool) and v >= minimum for v in value)


def contained_regular(base: Path, value: Any, label: str) -> Path:
    if not isinstance(value, str) or not value or Path(value).is_absolute(): raise ValueError(f"{label} must be a non-empty relative path")
    raw = base / value
    current = raw
    while current != base.parent:
        if current.is_symlink(): raise ValueError(f"{label} must not use symlinks")
        if current == base: break
        current = current.parent
    resolved = raw.resolve(strict=True)
    if not resolved.is_relative_to(base.resolve()): raise ValueError(f"{label} escapes manifest directory")
    st = resolved.stat()
    if not resolved.is_file() or st.st_nlink != 1: raise ValueError(f"{label} must be a contained regular non-hardlinked file")
    return resolved


def decoded(path: Path, expected: str) -> tuple[int, int]:
    from PIL import Image
    with Image.open(path) as image:
        image.load()
        if image.format != expected: raise ValueError(f"decoded type is {image.format}, expected {expected}")
        return image.size


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try: data = json.loads(path.read_text())
    except Exception as exc: return [f"invalid JSON: {exc}"]
    base = path.resolve().parent
    frame_size = data.get("frameSize")
    if not pair(frame_size, True): errors.append("frameSize must be [positiveInt, positiveInt]")
    states = data.get("states")
    state_set = set(states) if isinstance(states, list) and states and all(isinstance(v, str) and v for v in states) else set()
    if not state_set: errors.append("states must be a non-empty string array")
    frames = data.get("frames")
    if not isinstance(frames, list): errors.append("frames must be an array"); frames = []
    frame_count = data.get("frameCount")
    if frame_count is not None and (not isinstance(frame_count, int) or isinstance(frame_count, bool) or frame_count < 0): errors.append("frameCount must be a non-negative integer when provided")
    elif frame_count is not None and frame_count != len(frames): errors.append(f"frameCount {frame_count} does not match frames length {len(frames)}")
    production = (data.get("provenance") or {}).get("usage") == "production-approved"
    seen_indexes: set[tuple[Any, Any]] = set()
    for i, frame in enumerate(frames):
        if not isinstance(frame, dict): errors.append(f"frames[{i}] must be an object"); continue
        if frame.get("state") not in state_set: errors.append(f"frames[{i}].state must be one of states")
        index = frame.get("index")
        if not isinstance(index, int) or isinstance(index, bool) or index < 0: errors.append(f"frames[{i}].index must be a non-negative integer")
        key = (frame.get("state"), index)
        if key in seen_indexes: errors.append(f"frames[{i}] duplicates state/index")
        seen_indexes.add(key)
        duration = frame.get("durationMs")
        if duration is not None and (not isinstance(duration, int) or isinstance(duration, bool) or duration <= 0): errors.append(f"frames[{i}].durationMs must be positive when provided")
        try:
            artifact = contained_regular(base, frame.get("file"), f"frames[{i}].file")
            if production:
                dims = decoded(artifact, "PNG")
                if frame.get("sha256") != sha256(artifact): errors.append(f"frames[{i}].sha256 mismatch")
                if frame.get("dimensions") != list(dims): errors.append(f"frames[{i}].dimensions mismatch")
        except Exception as exc: errors.append(str(exc))
        anchor = frame.get("anchor")
        if anchor is not None and (not pair(anchor) or not pair(frame_size, True) or anchor[0] >= frame_size[0] or anchor[1] >= frame_size[1]): errors.append(f"frames[{i}].anchor must be within frameSize")
    anchors = data.get("anchors", {})
    if anchors is not None and not isinstance(anchors, dict): errors.append("anchors must be an object")
    elif isinstance(anchors, dict):
        for name, value in anchors.items():
            if not isinstance(name, str) or not pair(value) or not pair(frame_size, True) or value[0] >= frame_size[0] or value[1] >= frame_size[1]: errors.append(f"anchors.{name} must be within frameSize")
    if data.get("schemaVersion") is not None and data.get("schemaVersion") != 2: errors.append("schemaVersion must be 2 when provided")
    for key in ("action", "direction", "contentPolicy", "anchorPolicy"):
        if key in data and (not isinstance(data[key], str) or not data[key]): errors.append(f"{key} must be a non-empty string when provided")
    motion = data.get("motionReference")
    if motion is not None:
        if not isinstance(motion, dict): errors.append("motionReference must be an object")
        else:
            values = [motion.get(k) for k in ("startSeconds", "durationSeconds", "endSeconds")]
            if not all(isinstance(v, (int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in values): errors.append("motionReference times must be finite numbers")
            elif values[0] < 0 or values[1] <= 0 or abs(values[0] + values[1] - values[2]) > 1e-6: errors.append("motionReference bounds are inconsistent")
            if motion.get("humanSelected") is not True: errors.append("motionReference.humanSelected must be true")
    grid = data.get("gridExtraction") or (data.get("source", {}).get("grid") if isinstance(data.get("source"), dict) else None)
    if grid is not None:
        if not isinstance(grid, dict) or grid.get("mode") not in {"fixed","component-grid","component-x-runs"}: errors.append("grid mode is invalid")
        elif any(not isinstance(grid.get(k), int) or isinstance(grid.get(k), bool) or grid[k] <= 0 for k in ("columns","rows")) or grid.get("order") != "row-major": errors.append("grid dimensions/order are invalid")
    provenance = data.get("provenance")
    if not isinstance(provenance, dict): errors.append("provenance must be an object")
    else:
        if provenance.get("sourceLane") not in SOURCE_LANES: errors.append(f"provenance.sourceLane must be one of {sorted(SOURCE_LANES)}")
        if provenance.get("usage") not in USAGE_CHOICES: errors.append(f"provenance.usage must be one of {sorted(USAGE_CHOICES)}")
    artifacts = data.get("artifacts") or {}
    for key, expected in (("sheet", "PNG"), ("previewGif", "GIF")):
        if key in artifacts:
            value = artifacts[key]
            rel = value.get("file") if isinstance(value, dict) else value
            try:
                artifact = contained_regular(base, rel, f"artifacts.{key}")
                if production:
                    dims = decoded(artifact, expected)
                    meta = value if isinstance(value, dict) else {}
                    if meta.get("sha256") != sha256(artifact): errors.append(f"artifacts.{key}.sha256 mismatch")
                    if meta.get("dimensions") != list(dims): errors.append(f"artifacts.{key}.dimensions mismatch")
            except Exception as exc: errors.append(str(exc))
    return errors


def main() -> int:
    p=argparse.ArgumentParser(); p.add_argument("manifest",type=Path); p.add_argument("--json",action="store_true"); a=p.parse_args()
    errors=validate(a.manifest); payload={"ok":not errors,"manifest":str(a.manifest),"errors":errors}
    print(json.dumps(payload,indent=2) if a.json else (f"manifest ok: {a.manifest}" if not errors else "manifest invalid:\n"+"\n".join(f"- {e}" for e in errors)))
    return 0 if not errors else 1
if __name__ == "__main__": raise SystemExit(main())
