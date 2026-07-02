#!/usr/bin/env python3
"""Promote a sprite sheet, preview GIF, and named manifest into a flat asset directory."""
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
    parser = argparse.ArgumentParser(description="Promote approved sprite artifacts with explicit asset-name filenames")
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--target-dir", type=Path, required=True)
    parser.add_argument("--asset-name", required=True)
    parser.add_argument("--approve", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-source-candidate", action="store_true")
    parser.add_argument("--usage", default="production-draft", help="Usage value to write into promoted manifest provenance")
    args = parser.parse_args()

    if not args.asset_name or any(ch.isspace() for ch in args.asset_name) or "/" in args.asset_name:
        raise SystemExit("--asset-name must be a non-empty flat filename prefix")
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
    artifacts = data.get("artifacts") or {}
    sheet_rel = artifacts.get("sheet")
    preview_rel = artifacts.get("previewGif")
    if not sheet_rel:
        raise SystemExit("manifest artifacts.sheet is required")
    sheet_src = manifest_dir / str(sheet_rel)
    preview_src = manifest_dir / str(preview_rel) if preview_rel else None
    if not sheet_src.exists():
        raise SystemExit(f"sheet not found: {sheet_src}")
    if preview_src and not preview_src.exists():
        raise SystemExit(f"preview GIF not found: {preview_src}")

    target_dir = args.target_dir.expanduser().resolve()
    sheet_name = f"{args.asset_name}-sprite-sheet.png"
    preview_name = f"{args.asset_name}-preview.gif"
    manifest_name = f"{args.asset_name}-manifest.json"
    promoted = json.loads(json.dumps(data))
    promoted["name"] = args.asset_name
    promoted["kind"] = promoted.get("kind") or "sprite-sheet-animation"
    frame_size = promoted.get("frameSize") or [0, 0]
    frame_count = len(promoted.get("frames", []))
    promoted["frameCount"] = promoted.get("frameCount") or frame_count
    promoted["layout"] = promoted.get("layout") or {"columns": frame_count, "rows": 1, "gutter": 0}
    promoted["artifacts"] = {"sheet": sheet_name}
    if preview_src:
        promoted["artifacts"]["previewGif"] = preview_name
    promoted_provenance = promoted.setdefault("provenance", {})
    promoted_provenance["usage"] = args.usage
    promoted_provenance.setdefault("sourceWorkflow", str(args.manifest.parent))
    promoted.setdefault("notes", "Promoted with sprite-workflow promote-named-artifact.py")

    manifest_tmp = target_dir / manifest_name
    if dry_run:
        print(f"would write {manifest_tmp}")
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        manifest_tmp.write_text(json.dumps(promoted, indent=2, ensure_ascii=False) + "\n")
    copy_file(sheet_src, target_dir / sheet_name, dry_run)
    if preview_src:
        copy_file(preview_src, target_dir / preview_name, dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
