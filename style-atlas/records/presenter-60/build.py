"""Build original editing studies. No client/reference image is read or altered."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
import copy,json,hashlib,math,textwrap
from recipes import ROWS,SECTORS

ROOT=Path(__file__).resolve().parents[3];DIST=ROOT/'style-atlas/dist';OUT=Path(__file__).parent
def font(size,bold=False):return ImageFont.truetype(str(ROOT/'public/fonts'/('Geist-Bold.ttf' if bold else 'Geist-Regular.ttf')),size)
def rgb(s):return tuple(int(s[i:i+2],16) for i in (1,3,5))
def text(d,xy,value,size=23,fill='#FFFFFF',bold=False,width=34):
 for i,line in enumerate(textwrap.wrap(value,width=width)):d.text((xy[0],xy[1]+i*(size+8)),line,font=font(size,bold),fill=fill)
def panel(im,box,tint,opacity=195):
 # Optical composition built from the original procedural canvas, not an edited photo.
 layer=Image.new('RGBA',im.size);d=ImageDraw.Draw(layer);d.rounded_rectangle(box,24,fill=(*rgb(tint),opacity),outline=(255,255,255,95),width=2)
 shadow=Image.new('RGBA',im.size);ImageDraw.Draw(shadow).rounded_rectangle((box[0]+4,box[1]+14,box[2]+4,box[3]+14),24,fill=(0,0,0,45));im.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(15)));im.alpha_composite(layer)
def line(d,points,color,width=3):d.line(points,fill=color,width=width,joint='curve')
def icon(d,cx,cy,kind,color,scale=1):
 r=28*scale
 if kind in ['product','texture','ritual']:
  d.rounded_rectangle((cx-r*.6,cy-r,cx+r*.6,cy+r),6,outline=color,width=3);d.rectangle((cx-r*.35,cy-r*1.3,cx+r*.35,cy-r),fill=color)
 elif kind=='floorplan':
  d.rectangle((cx-r,cy-r,cx+r,cy+r),outline=color,width=3);line(d,[(cx,cy-r),(cx,cy+r*.4),(cx+r,cy+r*.4)],color);line(d,[(cx-r,cy),(cx,cy)],color)
 elif kind in ['tooth','section']:
  pts=[(cx-r,cy-r*.6),(cx-r*.8,cy-r),(cx,cy-r*.7),(cx+r*.8,cy-r),(cx+r,cy-r*.5),(cx+r*.6,cy+r),(cx+r*.25,cy+r),(cx,cy+r*.2),(cx-r*.25,cy+r),(cx-r*.6,cy+r),(cx-r,cy-r*.6)];line(d,pts,color,4)
 elif kind in ['document','interface','menu']:
  d.rounded_rectangle((cx-r,cy-r*1.2,cx+r,cy+r*1.2),6,outline=color,width=3)
  for k in range(3):line(d,[(cx-r*.6,cy-r*.6+k*r*.55),(cx+r*.6,cy-r*.6+k*r*.55)],color,2)
 elif kind in ['fabric','materials']:
  d.polygon([(cx-r,cy-r),(cx+r*.7,cy-r*.7),(cx+r,cy+r),(cx-r*.7,cy+r*.6)],outline=color,width=3)
  for k in range(3):line(d,[(cx-r*.6+k*12,cy-r*.6),(cx-r*.4+k*12,cy+r*.5)],color,1)
 else:
  d.ellipse((cx-r,cy-r,cx+r,cy+r),outline=color,width=3);line(d,[(cx-r*.45,cy),(cx,cy+r*.4),(cx+r*.55,cy-r*.4)],color,3)
def figure(im,x,y,color,step):
 # Quiet silhouette indicates the real video position; it is not an avatar or identity asset.
 lay=Image.new('RGBA',im.size);d=ImageDraw.Draw(lay);c=(*rgb(color),115)
 d.ellipse((x-25,y-70,x+25,y-14),fill=c);d.rounded_rectangle((x-45,y-9,x+45,y+130),30,fill=c)
 line(d,[(x+35,y+25),(x+83,y+12-step*6)],c,15);line(d,[(x-35,y+25),(x-60,y+100)],c,14);im.alpha_composite(lay)
def draw_frame(index,step,row,profile):
 slug,sector,name,mechanism,route,topic,action,requirements=row;dark,accent,paper=profile['colors'];W,H=600,1066
 im=Image.new('RGBA',(W,H));d=ImageDraw.Draw(im)
 for y in range(H):
  t=y/H;base=rgb(dark);d.line((0,y,W,y),fill=tuple(int(c+(22 if k==0 else 17)*t) for k,c in enumerate(base)))
 for k in range(5):d.line((36,230+k*128,564,230+k*128),fill=(*rgb(accent),25),width=1)
 text(d,(36,30),f'{index+1:02} / {profile["name"].upper()}',16,accent,True,48)
 text(d,(36,77),name,39,paper,True,23);text(d,(36,185),'ESTUDO DE COMPOSIÇÃO · SEU VÍDEO ORIGINAL',13,accent,width=55)
 panel(im,(32,230,568,878),paper,242);d=ImageDraw.Draw(im)
 # Existing footage remains the base; a silhouetted layout marker avoids invented scenery.
 figure(im,111,700,dark,step);d=ImageDraw.Draw(im);text(d,(51,847),'APRESENTADOR / ORIGINAL PRESERVADO',12,dark,width=48)
 text(d,(56,262),['CONTEXTO','DEMONSTRAÇÃO','INTERAÇÃO','SÍNTESE'][step],15,dark,True,30)
 progress=step+1;cx,cy=326,495
 if mechanism in ['floorplan','dimensions','model']:
  corners=[(175,390),(414,353),(483,605),(212,642)]
  if mechanism=='model':
   d.polygon([(195,447),(367,407),(475,460),(302,509)],fill=(*rgb(accent),230),outline=dark);d.polygon([(195,447),(302,509),(302,627),(195,566)],fill=(*rgb(dark),230));d.polygon([(302,509),(475,460),(475,579),(302,627)],fill=(*rgb(accent),150));line(d,[(216,460),(216,539),(276,573),(276,495)],paper,3)
  else:
   line(d,corners+[corners[0]],dark,4);line(d,[(293,372),(330,624)],dark,3);line(d,[(193,510),(453,465)],dark,3)
   if step>0:d.polygon([(194,511),(315,490),(332,624),(212,642)],fill=(*rgb(accent),110),outline=dark)
   if step>1:line(d,[(200,676),(474,634)],dark,2);text(d,(240,675),'COTA CONFERIDA',15,dark,True,25)
  text(d,(175,328),'PROJETO ILUSTRATIVO',14,dark,width=36)
 elif mechanism=='headline':
  text(d,(70,361),['LOCAL','ESPAÇO','CONTEXTO','ESCOLHA'][step],67,dark,True,14);figure(im,300,565,dark,step);d=ImageDraw.Draw(im)
  if step>1:line(d,[(418,532),(492,492)],dark,2);text(d,(396,464),'DETALHE',15,dark,True)
 elif mechanism in ['tooth','section']:
  for k in range(progress):
   yy=385+k*69;panel(im,(177,yy,487,yy+52),paper,145);d=ImageDraw.Draw(im);icon(d,220,yy+26,mechanism,dark,.55);text(d,(257,yy+17),['ESTRUTURA','FUNÇÃO','RELAÇÃO','RESUMO'][k],18,dark,True,22)
  text(d,(172,708),'ESQUEMA SUJEITO A REVISÃO',13,dark,width=34)
 elif mechanism in ['materials','ingredients','fabric','texture']:
  for k in range(progress):
   xx=173+k*69;yy=374+k*51;d.polygon([(xx,yy),(xx+116,yy-11),(xx+134,yy+155),(xx+13,yy+170)],fill=(*rgb([accent,dark,paper,accent][k]),220),outline=dark,width=2)
   for j in range(7):line(d,[(xx+15+j*13,yy+15),(xx+28+j*13,yy+145)],(*rgb(dark),60),1)
  text(d,(176,716),'TEXTURA / MATERIAL REAL',14,dark,True,32)
 elif mechanism in ['product','ritual']:
  icon(d,330,485,mechanism,dark,2.2)
  for k in range(progress):
   yy=357+k*91;line(d,[(380,yy+50),(463,yy+24)],dark,2);d.ellipse((456,yy+16,472,yy+32),fill=accent,outline=dark);text(d,(420,yy-3),str(k+1).zfill(2),16,dark,True)
 elif mechanism in ['trajectory','wave','callouts']:
  points=[(173,615),(251,542-step*14),(329,555),(408,401),(479,365)]
  line(d,points[:min(5,progress+1)],dark,5)
  for k,(xx,yy) in enumerate(points[:min(5,progress+1)]):d.ellipse((xx-10,yy-10,xx+10,yy+10),fill=accent,outline=dark,width=2)
  text(d,(173,713),'GESTO / TEMPO CONFERIDO',14,dark,True,33)
 elif mechanism=='orbit':
  d.ellipse((175,351,493,655),outline=dark,width=2)
  for k in range(progress):
   a=k*math.pi/2-.6;xx=334+math.cos(a)*146;yy=503+math.sin(a)*130;d.ellipse((xx-28,yy-28,xx+28,yy+28),fill=paper,outline=dark,width=2);text(d,(xx-6,yy-12),str(k+1),20,dark,True)
 elif mechanism=='dialogue':
  panel(im,(176,355,487,467),paper,150);panel(im,(213,513,519,640),paper,165);d=ImageDraw.Draw(im);text(d,(197,379),'PERGUNTA',23,dark,True);text(d,(235,541),['OUVIR','EXPLICAR','RELACIONAR','ORIENTAR'][step],22,dark,True)
 elif mechanism in ['document','interface','menu']:
  panel(im,(175,344,509,700),paper,160);d=ImageDraw.Draw(im);text(d,(196,372),'DOCUMENTO' if mechanism=='document' else 'INFORMAÇÃO REAL',17,dark,True)
  for k in range(progress):
   yy=426+k*55;line(d,[(196,yy),(480-k*16,yy)],dark,3)
   if k==step:d.rounded_rectangle((190,yy-14,483,yy+18),5,outline=accent,width=3)
 elif mechanism=='compare':
  for k in range(2):panel(im,(175+k*170,365,325+k*170,649),paper,150)
  d=ImageDraw.Draw(im);text(d,(202,406),'A',45,dark,True);text(d,(371,406),'B',45,dark,True);line(d,[(194,530),(300,530)],accent,5);line(d,[(363,548-step*15),(468,548-step*15)],dark,5)
 else:
  points=[(203,380),(462,452),(221,551),(464,643)]
  for k,(xx,yy) in enumerate(points[:progress]):
   if k:line(d,[points[k-1],(xx,yy)],dark,3)
   d.ellipse((xx-25,yy-25,xx+25,yy+25),fill=paper,outline=dark,width=2);text(d,(xx-6,yy-12),str(k+1),19,dark,True)
 text(d,(37,909),['O contexto orienta a pergunta.','O elemento demonstra a ideia.','A ação responde à fala ou ao gesto.','A conclusão permanece legível.'][step],22,paper,width=38)
 text(d,(37,1014),'CONCEITO · movimento, voz e som ainda não produzidos',13,accent,width=66)
 return im.convert('RGB')

BOARDS={'corretores':('espacos-produtos',0),'arquitetos':('espacos-produtos',50),'lojas':('espacos-produtos',100),'dentistas':('saude-cuidados',0),'esteticas':('saude-cuidados',50),'procedimentos':('saude-cuidados',100),'advogados':('direito-movimento',0),'fitness':('direito-movimento',100),'gastronomia':('sensorial-atelier',0),'pets':('sensorial-atelier',50),'moda':('sensorial-atelier',100),'engenharia':('projetos-eventos',0),'interiores':('projetos-eventos',50),'eventos':('projetos-eventos',100),'educacao':('conhecimento-territorio',0),'agro':('conhecimento-territorio',50),'turismo':('conhecimento-territorio',100)}

def build():
 path=DIST/'catalog.json';c=json.loads(path.read_text());base=[s for s in c['styles'] if s['family']!='explicadores'];assert len(base)==1160
 c['styles']=base;c['version']='4.6';c['families']=[f for f in c['families'] if f['id']!='explicadores']+[{'id':'explicadores','name':'Apresentador e explicação','kind':'Edição com apresentador','count':60}]
 if not any(s['id']=='editia-public-reference' for s in c['research']['sources']):c['research']['sources'].append({'id':'editia-public-reference','title':'EDIT.IA PRO — página e demonstrações públicas','url':'https://editiapro.com/','note':'Referência de recursos e fluxo; trechos públicos examinados sem faixa de áudio.'})
 assets=DIST/'assets/presenter-60';assets.mkdir(exist_ok=True);manifest=[]
 for i,row in enumerate(ROWS):
  slug,sector,name,mechanism,route,topic,action,inputs=row;p=SECTORS[sector];sid='explicador-'+slug
  states=[f'A pessoa situa o assunto: {topic.lower()}.',action,'A relação relevante responde ao tempo da fala; rosto e mãos permanecem livres.',f'A pessoa conclui a ideia e o resumo preserva o contexto de {p["name"].lower()}.']
  frames=[];records=[]
  for k in range(4):
   image=draw_frame(i,k,row,p);src=f'assets/presenter-60/{sid}-{k+1:02}.webp';small=src.replace('.webp','-small.webp');image.save(DIST/src,'WEBP',quality=92);image.resize((300,533)).save(DIST/small,'WEBP',quality=85)
   frames.append({'src':src,'thumbnail':small,'width':600,'height':1066,'label':['Contexto','Demonstração','Interação','Síntese'][k],'alt':f'{p["name"]}: {name}. Estudo de composição. {states[k]}','action':states[k]});records.append({'path':src,'sha256':hashlib.sha256((DIST/src).read_bytes()).hexdigest()})
  environment={'default':'preserve_recorded_environment','allowed':['original_recording','licensed_real_location','identified_contextual_simulation','generated_from_verified_references_if_authorized'],'ordinaryPlausibleSpace':True,'missingOriginal':'research_then_generate_if_authorized','researchRequiredBeforeGeneration':True,'labelGeneratedSimulation':True,'automaticBackgroundReplacement':False,'preserveIdentityAndClothes':True,'externalSimulation':'Use original or licensed exteriors, or explicitly identified simulation with verified references. Do not imply the presenter visited the location.','avoid':['generic AI luxury studio','videogame HUD','unmotivated holograms','invented places or measurements']}
  sound=[{'cue':'contexto estabelecido','sound':'Ambiente real, sem acento obrigatório.','purpose':'Dar presença e contexto.'},{'cue':'demonstração revelada','sound':p['sound'],'purpose':'Marcar a mudança que ajuda a compreensão.'},{'cue':'conclusão','sound':'Resolver o acento e deixar a fala terminar.','purpose':'Separar síntese e próximo passo.'}]
  energy='dynamic' if sector in ['fitness','gastronomia','moda','lojas'] else 'adaptive'
  finish={'visualLanguage':'contextual_editorial','energy':energy,'environment':environment,'palette':p['colors'],'glass':{'type':'glass','fillOpacity':.82,'blurPixels':14,'borderOpacity':.35,'shadowOpacity':.14,'shadowBlur':24},'graphics':{'purposeRequired':True,'primaryActionAtATime':1,'secondaryMotionSupportsPrimary':True,'energyCanIncreaseWithPurpose':True,'allowed':['editable diagrams','verified tables','meaningful icons','real data widgets','motivated motion design'],'noFakeLiveData':True,'faceHandsAndCaptionSafeAreas':True},'voice':{'mode':'preserve_source_or_explicitly_authorized','language':'pt-BR','direction':p['voice']},'music':{'direction':p['music'],'duckUnderSpeech':True,'status':'planned_not_generated'},'soundEvents':sound,'audioReviewRequired':True,'motionReviewRequired':True,'audiovisualProof':False,'socialFinishing':{'controls':{'brightness':1,'contrast':1.02,'saturation':1,'shadowLift':.005,'highlightCompression':.01,'grainAmount':.012,'seed':1},'sourceDependent':True,'skipGrainOnAlreadyNoisyFootage':True},'softHighlights':{'purposeRequired':True,'persistentBodyGlow':False,'maxOpacity':.2},'target':'social_media_not_cinema'}
  policy={'version':2,'recipeId':sid,'sector':sector,'sectorName':p['name'],'mechanism':mechanism,'route':route,'presenterSources':['recorded_video','explicitly_selected_avatar'],'avatarOptInRequired':True,'originalFootageRequired':True,'requiredInputs':[inputs],'narrationRequired':True,'captionsRequired':True,'automaticTranscription':False,'automaticSegmentation':False,'automaticGestureTracking':False,'nativeOperators':['layer_visibility','editable_speech_words','registered_media','source_cut_ranges','supplied_alpha_masks','measured_anchor_tracks','frosted_glass_compositing'],'finishProfile':finish,'professionalConstraints':p['constraints'],'review':['Fala e informação sincronizadas','Um objetivo por elemento','Identidade e ambiente preservados','Som e voz conferidos por escuta','Texto e dados revisados'],'referenceIsExecutionProof':False}
  resources=['Gravação original ou MP4 de avatar explicitamente escolhido',inputs,'Fala real e tempos conferidos','Remotion/FFmpeg, textos e gráficos editáveis','Trilha e SFX próprios ou licenciados, quando usados']
  preset=copy.deepcopy(base[0]['preset']);preset['avatar']=False;preset['brand']='Adaptar à marca e ao ambiente real recebido. Aparência e ritmo variam conforme nicho e mensagem; sem cenário IA por padrão.'
  requirements=f'Preservar rosto, corpo, roupa, voz e ambiente original. Preparar: {inputs}. {p["constraints"]} Extratores automáticos de fala, máscaras e gestos não estão instalados; usar dados reais conferidos. Trilha e SFX descritos são direção, não arquivos gerados.'
  s={'id':sid,'name':name,'family':'explicadores','familyName':'Apresentador e explicação','kind':'Edição com apresentador','edition':'4.6','signature':action,'exampleTopic':f'{p["name"]}: {topic}','uses':f'{p["name"]}; mostrar produtos e serviços, explicar conceitos com pessoa e informação em cena.','resources':resources,'motion':action+' Intensidade adaptada ao nicho; cada movimento tem função e segue fala ou gesto conferido.','complexity':'Alta' if route in ['external_asset','supplied_matte','measured_track'] else 'Média','note':'Estudo original de composição, não cenário filmado, referência de identidade ou vídeo produzido. O ambiente inicial deve vir da gravação ou de referência plausível aprovada.','image':{'atlas':frames[1]['src'],'columns':1,'rows':1,'width':600,'height':1066,'sourceKind':'code','source':'Estudo editorial original em código; não é prova audiovisual.'},'preset':preset,'readiness':{'status':'visual_reference','evidence':'Conceito pendente de aprovação; voz, som e movimento exigem produção e revisão.'},'proof':'Na amostra, provar a ação específica: '+action+' Conferir o ambiente, identidade, legibilidade, função de cada elemento e áudio.','requirements':requirements,'audio':{'voice':p['voice']+' Preservar fala original ou usar voz explicitamente autorizada.','music':p['music'],'sfx':p['sound'],'mix':'Uma única fala inteligível, trilha com ducking quando houver, acentos subordinados à mensagem e escuta integral.','narrationRequired':True,'captionsRequired':True,'status':'planned_not_generated'},'sequence':{'version':1,'heroIndex':1,'theme':topic+' — estudo ilustrativo','frames':frames,'audio':p['voice']+' '+p['music']+' '+p['sound'],'conceptOnly':True,'motionValidated':False,'conceptApproval':'pending_user_review'},'presenterEditing':policy,'researchRefs':['presenter-course-reference','editia-public-reference']}
  board,position=BOARDS[sector];s['artDirection']={'path':f'assets/presenter-60/art/{board}.png','objectPosition':position,'status':'proposed','fictionalPeopleAndPlaces':True,'actualFootageOverrides':True,'use':'Referência exploratória de gráficos e composição, não de identidade, cenário obrigatório ou vídeo executado.'}
  s['executionPlan']={'version':2,'appearance':'Ambiente cotidiano ou filmagem real, informação legível, cor e energia adequadas ao nicho.','categoryDirection':'A mensagem e os originais comandam a composição. Elementos e movimentos têm função; evitar aparência de IA, videogame ou excesso semântico.','referenceStates':[{'frame':k+1,'state':v} for k,v in enumerate(states)],'motionTargets':[{'fromFrame':k+1,'toFrame':k+2,'initialState':states[k],'actionAndResult':states[k+1]} for k in range(3)],'movementLanguage':s['motion'],'resources':resources,'shotPlanFields':['initialState','action','result','sourceTime','narration','editableText','graphicPurpose','gestureAnchor','depth','environmentSource','soundCue','durationFromVoice'],'planningRule':'Planejar por fala e ação, sem divisão uniforme. Alternar energia e pausa conforme a mensagem. Não confundir quantidade de efeitos com qualidade.','textRule':'Cada texto, tabela, valor e ícone deve permanecer editável, com fonte e contraste conferidos no vídeo real.','invariants':preset['productFidelity']+' '+p['constraints'],'validation':requirements,'presenterEditing':policy,'finishProfile':finish,'artDirection':s['artDirection']}
  c['styles'].append(s);manifest.append({'id':sid,'generator':'Original procedural editorial composition','source':'build.py + recipes.py','sector':sector,'motionValidated':False,'frames':records})
 assert len(c['styles'])==1220 and len(manifest)==60
 path.write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n');(OUT/'assets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');(OUT/'sectors.json').write_text(json.dumps(SECTORS,ensure_ascii=False,indent=2)+'\n');print('60 sector directions, 240 original studies; speech, audio and motion remain pending production.')
if __name__=='__main__':build()
