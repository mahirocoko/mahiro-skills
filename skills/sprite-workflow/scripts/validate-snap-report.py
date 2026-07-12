#!/usr/bin/env python3
import argparse, hashlib, json
from pathlib import Path
REVISION="92173f04a14dfb58081694d8c0351cd1a51ee1a0"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def regular(p):return p.is_file() and not p.is_symlink() and p.stat().st_nlink==1
def metrics(image,scale):
 pixels=image.load();total=exact=0;agreement=0.0
 for y in range(0,image.height,scale):
  for x in range(0,image.width,scale):
   counts={}
   for yy in range(y,y+scale):
    for xx in range(x,x+scale):counts[pixels[xx,yy]]=counts.get(pixels[xx,yy],0)+1
   count=max(counts.values());cells=scale*scale;agreement+=count/cells;exact+=count==cells;total+=1
 return agreement/total,exact/total
def main():
 p=argparse.ArgumentParser();p.add_argument("report");p.add_argument("--json",action="store_true");a=p.parse_args();errors=[]
 try:data=json.loads(Path(a.report).read_text())
 except Exception as e:data={};errors.append(f"invalid report JSON: {e}")
 if data.get("schemaVersion")!=2:errors.append("schemaVersion must be 2")
 if data.get("status") not in ("inspected","recovered"):errors.append("report is not successful")
 alg=data.get("algorithm",{})
 if alg.get("upstreamRevision")!=REVISION:errors.append("unexpected upstream revision")
 if "not exact Rust parity" not in alg.get("relationship",""):errors.append("honest parity qualification missing")
 try:
  from PIL import Image
  source=Path((data.get("source") or {}).get("path",""));
  if not regular(source) or sha(source)!=(data.get("source") or {}).get("sha256"):raise ValueError("source hash mismatch or unsafe source")
  with Image.open(source) as im:im.load();fmt=im.format;rgba=im.convert("RGBA")
  if fmt!="PNG" or list(rgba.size)!=(data.get("source") or {}).get("dimensions"):errors.append("source decoded type/dimensions mismatch")
  scale=data.get("selectedScale");cuts=data.get("cuts") or {}
  if not isinstance(scale,int) or scale<2 or rgba.width%scale or rgba.height%scale:errors.append("selected scale is invalid")
  else:
   agreement,exact=metrics(rgba,scale)
   if abs(agreement-data.get("agreement",-1))>1e-9 or abs(exact-data.get("exactCellRatio",-1))>1e-9:errors.append("reported confidence geometry was tampered")
   expected=[rgba.width//scale,rgba.height//scale]
   if cuts.get("source")!=[0,0,rgba.width,rgba.height] or cuts.get("cell")!=[scale,scale] or cuts.get("nativeDimensions")!=expected:errors.append("cut geometry mismatch")
   confidence="high" if agreement==1 and exact==1 else "acceptable"
   if data.get("confidence")!=confidence:errors.append("confidence mismatch")
  if data.get("status")=="recovered":
   out=data.get("output") or {};op=Path(out.get("path",""))
   if not regular(op) or sha(op)!=out.get("sha256"):errors.append("output hash mismatch or unsafe output")
   else:
    with Image.open(op) as oi:oi.load();od=list(oi.size);of=oi.format
    if of!="PNG" or od!=cuts.get("nativeDimensions") or out.get("dimensions")!=od:errors.append("output decoded type/dimensions mismatch")
   if source.resolve()==op.resolve():errors.append("source overwrite recorded")
 except Exception as e:errors.append(str(e))
 payload={"ok":not errors,"errors":errors,"report":str(Path(a.report).resolve())};print(json.dumps(payload,sort_keys=True) if a.json else ("OK" if not errors else "\n".join(errors)));return 0 if not errors else 1
if __name__=="__main__":raise SystemExit(main())
