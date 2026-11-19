"""Audit logical frame edges. Writes presentation metadata, never image files."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict,Counter
from statistics import median
from PIL import Image
import json,hashlib
root=Path(__file__).resolve().parents[2]/'dist'
catalog=json.loads((root/'catalog.json').read_text());sources=defaultdict(list)
for s in catalog['styles']:
 for i,f in enumerate(s.get('sequence',{}).get('frames',[])):sources[f['src']].append((s['id'],i,f))
def white_line(image,box,warm=False,transition=False):
 p=list(image.crop(box).getdata());step=max(1,len(p)//256);p=p[::step]
 minimum,tint,coverage=(190,60,.75) if transition else (190,60,.98) if warm else (224,30,.94)
 return sum(min(v)>=minimum and max(v)-min(v)<=tint for v in p)/len(p)>=coverage and not any(min(v)<160 for v in p)
def light_fringe(image,outer_box,inner_box):
 outer=list(image.crop(outer_box).getdata());inner=list(image.crop(inner_box).getdata())
 # Ignore the ends, where a perpendicular border can mask the edge transition.
 margin=max(1,len(outer)//24);step=max(1,len(outer)//256)
 differences=[(sum(a)-sum(b))/3 for a,b in zip(outer[margin:-margin:step],inner[margin:-margin:step])]
 return bool(differences) and median(differences)>=17 and sum(d>=12 for d in differences)/len(differences)>=.70
def light_transition(image,strip,depth):
 # A thin standalone line can fall just below the white threshold after export.
 # Require a consistent drop over the edge to distinguish it from pale scenery.
 pixels=list(image.crop(strip(depth)).getdata());margin=max(1,len(pixels)//24)
 pixels=pixels[margin:-margin:max(1,len(pixels)//256)]
 return bool(pixels) and sum(min(p)>=185 and max(p)-min(p)<=60 for p in pixels)/len(pixels)>=.75 and light_fringe(image,strip(depth),strip(depth+1))
def scan(entry):
 src,frames=entry;raw=(root/src).read_bytes();out=[];partial=[]
 with Image.open(root/src) as opened:
  im=opened.convert('RGB');W,H=im.size
  for sid,i,f in frames:
   x,y,w,h=f.get('crop',[0,0,1,1]);box=(round(x*W),round(y*H),round((x+w)*W),round((y+h)*H));panel=im.crop(box);pw,ph=panel.size;limit=min(24,max(2,round(min(pw,ph)*.035)))
   strips=[lambda d:(d,0,d+1,ph),lambda d:(0,d,pw,d+1),lambda d:(pw-d-1,0,pw-d,ph),lambda d:(0,ph-d-1,pw,ph-d)]
   def edge_depths(warm=False):
    depths=[]
    for strip in strips:
     d=0
     while d<=limit and white_line(panel,strip(d),warm):d+=1
     depths.append(d)
    return depths,[d if 0<d<=limit else 0 for d in depths]
   depths,bounded=edge_depths();warm_depths,warm_bounded=edge_depths(True)
   warm_frame=sum(d>=2 for d in warm_bounded)>=3
   fringes=[]
   if warm_frame:
    bounded=[max(a,b) for a,b in zip(bounded,warm_bounded)]
    # A coherent frame can end in one antialiased light row/column. Omit it
    # only with measured light coverage and the same dark-content veto.
    for edge,d in enumerate(bounded):
     if warm_bounded[edge] and d<limit and white_line(panel,strips[edge](d),transition=True):bounded[edge]+=1
   for edge,d in enumerate(bounded):
    strip=strips[edge]
    # The bright outer strip can have one or two translucent pixels underneath.
    # Include them on confirmed borders even when only one side has a line.
    if d==0 and depths[edge]==0 and warm_depths[edge]<=limit:
     warm_depth=warm_bounded[edge]
     if warm_depth and light_transition(panel,strip,warm_depth-1):d=warm_depth
     elif light_transition(panel,strip,0):d=1
    for _ in range(2):
     if not 0<d<limit or not light_fringe(panel,strip(d),strip(d+1)):break
     d+=1
    if d>bounded[edge]:bounded[edge]=d;fringes.append(edge)
   if any(bounded):
    # Resampling a scaled panel may blend neighboring source pixels. Give only
    # confirmed borders a small safety inset so that the light line stays out.
    bounded=[min(limit,d+2) if d else 0 for d in bounded]
    l,t,r,b=bounded;vw,vh=pw-l-r,ph-t-b
    if vw/pw<.92 or vh/ph<.92:continue
    vx=max(x,(box[0]+l)/W);vy=max(y,(box[1]+t)/H);vr=min(x+w,(box[2]-r)/W);vb=min(y+h,(box[3]-b)/H)
    vw,vh=round((vr-vx)*W,6),round((vb-vy)*H,6)
    crop=[round(vx,9),round(vy,9),round(vr-vx,9),round(vb-vy,9)]
    rule='coherent_light_frame' if warm_frame else 'neutral_strips' if any(depths) else 'light_transition'
    record={'style':sid,'frame':i,'source':src,'sourceSha256':hashlib.sha256(raw).hexdigest(),'insetPixels':[l,t,r,b],'edgeRule':rule,'view':[crop,vw,vh]}
    if fringes:record['fringeEdges']=fringes
    out.append(record)
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
report={'styleCount':len(catalog['styles']),'frameCount':sum(len(v) for v in sources.values()),'sourceCount':len(sources),'adjustedFrames':len(found),'adjustedStyles':len(presentation),'criterion':'Neutral strips require 94% coverage/min224/tint30. Coherent warm frames require 98% coverage/min190/tint60 and at least 3 bounded sides of 2px or more. An isolated light strip requires 75% coverage/min185/tint60 and a matching transition. On any confirmed border, trim up to two further pixels while the median brightness falls by at least 17 and 70% of positions fall by at least 12, then inset two pixels to avoid resampling the line. Each side is bounded to 3.5%/24px and each dimension retains at least 92%.','imageFilesModified':False,'frames':found,'partialCandidates':partial}
Path(__file__).with_name('report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['styleCount','frameCount','sourceCount','adjustedFrames','adjustedStyles']}))
