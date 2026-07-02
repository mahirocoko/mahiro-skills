#!/usr/bin/env python3
"""Create a repo-local sprite workflow job folder."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

KIND_CHOICES = ["sprite-sheet", "animation-strip", "icon-frame-extract", "qa-only"]
WORKFLOW_MODES = ["image-generate", "image-edit", "sprite-generate", "sprite-edit", "effect-animation"]
SOURCE_LANES = ["codex", "gemini", "imagegen", "manual", "external-reference"]
USAGE_CHOICES = ["reference-only", "source-candidate", "production-approved"]


def repo_root() -> Path:
    try:
        out = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True, stderr=subprocess.DEVNULL).strip()
        if out:
            return Path(out).resolve()
    except Exception:
        pass
    return Path.cwd().resolve()


def parse_frame_size(value: str) -> list[int]:
    parts = value.lower().replace("×", "x").split("x")
    if len(parts) != 2:
        raise argparse.ArgumentTypeError("frame size must look like 32x32")
    try:
        width, height = (int(parts[0]), int(parts[1]))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("frame size must use integers") from exc
    if width <= 0 or height <= 0:
        raise argparse.ArgumentTypeError("frame size must be positive")
    return [width, height]


def split_csv(value: str) -> list[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def copy_assets(paths: list[str], assets_dir: Path) -> list[str]:
    copied: list[str] = []
    for raw in paths:
        src = Path(raw).expanduser().resolve()
        if not src.exists():
            raise SystemExit(f"source asset not found: {raw}")
        target = assets_dir / src.name
        if src.is_dir():
            if target.exists():
                shutil.rmtree(target)
            shutil.copytree(src, target)
        else:
            shutil.copy2(src, target)
        copied.append(str(target.relative_to(assets_dir.parent)))
    return copied


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a sprite workflow handoff job")
    parser.add_argument("--root", default=None, help="Sprite workflow root (default: $AGENT_STATE_DIR/sprite-workflow)")
    parser.add_argument("--job-id", default=None, help="Job id (default: timestamp-title slug)")
    parser.add_argument("--target-repo", default=None, help="Target repo path (default: current git root)")
    parser.add_argument("--kind", choices=KIND_CHOICES, default="sprite-sheet")
    parser.add_argument("--workflow-mode", choices=WORKFLOW_MODES, default="sprite-generate")
    parser.add_argument("--title", required=True)
    parser.add_argument("--prompt", default="")
    parser.add_argument("--negative-prompt", default="")
    parser.add_argument("--notes", default="", help="Job/generation notes")
    parser.add_argument("--seed", default="")
    parser.add_argument("--size", default="")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--quality", default="auto")
    parser.add_argument("--frame-size", type=parse_frame_size, default=[32, 32])
    parser.add_argument("--states", default="idle", help="Comma-separated states")
    parser.add_argument("--motion-preset", default="", help="Animation motion preset/action id")
    parser.add_argument("--directions", default="", help="Comma-separated direction labels")
    parser.add_argument("--chroma-key", default="", help="Chroma key name or hex")
    parser.add_argument("--tournament-candidates", type=int, default=1, help="Parallel candidate count for hard generation jobs")
    parser.add_argument("--effect-category", default="")
    parser.add_argument("--effect-type", default="")
    parser.add_argument("--effect-style", default="")
    parser.add_argument("--effect-palette", default="")
    parser.add_argument("--effect-layout", default="")
    parser.add_argument("--effect-loop", default="")
    parser.add_argument("--effect-anchor", default="")
    parser.add_argument("--source-lane", choices=SOURCE_LANES, default="codex")
    parser.add_argument("--usage", choices=USAGE_CHOICES, default="source-candidate")
    parser.add_argument("--source-asset", action="append", default=[], help="Reference/source asset to copy into assets/ (repeatable)")
    args = parser.parse_args()

    target_repo = Path(args.target_repo).expanduser().resolve() if args.target_repo else repo_root()
    agent_state = Path(os.environ.get("AGENT_STATE_DIR", target_repo / ".agent-state")).expanduser()
    root = Path(args.root).expanduser().resolve() if args.root else (agent_state / "sprite-workflow").resolve()
    now = datetime.now(timezone.utc)
    slug = "-".join("".join(ch.lower() if ch.isalnum() else "-" for ch in args.title).split("-"))[:48] or "sprite-job"
    job_id = args.job_id or f"{now.strftime('%Y%m%d-%H%M%S')}-{slug}"
    job_dir = root / "jobs" / job_id
    if job_dir.exists():
      raise SystemExit(f"job already exists: {job_dir}")

    assets_dir = job_dir / "assets"
    outbox_dir = job_dir / "outbox"
    frames_dir = outbox_dir / "frames"
    for path in [assets_dir, frames_dir, job_dir / "logs", outbox_dir, job_dir / "qa"]:
        path.mkdir(parents=True, exist_ok=True)

    copied_assets = copy_assets(args.source_asset, assets_dir)
    states = split_csv(args.states)
    if not states:
        raise SystemExit("at least one state is required")

    directions = split_csv(args.directions) or ["front", "front three-quarter", "side", "back three-quarter", "back"] if args.workflow_mode == "sprite-generate" else []
    source_asset_path = copied_assets[0] if copied_assets else ""
    sprite_context = {
        "action": args.motion_preset or (states[0] if states else ""),
        "frames": len(states) if args.kind == "sprite-sheet" else 8,
        "grid": {"columns": 4, "rows": 2, "gutter": 0} if args.workflow_mode == "sprite-generate" else None,
        "cell": {"width": args.frame_size[0], "height": args.frame_size[1]},
        "directions": directions,
        "chromaKey": args.chroma_key,
        "variant": "standard" if args.workflow_mode == "sprite-generate" else "",
    } if args.workflow_mode in {"sprite-generate", "sprite-edit"} else None
    effect_context = {
        "category": args.effect_category,
        "type": args.effect_type,
        "style": args.effect_style,
        "palette": args.effect_palette,
        "frameCount": len(states),
        "frameSize": {"width": args.frame_size[0], "height": args.frame_size[1]},
        "layout": args.effect_layout,
        "loopMode": args.effect_loop,
        "anchor": args.effect_anchor,
    } if args.workflow_mode == "effect-animation" else None
    job = {
        "id": job_id,
        "kind": args.kind,
        "workflowMode": args.workflow_mode,
        "title": args.title,
        "targetRepo": str(target_repo),
        "createdAt": now.isoformat().replace("+00:00", "Z"),
        "prompt": args.prompt,
        "negativePrompt": args.negative_prompt,
        "jobNotes": args.notes,
        "generationHints": {"seed": args.seed, "size": args.size or f"{args.frame_size[0]}x{args.frame_size[1]}", "count": args.count, "quality": args.quality},
        "frameSize": args.frame_size,
        "states": states,
        "sourceAssets": copied_assets,
        "selectedImage": {"name": Path(source_asset_path).name if source_asset_path else "", "assetPath": source_asset_path, "source": "copied-source-asset" if source_asset_path else ""},
        "spriteContext": sprite_context,
        "effectContext": effect_context,
        "tournament": {"candidateCount": max(1, args.tournament_candidates), "isolateOutboxes": args.tournament_candidates > 1},
        "provenance": {"sourceLane": args.source_lane, "usage": args.usage},
    }
    (job_dir / "job.json").write_text(json.dumps(job, indent=2) + "\n")
    (job_dir / "prompt.md").write_text((args.prompt or f"# {args.title}\n\nDescribe the sprite task here.\n") + "\n")
    (job_dir / "provenance.md").write_text(f"# Provenance\n\n- sourceLane: {args.source_lane}\n- usage: {args.usage}\n- targetRepo: {target_repo}\n")
    (job_dir / "status.json").write_text(json.dumps({"status": "created", "updatedAt": job["createdAt"]}, indent=2) + "\n")

    print(json.dumps({"jobId": job_id, "jobDir": str(job_dir), "outboxDir": str(outbox_dir), "manifest": str(outbox_dir / "manifest.json")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
