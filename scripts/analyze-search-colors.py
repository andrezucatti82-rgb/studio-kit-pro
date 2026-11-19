"""Measure reference-frame colors for discovery; never write or edit media."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from PIL import Image
import colorsys,hashlib,json

root=Path(__file__).resolve().parents[1];dist=root/'style-atlas/dist';catalog=json.loads((dist/'catalog.json').read_text())
presentation=json.loads((dist/'frame-presentation.js').read_text().split('window.AtlasFramePresentation=',1)[1].strip().rstrip(';'))
def name(rgb):
 r,g,b=(v/255 for v in rgb);h,l,s=colorsys.rgb_to_hls(r,g,b);h*=360
 if l<.13:return 'preto'
 if l>.95:return 'branco'
 if l>.86 and s<.5:return 'off-white'
 if s<.12:return 'cinza'
 if h<15 or h>=345:return 'vinho' if l<.35 else 'vermelho'
 if h<45:return 'marrom' if l<.45 else 'bege' if l>.75 and s<.6 else 'laranja'
 if h<70:return 'bege' if l>.7 and s<.5 else 'amarelo'
 if h<170:return 'verde'
 if h<200:return 'turquesa'
 if h<260:return 'azul'
 if h<300:return 'roxo'
 return 'vinho' if l<.35 else 'rosa'
def analyze(style):
 i=style['sequence'].get('heroIndex',1);frame=style['sequence']['frames'][i];path=dist/frame['src'];raw=path.read_bytes()
 crop=presentation.get(style['id'],{}).get(str(i),[frame.get('crop',[0,0,1,1])])[0]
 with Image.open(path) as opened:
  im=opened.convert('RGB');w,h=im.size;x,y,cw,ch=crop;panel=im.crop((round(x*w),round(y*h),round((x+cw)*w),round((y+ch)*h)))
  panel.thumbnail((96,128));counts=Counter(name(pixel) for pixel in (panel.get_flattened_data() if hasattr(panel,'get_flattened_data') else panel.getdata()));total=sum(counts.values())
  colors=[{'tag':tag,'share':round(count/total,4)} for tag,count in counts.most_common(5) if count/total>=.12]
  if not colors:tag,count=counts.most_common(1)[0];colors=[{'tag':tag,'share':round(count/total,4)}]
 return style['id'],{'frame':i,'source':frame['src'],'sourceSha256':hashlib.sha256(raw).hexdigest(),'crop':crop,'colors':colors}
with ThreadPoolExecutor(max_workers=4) as pool:styles=dict(pool.map(analyze,catalog['styles']))
result={'version':1,'method':'dominant named-color bins from the complete logical principal frame; thumbnail statistics only, not object/skin segmentation or audiovisual review','minimumShare':.12,'imageFilesModified':False,'styles':styles}
(root/'style-atlas/records/search/colors.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'referenceFramesAnalyzed':len(styles),'colorAssociations':sum(len(s['colors']) for s in styles.values()),'imageFilesModified':False}))
