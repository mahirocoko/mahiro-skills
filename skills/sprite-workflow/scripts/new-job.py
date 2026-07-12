#!/usr/bin/env python3
"""Create a repo-local sprite workflow job folder."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import tempfile
import re
from datetime import datetime, timezone
from pathlib import Path

KIND_CHOICES = ["sprite-sheet", "animation-strip", "icon-frame-extract", "qa-only"]
WORKFLOW_MODES = ["image-generate", "image-edit", "sprite-generate", "sprite-edit", "effect-animation"]
SOURCE_LANES = ["codex", "gemini", "imagegen", "manual", "external-reference"]
USAGE_CHOICES = ["reference-only", "source-candidate", "production-approved"]
PROMPT_PRESETS = [
    "pixel-character",
    "image-edit",
    "standard-animation",
    "idle-breathing",
    "walk-cycle",
    "run-cycle",
    "basic-attack",
    "hurt-reaction",
    "death-downed",
    "spell-cast",
    "jump-hop",
    "guard-block",
    "victory-cheer",
    "interact-pickup",
    "ranged-attack",
    "skill-release",
    "knockback",
    "item-use",
    "talk",
    "effect-animation",
]

MOTION_BLOCKS = {
    "idle-breathing": "Feet stay planted. Show readable breathing/secondary motion: subtle chest, shoulder, head, cloth, fur, tail, or equipment follow-through. Do not return identical still frames.",
    "walk-cycle": "Create a readable in-place walk cycle with alternating foot contacts and passing poses. Keep torso/head stable, baseline stable, and feet visible. Static or nearly static rows fail.",
    "run-cycle": "Create a stronger in-place run cycle with larger leg arcs, forward lean, and clear arm/tail/cloth follow-through. Preserve identity and avoid cropped limbs.",
    "basic-attack": "Create anticipation, strike, impact/follow-through, and recovery frames. Weapon/hand path must be readable without crossing cell borders.",
    "hurt-reaction": "Create neutral, recoil, squash/lean, and recovery frames. Keep the character recognizable and game-safe.",
    "death-downed": "Create losing-balance, falling/downed, and settle frames. Keep body parts visible and avoid gore or extreme deformation.",
    "spell-cast": "Create charge, cast, release, and settle frames. Magic effects must not hide the character silhouette or leave the cell.",
    "jump-hop": "Create crouch/anticipation, lift, airborne, landing, and settle. Preserve baseline logic and avoid cropped ears or feet.",
    "guard-block": "Create raise guard, hold/block, impact recoil, and return. Arms/shield/weapon must remain inside the cell.",
    "victory-cheer": "Create celebratory arm/body/tail motion with stable scale. Avoid large props leaving the cell.",
    "interact-pickup": "Create bend/reach, pickup/contact, lift, and return. Keep head and feet visible.",
    "ranged-attack": "Create aim, draw/charge, release, follow-through, and recovery. Keep projectile effects small or separate.",
    "skill-release": "Create anticipation, strong release, follow-through, and settle. Avoid effect clutter hiding the pose.",
    "knockback": "Create readable recoil/slide frames while keeping the character inside the cell and anchor stable.",
    "item-use": "Create reach/use/hold/return frames around a small prop. Prop must remain readable but secondary to character.",
    "talk": "Create subtle mouth/head/hand/ear/tail changes. No speech bubbles, text, or UI. Feet stay planted.",
}

COMMON_NEGATIVE_PROMPT = (
    "text, label, number, watermark, logo, signature, UI, frame border, guide lines, scenery, "
    "detailed background, floor shadow, gradient background, shaded background, lighting variation on background, "
    "glow around silhouette, antialias matte, checkerboard, cropped head, cropped ears, "
    "cropped hands, cropped feet, cropped tail, missing weapon, missing prop, extra limbs, duplicate character, "
    "duplicated head, detached body parts, body crossing cell border, inconsistent scale, character redesign, "
    "photorealistic, 3d render, vector art, blurry, painterly, noisy micro-detail"
)


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


JOB_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")


def copy_assets(paths: list[str], assets_dir: Path) -> list[str]:
    copied: list[str] = []
    for raw in paths:
        src = Path(raw).expanduser().resolve()
        original = Path(raw).expanduser()
        if not original.is_file() or original.is_symlink() or original.stat().st_nlink != 1:
            raise SystemExit(f"source asset must be a regular non-symlink, non-hardlinked file: {raw}")
        target = assets_dir / src.name
        if target.exists():
            raise SystemExit(f"duplicate source asset basename: {src.name}")
        shutil.copy2(src, target)
        copied.append(str(target.relative_to(assets_dir.parent)))
    return copied



def build_scaffold_prompt(args: argparse.Namespace, copied_assets: list[str], states: list[str], directions: list[str]) -> str:
    preset = args.prompt_preset or args.motion_preset or ("effect-animation" if args.workflow_mode == "effect-animation" else args.workflow_mode)
    lines: list[str] = [f"# {args.title}", ""]
    if args.prompt.strip():
        lines += ["## User brief", "", args.prompt.strip(), ""]

    if copied_assets:
        lines += ["## Source", "", f"Inspect selected source asset first: `{copied_assets[0]}`.", "Treat it as the exact identity source, not loose inspiration.", ""]

    if args.workflow_mode == "image-edit" or preset == "image-edit":
        lines += [
            "## Image edit contract",
            "",
            "Edit the selected source image; do not create a new unrelated variant.",
            "Preserve original canvas size/aspect ratio and full-body visibility.",
            "Preserve transparency when possible; otherwise use a flat chroma fallback.",
            "Change only requested regions/annotations and return a real PNG/WebP.",
            "",
        ]
    elif args.workflow_mode == "effect-animation" or preset == "effect-animation":
        frame_count = args.frame_count if args.frame_count is not None else len(states)
        lines += [
            "## Effect animation contract",
            "",
            f"Category: {args.effect_category or '<effect-category>'}",
            f"Type: {args.effect_type or '<effect-type>'}",
            f"Style: {args.effect_style or 'pixel-clean'}",
            f"Palette: {args.effect_palette or '<palette>'}",
            f"Frames: {frame_count}",
            f"Frame size: {args.frame_size[0]}x{args.frame_size[1]}",
            f"Layout: {args.effect_layout or 'grid-4x2'}",
            f"Loop: {args.effect_loop or '<loop-mode>'}",
            f"Anchor: {args.effect_anchor or '<anchor>'}",
            "",
            "Create one real transparent PNG game VFX sprite sheet. Follow effectContext exactly. Every populated frame must show temporal progression. Do not bake checkerboard, matte background, preview backgrounds, text, labels, frame numbers, arrows, UI, logos, watermarks, or border guides into the image.",
            "",
        ]
    else:
        action = args.motion_preset or preset or (states[0] if states else "sprite-action")
        lines += [
            "## Character preservation",
            "",
            "Preserve the exact character identity: species, face, palette, outfit colors, props, proportions, and silhouette.",
            "Keep one full-body character in every cell with head/ears or hair, hands, equipment, tail/appendages, and both feet visible.",
            "Prefer simplified readable sprite details over noisy illustration texture.",
            "",
            "## Sprite sheet contract",
            "",
            f"Workflow mode: {args.workflow_mode}",
            f"Action / motion preset: {action}",
            f"States: {', '.join(states)}",
            f"Frame size: {args.frame_size[0]}x{args.frame_size[1]}",
            f"Chroma key: {args.chroma_key or '<flat chroma key or true alpha>'}",
            "Return a real raster PNG/WebP sprite sheet, not SVG/canvas/procedural/placeholder output.",
            "Use the requested grid, cell size, frame count, directions, and chroma key exactly. No gutters or extra sheet margin unless requested.",
            "Chroma background must be exact solid flat key color from edge to edge: no gradient, no lighting variation, no texture, no glow, no shadow, and no antialias matte around the silhouette.",
            "Keep generous spacing between frames so tail, sword, ears, cups, effects, and appendages do not cross into neighboring cells.",
            "No text, labels, UI, frame numbers, watermarks, scenery, shadows, or border guides.",
            "",
        ]
        if args.workflow_mode == "sprite-generate":
            lines += [
                "## Direction contract",
                "",
                f"Directions: {', '.join(directions)}",
                "For standard direction-split work, produce separate direction sheets with stable identity, scale, head size, baseline, and pixel density. If this job is single-direction, keep all frames in the requested row/grid only.",
                "",
            ]
        motion_block = MOTION_BLOCKS.get(action) or MOTION_BLOCKS.get(preset)
        if motion_block:
            lines += ["## Motion-specific requirements", "", motion_block, ""]

    negative = args.negative_prompt.strip() or COMMON_NEGATIVE_PROMPT
    lines += [
        "## Negative prompt / avoid",
        "",
        negative,
        "",
        "## QA and promotion gate",
        "",
        "visual honesty gate: before calling this final, inspect target-size output. Script QA passing is not enough. Fail the candidate if silhouette, detail, alpha/chroma, motion readability, or style match is weak.",
    ]
    if args.notes.strip():
        lines += ["", "## Job notes", "", args.notes.strip()]
    return "\n".join(lines).rstrip() + "\n"
def main() -> int:
    parser = argparse.ArgumentParser(description="Create a sprite workflow handoff job")
    parser.add_argument("--root", default=None, help="Sprite workflow root (default: $AGENT_STATE_DIR/sprite-workflow)")
    parser.add_argument("--job-id", default=None, help="Job id (default: timestamp-title slug)")
    parser.add_argument("--target-repo", default=None, help="Target repo path (default: current git root)")
    parser.add_argument("--kind", choices=KIND_CHOICES, default="sprite-sheet")
    parser.add_argument("--workflow-mode", choices=WORKFLOW_MODES, default="sprite-generate")
    parser.add_argument("--title", required=True)
    parser.add_argument("--prompt", default="")
    parser.add_argument("--prompt-preset", choices=PROMPT_PRESETS, default="", help="Scaffold prompt preset to write into prompt.md")
    parser.add_argument("--scaffold-prompt", action="store_true", help="Write a structured Image Cockpit-style prompt scaffold even when --prompt is empty")
    parser.add_argument("--negative-prompt", default="")
    parser.add_argument("--notes", default="", help="Job/generation notes")
    parser.add_argument("--seed", default="")
    parser.add_argument("--size", default="")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--quality", default="auto")
    parser.add_argument("--frame-size", type=parse_frame_size, default=[32, 32])
    parser.add_argument("--states", default="idle", help="Comma-separated states")
    parser.add_argument("--frame-count", type=int, default=None, help="Explicit output frame count; independent of state count")
    parser.add_argument("--motion-preset", default="", help="Animation motion preset/action id")
    parser.add_argument("--action", default="", help="Stable schema-v2 action identifier (defaults to motion preset/state)")
    parser.add_argument("--directions", default="", help="Comma-separated direction labels")
    parser.add_argument("--direction", default="", help="Stable schema-v2 direction identifier for this artifact")
    parser.add_argument("--content-policy", default="", help="Optional schema-v2 content policy identifier")
    parser.add_argument("--anchor-policy", default="", help="Optional schema-v2 anchor policy identifier")
    parser.add_argument("--lineage-source-id", action="append", default=[], help="Upstream stable source id (repeatable)")
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
    parser.add_argument("--motion-reference", default="", help="Optional local video/reference path metadata; does not trigger extraction")
    parser.add_argument("--motion-start", type=float, default=None, help="Human-selected reference start in seconds")
    motion_selection = parser.add_mutually_exclusive_group()
    motion_selection.add_argument("--motion-end", type=float, default=None, help="Human-selected reference end in seconds")
    motion_selection.add_argument("--motion-duration", type=float, default=None, help="Human-selected reference duration in seconds")
    parser.add_argument("--grid-columns", type=int, default=None)
    parser.add_argument("--grid-rows", type=int, default=None)
    parser.add_argument("--grid-mode", choices=["fixed", "component-grid"], default=None)
    args = parser.parse_args()

    target_repo = Path(args.target_repo).expanduser().resolve() if args.target_repo else repo_root()
    agent_state = Path(os.environ.get("AGENT_STATE_DIR", target_repo / ".agent-state")).expanduser()
    root = Path(args.root).expanduser().resolve() if args.root else (agent_state / "sprite-workflow").resolve()
    now = datetime.now(timezone.utc)
    slug = "-".join("".join(ch.lower() if ch.isalnum() else "-" for ch in args.title).split("-"))[:48] or "sprite-job"
    job_id = args.job_id or f"{now.strftime('%Y%m%d-%H%M%S')}-{slug}"
    if not JOB_ID_RE.fullmatch(job_id) or job_id in {".", ".."}:
        raise SystemExit("--job-id must be a flat identifier using only letters, numbers, dot, underscore, and hyphen")
    jobs_dir = (root / "jobs").resolve()
    jobs_dir.mkdir(parents=True, exist_ok=True)
    job_dir = jobs_dir / job_id
    if job_dir.exists():
        raise SystemExit(f"job already exists: {job_dir}")
    staging_parent = Path(tempfile.mkdtemp(prefix=f".{job_id}-", dir=jobs_dir))
    job_dir_stage = staging_parent / "job"

    assets_dir = job_dir_stage / "assets"
    outbox_dir = job_dir_stage / "outbox"
    frames_dir = outbox_dir / "frames"
    for path in [assets_dir, frames_dir, job_dir_stage / "logs", outbox_dir, job_dir_stage / "qa"]:
        path.mkdir(parents=True, exist_ok=True)

    copied_assets = copy_assets(args.source_asset, assets_dir)
    states = split_csv(args.states)
    if not states:
        raise SystemExit("at least one state is required")
    frame_count = args.frame_count if args.frame_count is not None else (len(states) if args.kind == "sprite-sheet" else 8)
    if frame_count <= 0:
        raise SystemExit("--frame-count must be positive")

    directions = split_csv(args.directions) or ["front", "front three-quarter", "side", "back three-quarter", "back"] if args.workflow_mode == "sprite-generate" else []
    source_asset_path = copied_assets[0] if copied_assets else ""
    sprite_context = {
        "action": args.action or args.motion_preset or (states[0] if states else ""),
        "frames": frame_count,
        "frameCount": frame_count,
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
        "frameCount": frame_count,
        "frameSize": {"width": args.frame_size[0], "height": args.frame_size[1]},
        "layout": args.effect_layout,
        "loopMode": args.effect_loop,
        "anchor": args.effect_anchor,
    } if args.workflow_mode == "effect-animation" else None
    should_scaffold_prompt = bool(args.scaffold_prompt or args.prompt_preset)
    prompt_text = build_scaffold_prompt(args, copied_assets, states, directions) if should_scaffold_prompt else (args.prompt or f"# {args.title}\n\nDescribe the sprite task here.\n")
    job_prompt = prompt_text if should_scaffold_prompt and not args.prompt else args.prompt

    motion_reference = None
    if args.motion_reference:
        if args.motion_start is None or (args.motion_end is None and args.motion_duration is None):
            raise SystemExit("motion reference metadata requires --motion-start and either --motion-end or --motion-duration")
        duration = args.motion_duration if args.motion_duration is not None else args.motion_end - args.motion_start
        if args.motion_start < 0 or duration <= 0:
            raise SystemExit("motion reference selection must have non-negative start and positive duration")
        motion_reference = {"localPath": str(Path(args.motion_reference).expanduser().resolve()), "startSeconds": args.motion_start, "durationSeconds": duration, "endSeconds": args.motion_start + duration, "humanSelected": True, "extracted": False}
    grid_metadata = None
    if args.grid_columns is not None or args.grid_rows is not None or args.grid_mode is not None:
        if not args.grid_columns or not args.grid_rows:
            raise SystemExit("grid metadata requires positive --grid-columns and --grid-rows")
        grid_metadata = {"mode": args.grid_mode or "fixed", "columns": args.grid_columns, "rows": args.grid_rows, "order": "row-major"}

    job = {
        "id": job_id,
        "kind": args.kind,
        "workflowMode": args.workflow_mode,
        "title": args.title,
        "targetRepo": str(target_repo),
        "createdAt": now.isoformat().replace("+00:00", "Z"),
        "prompt": job_prompt,
        "negativePrompt": args.negative_prompt,
        "jobNotes": args.notes,
        "generationHints": {"seed": args.seed, "size": args.size or f"{args.frame_size[0]}x{args.frame_size[1]}", "count": args.count, "quality": args.quality},
        "frameSize": args.frame_size,
        "frameCount": frame_count,
        "states": states,
        "sourceAssets": copied_assets,
        "selectedImage": {"name": Path(source_asset_path).name if source_asset_path else "", "assetPath": source_asset_path, "source": "copied-source-asset" if source_asset_path else ""},
        "spriteContext": sprite_context,
        "effectContext": effect_context,
        "tournament": {"candidateCount": max(1, args.tournament_candidates), "isolateOutboxes": args.tournament_candidates > 1},
        "provenance": {"sourceLane": args.source_lane, "usage": args.usage},
        "motionReference": motion_reference,
        "gridExtraction": grid_metadata,
    }
    metadata = {
        "action": args.action or args.motion_preset or (states[0] if states else ""),
        "direction": args.direction,
        "contentPolicy": args.content_policy,
        "anchorPolicy": args.anchor_policy,
        "lineage": {"sourceIds": args.lineage_source_id},
    }
    if any([args.action, args.direction, args.content_policy, args.anchor_policy, args.lineage_source_id, args.frame_count is not None, motion_reference is not None, grid_metadata is not None]):
        job["schemaVersion"] = 2
        job.update(metadata)
    (job_dir_stage / "job.json").write_text(json.dumps(job, indent=2) + "\n")
    (job_dir_stage / "prompt.md").write_text(prompt_text if prompt_text.endswith("\n") else prompt_text + "\n")
    (job_dir_stage / "provenance.md").write_text(f"# Provenance\n\n- sourceLane: {args.source_lane}\n- usage: {args.usage}\n- targetRepo: {target_repo}\n")
    (job_dir_stage / "status.json").write_text(json.dumps({"status": "created", "updatedAt": job["createdAt"]}, indent=2) + "\n")
    job_dir_stage.rename(job_dir)
    staging_parent.rmdir()

    print(json.dumps({"jobId": job_id, "jobDir": str(job_dir), "outboxDir": str(job_dir / "outbox"), "manifest": str(job_dir / "outbox" / "manifest.json")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
