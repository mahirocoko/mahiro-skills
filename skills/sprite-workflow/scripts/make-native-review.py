#!/usr/bin/env python3
"""Create hash-bound native pre-normalization review evidence."""
from __future__ import annotations
import argparse, hashlib, json, os, shutil, tempfile
from datetime import datetime, timezone
from pathlib import Path

def sha(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest()
def flat(value: str, label: str) -> str:
    if not value or Path(value).name != value or value in {".",".."}: raise SystemExit(f"{label} must be a safe basename")
    return value
def regular(base: Path, value: str) -> Path:
    if Path(value).is_absolute(): raise SystemExit("artifact path must be relative")
    raw=base/value
    if raw.is_symlink(): raise SystemExit("symlink artifacts are forbidden")
    path=raw.resolve(strict=True)
    if not path.is_relative_to(base.resolve()) or not path.is_file() or path.stat().st_nlink != 1: raise SystemExit("artifact must be a contained regular non-hardlinked file")
    return path

def main() -> int:
    p=argparse.ArgumentParser(); p.add_argument("manifest",type=Path); p.add_argument("--output-dir",required=True,type=Path); p.add_argument("--approve",action="store_true"); p.add_argument("--notes",default=""); p.add_argument("--json",action="store_true"); a=p.parse_args()
    manifest=a.manifest.resolve(); data=json.loads(manifest.read_text()); base=manifest.parent
    sheet_value=(data.get("artifacts") or {}).get("sheet"); sheet_rel=sheet_value.get("file") if isinstance(sheet_value,dict) else sheet_value
    if not sheet_rel: raise SystemExit("manifest artifacts.sheet is required")
    source=regular(base,sheet_rel)
    output=a.output_dir.resolve(); output.parent.mkdir(parents=True,exist_ok=True)
    if output.exists(): raise SystemExit(f"output already exists: {output}")
    with tempfile.TemporaryDirectory(prefix="native-review-",dir=output.parent) as raw:
        stage=Path(raw)/"publish"; stage.mkdir(); artifact=stage/"native-pre-normalization.png"; shutil.copy2(source,artifact)
        reviewed=json.loads(json.dumps(data)); frames_dir=stage/"frames"; frames_dir.mkdir()
        for index,frame in enumerate(reviewed.get("frames",[])):
            src=regular(base,frame.get("file","")); name=f"frame-{index:04d}.png"; shutil.copy2(src,frames_dir/name); frame["file"]=f"frames/{name}"
            frame["sha256"]=sha(frames_dir/name)
            try:
                from PIL import Image
                with Image.open(frames_dir/name) as im: im.load(); frame["dimensions"]=list(im.size)
            except Exception as exc: raise SystemExit(f"invalid frame PNG: {exc}")
        reviewed["artifacts"]={**(reviewed.get("artifacts") or {}),"sheet":{"file":artifact.name,"sha256":sha(artifact)}}
        from PIL import Image
        with Image.open(artifact) as im: im.load();
        if im.format != "PNG": raise SystemExit("native sheet must decode as PNG")
        reviewed["artifacts"]["sheet"]["dimensions"]=list(im.size)
        reviewed["schemaVersion"]=2
        reviewed.pop("reviewEvidence",None)
        reviewed["reviews"]={**(reviewed.get("reviews") or {})}
        evidence={"kind":"native-pre-normalization-review","approved":a.approve,"sourceManifest":{"path":str(manifest),"sha256":sha(manifest)},"sourceSheet":{"path":str(source),"sha256":sha(source)},"reviewArtifact":{"file":artifact.name,"sha256":sha(artifact)},"reviewedAt":datetime.now(timezone.utc).isoformat().replace("+00:00","Z"),"notes":a.notes}
        evidence_path=stage/"native-review.json"; evidence_path.write_text(json.dumps(evidence,indent=2)+"\n"); evidence["evidence"]={"file":evidence_path.name,"sha256":sha(evidence_path)}
        reviewed["reviews"]["nativePreNormalization"]=evidence
        (stage/"manifest.json").write_text(json.dumps(reviewed,indent=2)+"\n")
        stage.rename(output)
    payload={"ok":a.approve,"artifact":str(output/"native-pre-normalization.png"),"evidence":str(output/"native-review.json"),"manifest":str(output/"manifest.json")}
    print(json.dumps(payload,indent=2) if a.json else f"native review: {payload['evidence']}"); return 0
if __name__=="__main__": raise SystemExit(main())
