#!/usr/bin/env python3
"""Promote validated sprite artifacts into a target directory with provenance gates."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


def run_validator(manifest: Path) -> None:
    validator = Path(__file__).with_name("validate-manifest.py")
    result = subprocess.run([sys.executable, str(validator), str(manifest)], text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stdout + result.stderr)


def copy_file(src: Path, dest: Path, dry_run: bool) -> None:
    print(f"{'would copy' if dry_run else 'copy'} {src} -> {dest}")
    if not dry_run:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


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

    manifest_dir = args.manifest.parent
    target_dir = args.target_dir.expanduser().resolve()
    copy_file(args.manifest, target_dir / "manifest.json", dry_run)
    for frame in data.get("frames", []):
        if not isinstance(frame, dict) or not frame.get("file"):
            continue
        rel = Path(str(frame["file"]))
        copy_file(manifest_dir / rel, target_dir / rel, dry_run)
    for optional in ["contact-sheet.html", "preview.gif", "qa-report.md"]:
        src = manifest_dir / optional
        if src.exists():
            copy_file(src, target_dir / optional, dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
