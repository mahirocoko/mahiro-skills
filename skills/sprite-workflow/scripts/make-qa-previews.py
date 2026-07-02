#!/usr/bin/env python3
"""Create light/dark/checker QA composites for transparent sprite sheets."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path
from typing import Iterable


def magick_bin() -> str:
    candidate = shutil.which("magick")
    if candidate:
        return candidate
    for path in ("/opt/homebrew/bin/magick", "/usr/local/bin/magick"):
        if Path(path).exists():
            return path
    raise SystemExit("ImageMagick 'magick' is required for make-qa-previews.py")


def run(command: Iterable[str]) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(list(command), text=True, capture_output=True)
    if result.returncode != 0:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def image_size(magick: str, path: Path) -> tuple[int, int]:
    result = run([magick, "identify", "-format", "%w %h", str(path)])
    width, height = result.stdout.strip().split()
    return int(width), int(height)


def main() -> int:
    parser = argparse.ArgumentParser(description="Create light/dark/checker QA preview composites")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument("--light", default="#f5f1e8")
    parser.add_argument("--dark", default="#151515")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not args.sheet.exists():
        raise SystemExit(f"sheet not found: {args.sheet}")
    magick = magick_bin()
    width, height = image_size(magick, args.sheet)
    output_dir = args.output_dir or args.sheet.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs = {
        "dark": output_dir / "preview-dark.png",
        "light": output_dir / "preview-light.png",
        "checker": output_dir / "preview-checker.png",
    }
    run([magick, "-size", f"{width}x{height}", f"xc:{args.dark}", str(args.sheet), "-composite", str(outputs["dark"])])
    run([magick, "-size", f"{width}x{height}", f"xc:{args.light}", str(args.sheet), "-composite", str(outputs["light"])])
    run([magick, "-size", f"{width}x{height}", "pattern:checkerboard", "-resize", f"{width}x{height}!", str(args.sheet), "-composite", str(outputs["checker"])])
    payload = {"ok": True, "outputs": {key: str(value) for key, value in outputs.items()}}
    if args.json:
      print(json.dumps(payload, indent=2))
    else:
      for value in outputs.values():
        print(value)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
