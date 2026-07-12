#!/usr/bin/env python3
"""Atomically promote verified sprite artifacts into a new flat directory."""
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path
SAFE=re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
def sha(p:Path)->str:return hashlib.sha256(p.read_bytes()).hexdigest()
def validate(p:Path):
 r=subprocess.run([sys.executable,str(Path(__file__).with_name("validate-manifest.py")),str(p),"--json"],text=True,capture_output=True)
 if r.returncode: raise SystemExit(r.stdout or r.stderr)
def regular(base:Path,value,label):
 if not isinstance(value,str) or not value or Path(value).is_absolute():raise SystemExit(f"{label} must be relative")
 raw=base/value
 if raw.is_symlink():raise SystemExit(f"{label} symlink forbidden")
 path=raw.resolve(strict=True)
 if not path.is_relative_to(base.resolve()) or not path.is_file() or path.stat().st_nlink!=1:raise SystemExit(f"{label} must be contained regular non-hardlinked file")
 return path
def image_meta(path:Path,fmt:str):
 from PIL import Image
 with Image.open(path) as im: im.load(); actual=im.format; dims=list(im.size)
 if actual!=fmt:raise SystemExit(f"{path.name} decoded as {actual}, expected {fmt}")
 return {"sha256":sha(path),"dimensions":dims}
def verify_review(data,base):
 review=(data.get("reviews") or {}).get("nativePreNormalization")
 if not isinstance(review,dict) or review.get("approved") is not True:raise SystemExit("refusing promotion: normalized asset requires approved native pre-normalization review evidence")
 for key in ("sourceManifest","sourceSheet"):
  item=review.get(key) or {}; path=Path(item.get("path",""))
  if not path.is_file() or path.is_symlink() or path.stat().st_nlink!=1 or sha(path)!=item.get("sha256"):raise SystemExit(f"refusing promotion: forged or stale native review {key}")
 for key in ("reviewArtifact","evidence"):
  item=review.get(key) or {}; path=regular(base,item.get("file",""),f"reviews.nativePreNormalization.{key}")
  if sha(path)!=item.get("sha256"):raise SystemExit(f"refusing promotion: forged native review {key}")
 # Evidence JSON is hashed before its own pointer is attached; verify its binding fields.
 evidence=json.loads(regular(base,review["evidence"]["file"],"native review evidence").read_text())
 for key in ("approved","sourceManifest","sourceSheet","reviewArtifact"):
  if evidence.get(key)!=review.get(key):raise SystemExit("refusing promotion: native review evidence does not match manifest")
def main():
 p=argparse.ArgumentParser();p.add_argument("manifest",type=Path);p.add_argument("--target-dir",type=Path,required=True);p.add_argument("--asset-name",required=True);p.add_argument("--approve",action="store_true");p.add_argument("--dry-run",action="store_true");p.add_argument("--allow-source-candidate",action="store_true");p.add_argument("--usage",choices=["production-approved"],default="production-approved");p.add_argument("--allow-missing-native-review",action="store_true");a=p.parse_args()
 if not SAFE.fullmatch(a.asset_name) or a.asset_name in {".",".."}:raise SystemExit("--asset-name must be a safe flat filename prefix")
 if not a.approve and not a.dry_run:raise SystemExit("promotion requires --approve or --dry-run")
 manifest=a.manifest.resolve();validate(manifest);data=json.loads(manifest.read_text());base=manifest.parent
 usage=(data.get("provenance") or {}).get("usage")
 if usage!="production-approved" and not (usage=="source-candidate" and a.allow_source_candidate):raise SystemExit(f"refusing promotion: provenance.usage={usage!r} is not production-approved")
 if (data.get("lineage") or {}).get("normalization") and not a.allow_missing_native_review:verify_review(data,base)
 artifacts=data.get("artifacts") or {};sv=artifacts.get("sheet");sheet=regular(base,sv.get("file") if isinstance(sv,dict) else sv,"artifacts.sheet")
 pv=artifacts.get("previewGif");preview=regular(base,pv.get("file") if isinstance(pv,dict) else pv,"artifacts.previewGif") if pv else None
 target=a.target_dir.expanduser().resolve()
 if target.exists():raise SystemExit("target directory already exists; atomic promotion requires a new directory")
 if a.dry_run:print(json.dumps({"ok":True,"dryRun":True,"target":str(target)}));return 0
 target.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix=f".{a.asset_name}-",dir=target.parent) as raw:
  stage=Path(raw)/"publish";stage.mkdir();sheet_name=f"{a.asset_name}-sprite-sheet.png";shutil.copy2(sheet,stage/sheet_name)
  promoted=json.loads(json.dumps(data));promoted["name"]=a.asset_name;promoted["schemaVersion"]=2;promoted["provenance"]={**(promoted.get("provenance") or {}),"usage":"production-approved","sourceWorkflow":str(base)}
  promoted_frames=[]
  for i,frame in enumerate(data.get("frames",[])):
   src=regular(base,frame.get("file"),f"frames[{i}].file");name=f"{a.asset_name}-frame-{i:04d}.png";shutil.copy2(src,stage/name);meta=image_meta(stage/name,"PNG");promoted_frames.append({**frame,"file":name,**meta})
  promoted["frames"]=promoted_frames;promoted["frameCount"]=len(promoted_frames);promoted["artifacts"]={"sheet":{"file":sheet_name,**image_meta(stage/sheet_name,"PNG")}}
  if preview:
   name=f"{a.asset_name}-preview.gif";shutil.copy2(preview,stage/name);promoted["artifacts"]["previewGif"]={"file":name,**image_meta(stage/name,"GIF")}
  out=stage/f"{a.asset_name}-manifest.json";out.write_text(json.dumps(promoted,indent=2,ensure_ascii=False)+"\n");validate(out);stage.rename(target)
 print(json.dumps({"ok":True,"manifest":str(target/f'{a.asset_name}-manifest.json')}));return 0
if __name__=="__main__":raise SystemExit(main())
