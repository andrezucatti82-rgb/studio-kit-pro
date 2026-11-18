"""Audit logical frame edges. Writes presentation metadata, never image files."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict,Counter
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[2]/'dist'
catalog=json.loads((root/'catalog.json').read_text());sources=defaultdict(list)
for s in catalog['styles']:
 for i,f in enumerate(s.get('sequence',{}).get('frames',[])):sources[f['src']].append((s['id'],i,f))
def white_line(image,box):
 p=list(image.crop(box).getdata());step=max(1,len(p)//256);p=p[::step]
 return sum(min(v)>=224 and max(v)-min(v)<=30 for v in p)/len(p)>=.94 and not any(min(v)<160 for v in p)
def scan(entry):
 src,frames=entry;raw=(root/src).read_bytes();out=[];partial=[]
 with Image.open(root/src) as opened:
  im=opened.convert('RGB');W,H=im.size
  for sid,i,f in frames:
   x,y,w,h=f.get('crop',[0,0,1,1]);box=(round(x*W),round(y*H),round((x+w)*W),round((y+h)*H));panel=im.crop(box);pw,ph=panel.size;limit=min(24,max(2,round(min(pw,ph)*.035)))
   strips=[lambda d:(d,0,d+1,ph),lambda d:(0,d,pw,d+1),lambda d:(pw-d-1,0,pw-d,ph),lambda d:(0,ph-d-1,pw,ph-d)]
   depths=[]
   for strip in strips:
    d=0
    while d<=limit and white_line(panel,strip(d)):d+=1
    depths.append(d)
   bounded=[d if 0<d<=limit else 0 for d in depths]
   if any(bounded):
    l,t,r,b=bounded;vw,vh=pw-l-r,ph-t-b
    if vw/pw<.92 or vh/ph<.92:continue
    vx=max(x,(box[0]+l)/W);vy=max(y,(box[1]+t)/H);vr=min(x+w,(box[2]-r)/W);vb=min(y+h,(box[3]-b)/H)
    vw,vh=round((vr-vx)*W,6),round((vb-vy)*H,6)
    crop=[round(vx,9),round(vy,9),round(vr-vx,9),round(vb-vy,9)]
    out.append({'style':sid,'frame':i,'source':src,'sourceSha256':hashlib.sha256(raw).hexdigest(),'insetPixels':[l,t,r,b],'view':[crop,vw,vh]})
   elif sum(0<d<=limit for d in depths)>=2:partial.append({'style':sid,'frame':i,'source':src,'depths':depths,'limit':limit})
 return out,partial
found=[];partial=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 for n,(a,b) in enumerate(pool.map(scan,sources.items()),1):
  found.extend(a);partial.extend(b)
  if n%500==0:print(json.dumps({'sourcesScanned':n,'boundedFrames':len(found)}),flush=True)
presentation={}
for r in found:presentation.setdefault(r['style'],{})[str(r['frame'])]=r['view']
(root/'frame-presentation.js').write_text('/* Thin neutral borders are omitted only in the UI; original media is unchanged. */\nwindow.AtlasFramePresentation='+json.dumps(presentation,separators=(',',':'))+';\n')
report={'styleCount':len(catalog['styles']),'frameCount':sum(len(v) for v in sources.values()),'sourceCount':len(sources),'adjustedFrames':len(found),'adjustedStyles':len(presentation),'criterion':'continuous neutral light edge strips with94% edge coverage and no sampled pixel darker than160; each bounded within3.5%/24px; at least92% of each dimension retained; no extra image pixels removed','imageFilesModified':False,'frames':found,'partialCandidates':partial}
Path(__file__).with_name('report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['styleCount','frameCount','sourceCount','adjustedFrames','adjustedStyles']}))
