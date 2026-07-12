#!/usr/bin/env python3
"""Extract a bounded, human-selected local video segment as reference frames."""
from __future__ import annotations

import argparse, hashlib, json, math, shutil, subprocess, tempfile
from datetime import datetime, timezone
from pathlib import Path


def capability() -> dict:
    missing = [name for name in ("ffprobe", "ffmpeg") if shutil.which(name) is None]
    blockers = [{"code": "missing-binary", "capability": name, "message": f"{name} is not available on PATH"} for name in missing]
    return {"ok": not blockers, "capability": "local-motion-reference-intake", "provider": None, "generation": False, "blockers": blockers}


def run(argv: list[str], timeout: int = 30) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(argv, text=True, capture_output=True, timeout=timeout, stdin=subprocess.DEVNULL)
    except subprocess.TimeoutExpired as exc:
        raise SystemExit(f"command timed out after {timeout}s") from exc
    if result.returncode:
        raise SystemExit(result.stderr.strip() or result.stdout.strip() or "command failed")
    return result


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract bounded frames from a local motion-reference video (never generates assets)")
    parser.add_argument("--capability-status", action="store_true")
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--start", type=float, help="Human-selected start time in seconds")
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--end", type=float, help="Human-selected end time in seconds")
    selection.add_argument("--duration", type=float, help="Human-selected duration in seconds")
    parser.add_argument("--fps", type=float, default=8.0)
    parser.add_argument("--max-duration", type=float, default=10.0)
    parser.add_argument("--max-width", type=int, default=4096)
    parser.add_argument("--max-height", type=int, default=4096)
    parser.add_argument("--max-frames", type=int, default=120)
    parser.add_argument("--max-total-pixels", type=int, default=100_000_000)
    parser.add_argument("--max-input-bytes", type=int, default=268_435_456)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    status = capability()
    if args.capability_status:
        print(json.dumps(status, indent=2)); return 0 if status["ok"] else 1
    if not status["ok"]:
        print(json.dumps(status, indent=2)); return 2
    if args.input is None or args.output_dir is None:
        raise SystemExit("--input and --output-dir are required")
    if args.start is None or (args.end is None and args.duration is None):
        raise SystemExit("explicit human-selected --start and either --end or --duration are required")
    if not args.input.is_file() or args.input.is_symlink() or args.input.stat().st_nlink != 1: raise SystemExit("input must be an existing regular non-symlink, non-hardlinked local file")
    if args.max_input_bytes <= 0 or args.input.stat().st_size > args.max_input_bytes: raise SystemExit("input file exceeds configured byte bound")
    numeric = [args.start, args.end, args.duration, args.fps, args.max_duration]
    if any(value is not None and not math.isfinite(value) for value in numeric): raise SystemExit("motion values must be finite")
    if args.start < 0 or args.fps <= 0: raise SystemExit("start must be non-negative and fps positive")
    duration = args.duration if args.duration is not None else args.end - args.start
    if duration <= 0 or duration > args.max_duration: raise SystemExit(f"selected duration must be > 0 and <= {args.max_duration}s")
    probe = json.loads(run([shutil.which("ffprobe"), "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,duration:format=duration", "-of", "json", str(args.input)]).stdout)
    streams = probe.get("streams", [])
    if not streams: raise SystemExit("no video stream found")
    width, height = int(streams[0]["width"]), int(streams[0]["height"])
    source_duration_raw = streams[0].get("duration") or (probe.get("format") or {}).get("duration")
    try: source_duration = float(source_duration_raw)
    except (TypeError, ValueError): raise SystemExit("could not determine finite source duration")
    if not math.isfinite(source_duration) or source_duration <= 0 or args.start + duration > source_duration + 1e-6: raise SystemExit("selected motion bounds exceed source duration")
    count = int(math.ceil(duration * args.fps))
    if width > args.max_width or height > args.max_height: raise SystemExit("video dimensions exceed configured bounds")
    if count > args.max_frames: raise SystemExit("requested frame count exceeds configured bound")
    if width * height * count > args.max_total_pixels: raise SystemExit("requested decoded pixels exceed configured bound")
    output = args.output_dir.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists(): raise SystemExit(f"output already exists: {output}")
    with tempfile.TemporaryDirectory(prefix="motion-reference-", dir=output.parent) as raw:
        stage = Path(raw) / "publish"; frames = stage / "frames"; frames.mkdir(parents=True)
        source_dir = stage / "source"; source_dir.mkdir()
        source_copy = source_dir / f"motion-reference{args.input.suffix.lower()}"
        shutil.copy2(args.input.resolve(), source_copy)
        run([shutil.which("ffmpeg"), "-nostdin", "-v", "error", "-ss", str(args.start), "-t", str(duration), "-i", str(args.input.resolve()), "-map", "0:v:0", "-vf", f"fps={args.fps}", "-frames:v", str(count), str(frames / "frame-%04d.png")], timeout=120)
        files = sorted(frames.glob("frame-*.png"))
        if len(files) != count: raise SystemExit(f"ffmpeg produced {len(files)} frames; expected exactly {count}")
        created = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        manifest = {"schemaVersion": 2, "kind": "motion-reference-intake", "generation": False, "source": {"file": f"source/{source_copy.name}", "originalLocalPath": str(args.input.resolve()), "sha256": sha256(source_copy), "bytes": source_copy.stat().st_size}, "selection": {"startSeconds": args.start, "durationSeconds": duration, "endSeconds": args.start + duration, "humanSelected": True, "wholeClipDefault": False}, "video": {"width": width, "height": height, "durationSeconds": source_duration}, "extraction": {"fps": args.fps, "expectedFrameCount": count, "actualFrameCount": len(files)},  "createdAt": created, "frames": [{"file": f"frames/{p.name}", "sha256": sha256(p), "sourceTimeSeconds": args.start + (index / args.fps), "createdAt": datetime.fromtimestamp(p.stat().st_mtime, timezone.utc).isoformat().replace("+00:00", "Z")} for index, p in enumerate(files)]}
        (stage / "motion-reference.json").write_text(json.dumps(manifest, indent=2) + "\n")
        stage.rename(output)
    payload = {"ok": True, "outputDir": str(output), "manifest": str(output / "motion-reference.json"), "frameCount": count}
    print(json.dumps(payload, indent=2) if args.json else f"motion reference: {output}")
    return 0

if __name__ == "__main__": raise SystemExit(main())
