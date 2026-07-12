#!/usr/bin/env python3
"""Promote validated sprite artifacts into a target directory with provenance gates."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def run_validator(manifest: Path) -> None:
    validator = Path(__file__).with_name("validate-manifest.py")
    result = subprocess.run([sys.executable, str(validator), str(manifest)], text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stdout + result.stderr)


def contained_regular(base: Path, value: str, label: str) -> tuple[Path, Path]:
    relative = Path(value)
    if not value or relative.is_absolute():
        raise SystemExit(f"{label} must be a non-empty relative path")
    raw = base / relative
    if raw.is_symlink():
        raise SystemExit(f"{label} must not be a symlink")
    resolved = raw.resolve(strict=True)
    if not resolved.is_relative_to(base.resolve()) or not resolved.is_file() or resolved.stat().st_nlink != 1:
        raise SystemExit(f"{label} must be a contained regular non-hardlinked file")
    return resolved, relative


def main() -> int:
    parser = argparse.ArgumentParser(description="Promote sprite artifacts after validation and approval")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--target-dir", type=Path, required=True)
    parser.add_argument("--approve", action="store_true", help="Required for actual copy")
    parser.add_argument("--dry-run", action="store_true", help="Show copy plan without copying")
    parser.add_argument("--allow-source-candidate", action="store_true", help="Allow source-candidate promotion after explicit approval")
    args = parser.parse_args()

    dry_run = args.dry_run or not args.approve
    run_validator(args.manifest)
    data = json.loads(args.manifest.read_text())
    provenance = data.get("provenance") or {}
    usage = provenance.get("usage")
    if usage != "production-approved" and not (usage == "source-candidate" and args.allow_source_candidate):
        raise SystemExit(f"refusing promotion: provenance.usage={usage!r} is not production-approved")
    if not args.approve and not args.dry_run:
        raise SystemExit("promotion requires --approve or --dry-run")

    manifest_path = args.manifest.resolve()
    manifest_dir = manifest_path.parent
    target_dir = args.target_dir.expanduser().resolve()
    if target_dir.exists():
        raise SystemExit("target directory already exists; atomic promotion requires a new directory")
    copies: list[tuple[Path, Path]] = [(manifest_path, Path("manifest.json"))]
    for frame in data.get("frames", []):
        if not isinstance(frame, dict) or not frame.get("file"):
            continue
        copies.append(contained_regular(manifest_dir, str(frame["file"]), "frame file"))
    for optional in ["contact-sheet.html", "preview.gif", "qa-report.md"]:
        src = manifest_dir / optional
        if src.exists():
            copies.append(contained_regular(manifest_dir, optional, optional))
    for source, relative in copies:
        print(f"{'would copy' if dry_run else 'copy'} {source} -> {target_dir / relative}")
    if dry_run:
        return 0
    target_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".sprite-promote-", dir=target_dir.parent) as raw:
        stage = Path(raw) / "publish"
        stage.mkdir()
        for source, relative in copies:
            destination = stage / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
        stage.rename(target_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
