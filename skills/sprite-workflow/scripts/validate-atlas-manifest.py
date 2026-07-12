#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def safe(p):return p.is_file() and not p.is_symlink() and p.stat().st_nlink==1
def main():
 p=argparse.ArgumentParser();p.add_argument("manifest");p.add_argument("--json",action="store_true");a=p.parse_args();errors=[];path=Path(a.manifest).resolve()
 try:data=json.loads(path.read_text())
 except Exception as e:data={};errors.append(f"invalid manifest JSON: {e}")
 try:
  from PIL import Image
  source_meta=data.get("sourceManifest") or {};source_path=Path(source_meta.get("path",""))
  if source_meta.get("usage")!="production-approved":errors.append("source usage is not production-approved")
  if not safe(source_path) or sha(source_path)!=source_meta.get("sha256"):raise ValueError("source manifest hash mismatch or unsafe source manifest")
  source=json.loads(source_path.read_text())
  if (source.get("provenance") or {}).get("usage")!="production-approved":errors.append("loaded source manifest is not production-approved")
  atlas_meta=data.get("atlas") or {};atlas_path=Path(atlas_meta.get("path",""))
  if not safe(atlas_path) or sha(atlas_path)!=atlas_meta.get("sha256"):raise ValueError("atlas hash mismatch or unsafe atlas")
  with Image.open(atlas_path) as ai:ai.load();fmt=ai.format;atlas=ai.convert("RGBA")
  if fmt!="PNG" or atlas_meta.get("dimensions")!=list(atlas.size):errors.append("atlas decoded type/dimensions mismatch")
  source_frames=source.get("frames") or [];reported=data.get("frames") or []
  if len(reported)!=len(source_frames):errors.append("atlas/source frame count mismatch")
  ids=set();keys=set();rects=[]
  base=source_path.parent.resolve()
  for order,(frame,src) in enumerate(zip(reported,source_frames)):
   fid=frame.get("id");key=(frame.get("state"),frame.get("index"))
   if fid in ids or key in keys:errors.append(f"duplicate frame identity: {fid}")
   ids.add(fid);keys.add(key)
   if (fid,key)!=(src.get("id"),(src.get("state"),src.get("index"))):errors.append(f"source identity/order mismatch: {fid}")
   raw=base/src.get("file","")
   if raw.is_symlink():errors.append(f"unsafe source frame: {fid}");continue
   sp=raw.resolve()
   if not sp.is_relative_to(base) or not safe(sp) or sha(sp)!=src.get("sha256") or frame.get("sourceSha256")!=src.get("sha256"):errors.append(f"source frame hash/path mismatch: {fid}");continue
   with Image.open(sp) as si:si.load();sfmt=si.format;simg=si.convert("RGBA")
   rect=frame.get("rect") or []
   if sfmt!="PNG" or len(rect)!=4 or rect[2:]!=list(simg.size) or rect[0]<0 or rect[1]<0 or rect[0]+rect[2]>atlas.width or rect[1]+rect[3]>atlas.height:errors.append(f"rect/source dimensions invalid: {fid}");continue
   if frame.get("source")!=src.get("file"):errors.append(f"source filename mismatch: {fid}")
   expected_anchor=[rect[0]+src["anchor"][0],rect[1]+src["anchor"][1]]
   if frame.get("anchor")!=expected_anchor:errors.append(f"anchor mismatch: {fid}")
   for old in rects:
    if rect[0]<old[0]+old[2] and old[0]<rect[0]+rect[2] and rect[1]<old[1]+old[3] and old[1]<rect[1]+rect[3]:errors.append(f"overlapping rect: {fid}")
   rects.append(rect)
   if atlas.crop((rect[0],rect[1],rect[0]+rect[2],rect[1]+rect[3])).tobytes()!=simg.tobytes():errors.append(f"atlas pixels differ from source: {fid}")
  if data.get("transformPolicy")!={"scaling":False,"trimming":False,"rotation":False}:errors.append("transform policy must forbid scaling, trimming, and rotation")
 except Exception as e:errors.append(str(e))
 payload={"ok":not errors,"errors":errors,"manifest":str(path)};print(json.dumps(payload,sort_keys=True) if a.json else ("OK" if not errors else "\n".join(errors)));return 0 if not errors else 1
if __name__=="__main__":raise SystemExit(main())
