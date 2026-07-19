#!/usr/bin/env python3
"""Assemble an atlas only from hash-pinned production-approved PNG frames."""
import argparse, hashlib, json, math, os, subprocess, sys, tempfile
from pathlib import Path

ALGORITHM = "approved-atlas-layout-v1"
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def refuse(message): print(json.dumps({"ok": False, "status": "refused", "reason": message}, sort_keys=True), file=sys.stderr); return 2
def contained_file(base, value):
    raw = base / value
    if raw.is_symlink() or any(part.is_symlink() for part in raw.parents if part != base.parent): raise ValueError(f"symlink input forbidden: {value}")
    resolved = raw.resolve()
    if not resolved.is_relative_to(base.resolve()): raise ValueError(f"path escapes manifest directory: {value}")
    if not resolved.is_file() or resolved.stat().st_nlink != 1: raise ValueError(f"frame must be a regular non-hardlinked file: {value}")
    return resolved

def legacy_review(path, manifest_path):
    if path is None: raise ValueError("--legacy-provenance-review is required with --allow-legacy-provenance")
    raw = Path(path)
    if raw.is_symlink(): raise ValueError("legacy provenance review must not be a symlink")
    resolved = raw.resolve(strict=True)
    if not resolved.is_file() or resolved.stat().st_nlink != 1: raise ValueError("legacy provenance review must be a regular non-hardlinked file")
    try: payload = json.loads(resolved.read_text())
    except Exception as error: raise ValueError(f"invalid legacy provenance review JSON: {error}")
    if payload.get("schemaVersion") != 1 or payload.get("decision") != "approved-legacy-provenance": raise ValueError("legacy provenance review decision must be approved-legacy-provenance schemaVersion 1")
    for key in ("reviewer", "reviewedAt", "reason"):
        if not isinstance(payload.get(key), str) or not payload[key].strip(): raise ValueError(f"legacy provenance review {key} must be a non-empty string")
    if payload.get("sourceManifestSha256") != sha(manifest_path): raise ValueError("legacy provenance review sourceManifestSha256 mismatch")
    return resolved, payload

def main():
    p = argparse.ArgumentParser(description="Build a deterministic unscaled atlas from an approved manifest.")
    p.add_argument("manifest"); p.add_argument("--output", required=True); p.add_argument("--atlas-manifest", required=True)
    p.add_argument("--layout", choices=["row", "column", "compact"], default="compact")
    p.add_argument("--allow-legacy-provenance", action="store_true", help="Explicitly allow an older approved manifest without sourceRequirement")
    p.add_argument("--legacy-provenance-review", help="Hash-bound JSON review required for the exceptional legacy path")
    args = p.parse_args()
    try:
        from PIL import Image
    except ImportError: return refuse("Pillow is required: install it with `python3 -m pip install Pillow`.")
    manifest_raw = Path(args.manifest)
    if not manifest_raw.is_file() or manifest_raw.is_symlink() or manifest_raw.stat().st_nlink != 1: return refuse("source manifest must be a regular non-symlink, non-hardlinked file")
    manifest_path = manifest_raw.resolve(); base = manifest_path.parent
    try: source = json.loads(manifest_path.read_text())
    except Exception as error: return refuse(f"invalid manifest JSON: {error}")
    bound_job = manifest_path.parent.parent / "job.json" if manifest_path.parent.name == "outbox" else None
    source_requirement = source.get("provenance", {}).get("sourceRequirement")
    legacy_review_path = None; legacy_review_payload = None
    if source_requirement is None:
        if not args.allow_legacy_provenance:
            return refuse("manifest lacks sourceRequirement; the exceptional legacy path requires --allow-legacy-provenance and a review record")
        if bound_job is not None and (bound_job.exists() or bound_job.is_symlink()):
            return refuse("legacy provenance path is unavailable for a job-bound manifest")
        if source.get("provenance", {}).get("sourceWorkflow"):
            return refuse("legacy provenance path is unavailable for a previously promoted manifest")
        try: legacy_review_path, legacy_review_payload = legacy_review(args.legacy_provenance_review, manifest_path)
        except (ValueError, OSError) as error: return refuse(str(error))
    elif args.allow_legacy_provenance or args.legacy_provenance_review:
        return refuse("legacy provenance options are valid only when sourceRequirement is absent")
    if source_requirement is not None or (bound_job is not None and (bound_job.exists() or bound_job.is_symlink())):
        validator = Path(__file__).with_name("validate-manifest.py")
        checked = subprocess.run([sys.executable, str(validator), str(manifest_path)], text=True, capture_output=True)
        if checked.returncode != 0: return refuse("source-authorship validation failed: " + (checked.stdout or checked.stderr).strip())
    if source.get("provenance", {}).get("usage") != "production-approved": return refuse("manifest is not production-approved")
    frames = source.get("frames")
    if not isinstance(frames, list) or not frames: return refuse("manifest must contain frames")
    seen_ids = set(); seen_state_indexes = set(); loaded = []
    try:
        for order, frame in enumerate(frames):
            fid = frame.get("id"); key = (frame.get("state"), frame.get("index"))
            if not isinstance(fid, str) or not fid or fid in seen_ids: raise ValueError("frame IDs must be unique non-empty strings")
            if not isinstance(key[0], str) or not isinstance(key[1], int) or key in seen_state_indexes: raise ValueError("state/index pairs must be unique")
            seen_ids.add(fid); seen_state_indexes.add(key)
            path = contained_file(base, frame.get("file", ""))
            if sha(path) != frame.get("sha256"): raise ValueError(f"hash mismatch: {fid}")
            image = Image.open(path); image.load()
            if image.format != "PNG": raise ValueError(f"not PNG: {fid}")
            image = image.convert("RGBA"); dims = [image.width, image.height]
            if frame.get("dimensions") != dims: raise ValueError(f"dimension mismatch: {fid}")
            anchor = frame.get("anchor")
            if not isinstance(anchor, list) or len(anchor) != 2 or not all(isinstance(v, int) for v in anchor) or not (0 <= anchor[0] < image.width and 0 <= anchor[1] < image.height): raise ValueError(f"anchor out of bounds: {fid}")
            loaded.append((frame, path, image, order))
    except (ValueError, OSError) as error: return refuse(str(error))
    count = len(loaded)
    if args.layout == "row": cols = count
    elif args.layout == "column": cols = 1
    else: cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols); col_widths = [0] * cols; row_heights = [0] * rows
    for _, _, image, order in loaded:
        col, row = order % cols, order // cols
        col_widths[col] = max(col_widths[col], image.width); row_heights[row] = max(row_heights[row], image.height)
    xs = [sum(col_widths[:i]) for i in range(cols)]; ys = [sum(row_heights[:i]) for i in range(rows)]
    atlas = Image.new("RGBA", (sum(col_widths), sum(row_heights)), (0, 0, 0, 0)); output_frames = []
    for frame, path, image, order in loaded:
        col, row = order % cols, order // cols; x, y = xs[col], ys[row]; atlas.paste(image, (x, y))
        output_frames.append({"id": frame["id"], "state": frame["state"], "index": frame["index"], "source": frame["file"], "sourceSha256": sha(path), "rect": [x, y, image.width, image.height], "anchor": [x + frame["anchor"][0], y + frame["anchor"][1]]})
    output = Path(args.output).resolve(); atlas_manifest = Path(args.atlas_manifest).resolve()
    protected = {manifest_path, *[path for _, path, _, _ in loaded]}
    if output in protected or atlas_manifest in protected or output == atlas_manifest: return refuse("source/output collisions are forbidden")
    for candidate in (output, atlas_manifest):
        if candidate.exists(): return refuse("atlas outputs must not already exist")
    output.parent.mkdir(parents=True, exist_ok=True); atlas_manifest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=".atlas-", suffix=".png", dir=output.parent, delete=False) as stream: temp_output=Path(stream.name)
    atlas.save(temp_output, format="PNG", optimize=False, compress_level=9)
    payload = {"schemaVersion": 1, "status": "assembled", "algorithm": ALGORITHM, "layout": args.layout,
               "sourceManifest": {"path": str(manifest_path), "sha256": sha(manifest_path), "usage": "production-approved"},
               "atlas": {"path": str(output), "sha256": sha(temp_output), "dimensions": list(atlas.size)}, "frames": output_frames,
               "transformPolicy": {"scaling": False, "trimming": False, "rotation": False}}
    if legacy_review_path is not None:
        payload["legacyProvenanceReview"] = {"path": str(legacy_review_path), "sha256": sha(legacy_review_path), "decision": legacy_review_payload["decision"], "reviewer": legacy_review_payload["reviewer"], "reviewedAt": legacy_review_payload["reviewedAt"]}
    with tempfile.NamedTemporaryFile(prefix=".atlas-manifest-", suffix=".json", dir=atlas_manifest.parent, mode="w", delete=False) as stream:
        stream.write(json.dumps(payload, indent=2, sort_keys=True) + "\n"); temp_manifest=Path(stream.name)
    try:
        os.replace(temp_output, output)
        os.replace(temp_manifest, atlas_manifest)
    except Exception:
        output.unlink(missing_ok=True)
        atlas_manifest.unlink(missing_ok=True)
        temp_output.unlink(missing_ok=True)
        temp_manifest.unlink(missing_ok=True)
        raise
    print(json.dumps(payload, sort_keys=True)); return 0
if __name__ == "__main__": raise SystemExit(main())
