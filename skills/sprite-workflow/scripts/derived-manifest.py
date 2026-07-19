#!/usr/bin/env python3
"""Shared helpers for safe derived sprite manifests."""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path
from typing import Any


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy_native_review(manifest: dict[str, Any], source_base: Path, output_base: Path) -> None:
    review = (manifest.get("reviews") or {}).get("nativePreNormalization")
    if not isinstance(review, dict):
        return
    copied = json.loads(json.dumps(review))
    for key in ("reviewArtifact", "evidence"):
        item = copied.get(key)
        if not isinstance(item, dict) or not isinstance(item.get("file"), str):
            raise SystemExit(f"reviews.nativePreNormalization.{key}.file is required")
        source = (source_base / item["file"]).resolve(strict=True)
        if not source.is_relative_to(source_base.resolve()) or source.is_symlink() or not source.is_file() or source.stat().st_nlink != 1:
            raise SystemExit(f"native review {key} must be a contained regular non-hardlinked file")
        if sha256(source) != item.get("sha256"):
            raise SystemExit(f"native review {key} hash mismatch")
        target = output_base / source.name
        if target.exists():
            raise SystemExit(f"native review target collision: {target.name}")
        shutil.copy2(source, target)
        item["file"] = target.name
        item["sha256"] = sha256(target)
    manifest.setdefault("reviews", {})["nativePreNormalization"] = copied


def copy_provider_sources(manifest: dict[str, Any], source_base: Path, output_base: Path) -> None:
    provenance = manifest.get("provenance")
    receipt = provenance.get("providerReceipt") if isinstance(provenance, dict) else None
    if not isinstance(receipt, dict):
        return
    artifacts = receipt.get("sourceArtifacts")
    if not isinstance(artifacts, list) or not artifacts:
        raise SystemExit("provenance.providerReceipt.sourceArtifacts is required")
    raw_dir = output_base / "raw-generated"
    raw_dir.mkdir(exist_ok=True)
    copied = []
    for index, item in enumerate(artifacts):
        if not isinstance(item, dict) or not isinstance(item.get("file"), str):
            raise SystemExit(f"providerReceipt.sourceArtifacts[{index}].file is required")
        raw = source_base / item["file"]
        if raw.is_symlink():
            raise SystemExit(f"provider source {index} must not be a symlink")
        source = raw.resolve(strict=True)
        if not source.is_relative_to(source_base.resolve()) or not source.is_file() or source.stat().st_nlink != 1:
            raise SystemExit(f"provider source {index} must be a contained regular non-hardlinked file")
        if sha256(source) != item.get("sha256"):
            raise SystemExit(f"provider source {index} hash mismatch")
        suffix = source.suffix.lower() or ".bin"
        target = raw_dir / f"source-{index:04d}{suffix}"
        if target.exists():
            raise SystemExit(f"provider source target collision: {target.name}")
        shutil.copy2(source, target)
        copied.append({**item, "file": f"raw-generated/{target.name}", "sha256": sha256(target)})
    provenance["providerReceipt"] = {**receipt, "sourceArtifacts": copied}


def rewrite_frames(manifest: dict[str, Any], frame_paths: list[Path], frame_size: tuple[int, int]) -> None:
    source_frames = manifest.get("frames") if isinstance(manifest.get("frames"), list) else []
    states = manifest.get("states") if isinstance(manifest.get("states"), list) and manifest.get("states") else ["animation"]
    rewritten = []
    for index, frame_path in enumerate(frame_paths):
        source = source_frames[index] if index < len(source_frames) and isinstance(source_frames[index], dict) else {}
        rewritten.append({
            **source,
            "file": f"frames/{frame_path.name}",
            "state": source.get("state") if source.get("state") in states else states[0],
            "index": source.get("index") if isinstance(source.get("index"), int) else index,
            "sha256": sha256(frame_path),
            "dimensions": list(frame_size),
        })
    manifest["states"] = states
    manifest["frames"] = rewritten
    manifest["frameCount"] = len(rewritten)


def artifact(path: Path, dimensions: tuple[int, int]) -> dict[str, Any]:
    return {"file": path.name, "sha256": sha256(path), "dimensions": list(dimensions)}
