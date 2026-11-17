"""Original schematic direction studies; no source-video frames are redistributed."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, hashlib, copy, textwrap

ROOT=Path(__file__).resolve().parents[3]
DIST=ROOT/'style-atlas/dist'
ROWS=[
 ('diagrama-ao-lado','Diagrama que acompanha a fala','Uma explicação se desenha ao lado da pessoa','diagram','native_layers',[]),
 ('texto-atras','Palavra atrás do apresentador','A palavra surge atrás da cabeça sem cobrir o rosto','behind','supplied_matte',['Máscara temporal do apresentador']),
 ('objeto-na-mao','Objeto apoiado na mão','O objeto acompanha a palma e mantém a escala','hand','measured_track',['Trajetória medida da mão; objeto autorizado']),
 ('toque-e-resposta','Toque que aciona a informação','O dedo encosta e só então a informação responde','touch','measured_track',['Ponto e instante de contato conferidos']),
 ('orbita-frente-tras','Órbita com frente e trás','Elementos alternam oclusão ao circular o apresentador','orbit','supplied_matte',['Máscara temporal e ordem de profundidade']),
 ('produto-em-camadas','Produto explicado por camadas','As partes do produto se separam durante a explicação','exploded','external_asset',['Modelo ou vistas oficiais das partes; não inventar interior']),
 ('corte-tecnico','Corte técnico com apresentador','Um corte esquemático revela relações entre componentes','section','external_asset',['Esquema técnico revisado; dados e partes confirmados']),
 ('lousa-desenhada','Lousa que nasce do gesto','Traços aparecem na ordem do raciocínio','board','native_layers',[]),
 ('fluxograma-vivo','Fluxograma explicado por etapas','Cada etapa ativa a próxima quando é mencionada','flow','native_layers',[]),
 ('dados-no-gesto','Dados que respondem ao gesto','Uma barra cresce e recebe o valor apontado','chart','measured_track',['Dados com fonte; gesto medido e unidades']),
 ('antes-depois','Antes e depois pela mão','O gesto desloca o divisor entre duas versões comparáveis','compare','measured_track',['Duas versões autorizadas e enquadramentos compatíveis']),
 ('mitos-e-fatos','Mitos e fatos em diálogo','A pessoa contrasta duas ideias sem cobrir a fala','contrast','native_layers',[]),
 ('cenario-contextual','Cenário que contextualiza a fala','A pessoa permanece e o ambiente explica o assunto','scene','supplied_matte',['Máscara temporal; fundo licenciado; luz e perspectiva compatíveis']),
 ('apresentador-em-janela','Apresentador e demonstração ampliada','O apresentador dá espaço à demonstração principal','window','native_layers',[]),
 ('zoom-para-interface','Da fala à interface real','A composição aproxima a ação de uma tela autorizada','interface','native_layers',['Captura real ou interface demonstrativa identificada']),
 ('linha-do-tempo','Linha do tempo conduzida pela fala','Marcos avançam conforme os acontecimentos narrados','timeline','native_layers',['Datas e ordem verificadas']),
 ('clones-dialogando','Dois papéis em uma explicação','Takes distintos dialogam com atrasos e identidades preservadas','clones','supplied_matte',['Takes autorizados de cada fala; máscaras; sem inventar depoimento']),
 ('mapa-e-rota','Apresentador conduz a rota','Uma rota esquemática se revela sem esconder o apresentador','route','external_asset',['Mapa e coordenadas verificados para uma rota real']),
 ('metafora-visual','Metáfora que vira explicação','Um objeto visual demonstra uma relação abstrata','metaphor','native_layers',[]),
 ('tres-passos','Três passos com resumo visual','A pessoa apresenta, conecta e resume três ações','steps','native_layers',[]),
]
COLORS=[('#122D3A','#5AE1C6'),('#342449','#F7BE67'),('#17392F','#BDEB91'),('#173855','#67D0F3'),('#2A2143','#EAA3F2')]
font_path=ROOT/'public/fonts/Geist-Regular.ttf';bold_path=ROOT/'public/fonts/Geist-Bold.ttf'
def font(size,bold=False):return ImageFont.truetype(str(bold_path if bold else font_path),size)
def write(d,xy,text,size=25,fill='#FFFFFF',bold=False,width=26):
 for i,line in enumerate(textwrap.wrap(text,width=width)):d.text((xy[0],xy[1]+i*(size+7)),line,font=font(size,bold),fill=fill)
def presenter(d,x,y,scale=1,color='#427E89',pose=0):
 # Entirely original illustrative human; not an identity reference or sampled footage.
 def box(v):return tuple(round(a*scale+(x if i%2==0 else y)) for i,a in enumerate(v))
 skin='#CE9877';d.rounded_rectangle(box((-62,58,62,240)),radius=round(28*scale),fill=color)
 d.ellipse(box((-40,-26,40,62)),fill=skin);d.pieslice(box((-42,-35,42,43)),180,360,fill='#17212C')
 d.ellipse(box((-19,14,-13,20)),fill='#17212C');d.ellipse(box((13,14,19,20)),fill='#17212C')
 d.arc(box((-12,27,13,43)),0,155,fill='#713F32',width=max(1,round(2*scale)))
 d.line([box((-48,96,-78,166))[:2],box((-48,96,-78,166))[2:]],fill=skin,width=round(19*scale))
 hand=(100+pose*6,96-pose*9);d.line([(x+47*scale,y+103*scale),(x+hand[0]*scale,y+hand[1]*scale)],fill=skin,width=round(18*scale));d.ellipse(box((hand[0]-12,hand[1]-8,hand[0]+19,hand[1]+8)),fill=skin)
 return (x+hand[0]*scale,y+hand[1]*scale)
def frame_image(index,step,mechanism,name,action):
 bg,accent=COLORS[index%len(COLORS)];im=Image.new('RGB',(540,960),bg);d=ImageDraw.Draw(im)
 for y in range(130,840,40):d.line((28,y,512,y),fill=tuple(int(bg.lstrip('#')[i:i+2],16)+9 for i in (0,2,4)))
 write(d,(30,27),f'{index+1:02} / APRESENTADOR + EXPLICAÇÃO',17,accent,True,42)
 write(d,(30,64),name,34,bold=True,width=22)
 d.rounded_rectangle((28,181,512,819),18,fill='#F4F0E8')
 navy='#16343F';dark='#294B55';progress=(step+1)/4
 if mechanism=='behind':
  write(d,(51,245),['IDEIA','CLAREZA','EXPLIQUE','ENTENDEU'][step],67,navy,True,12);presenter(d,270,410,1.5,pose=step)
 elif mechanism in ['hand','touch','orbit','metaphor']:
  hand=presenter(d,190,413,1.35,pose=step);ox,oy=hand[0],hand[1]-60
  if mechanism=='orbit':ox=270+(-1 if step%2 else 1)*135;oy=390+step*25
  d.rounded_rectangle((ox-41,oy-48,ox+41,oy+28),13,fill=accent,outline=navy,width=3);d.line((ox-24,oy-15,ox+24,oy-15),fill=navy,width=4)
  if mechanism=='touch':d.ellipse((ox-55-step*6,oy-62-step*6,ox+55+step*6,oy+42+step*6),outline=navy,width=2)
  d.line((hand[0],hand[1],ox,oy+30),fill=navy,width=3);write(d,(58,250),['APONTE','CONECTE','DEMONSTRE','CONCLUA'][step],34,navy,True,20)
 elif mechanism in ['exploded','section']:
  presenter(d,110,636,.64,pose=step)
  for k in range(3):
   yy=335+k*(44+step*26);d.rounded_rectangle((155+k*9,yy,432-k*9,yy+42),12,fill=[navy,accent,dark][k]);write(d,(184,yy+8),f'PARTE {k+1}',18,'#FFFFFF' if k!=1 else navy,True)
  write(d,(54,225),'PARTES VERIFICADAS',24,navy,True,28)
 elif mechanism in ['scene','clones']:
  if mechanism=='scene':
   for k in range(5):d.rounded_rectangle((45+k*96,280-step*12+(k%2)*40,123+k*96,671),8,fill=[accent,'#C9D4CB','#B6C7CB'][k%3])
  else:presenter(d,110,467,.9,color=accent,pose=(step+1)%4);presenter(d,410,467,.9,color=dark,pose=step)
  presenter(d,270,415,1.4,pose=step);write(d,(54,226),'CONTEXTO' if mechanism=='scene' else 'DOIS PONTOS DE VISTA',26,navy,True,27)
 else:
  # Each topic has its own diagram and progression, not a repeated stock cover.
  presenter(d,127 if mechanism!='window' else 420,662,.61,color=dark,pose=step)
  if mechanism in ['chart','compare','contrast']:
   for k in range(3):
    h=(k+1)*45*progress;d.rounded_rectangle((80+k*132,529-h,166+k*132,529),8,fill=accent if k==step%3 else navy);write(d,(91+k*132,548),['A','B','C'][k],27,navy,True)
   write(d,(54,247),'DADOS ILUSTRATIVOS',23,navy,True,26)
  elif mechanism in ['flow','timeline','route','steps']:
   pts=[(115,306),(392,401),(140,515),(397,601)]
   for k,(xx,yy) in enumerate(pts[:step+1]):
    if k:d.line((*pts[k-1],xx,yy),fill=navy,width=7)
    d.ellipse((xx-33,yy-33,xx+33,yy+33),fill=accent,outline=navy,width=3);write(d,(xx-7,yy-16),str(k+1),24,navy,True)
  elif mechanism=='interface':
   d.rounded_rectangle((57,266,480,568),14,fill=navy);d.rectangle((76,290,459,323),fill=accent)
   for k in range(step+1):d.rounded_rectangle((80,345+k*49,441,380+k*49),7,fill='#DEE8E5')
   write(d,(74,235),'INTERFACE DEMONSTRATIVA',18,navy,True,32)
  else:
   for k in range(step+1):
    xx=79+k*93;d.rounded_rectangle((xx,294+k*57,xx+76,365+k*57),10,fill=accent,outline=navy,width=2)
    if k:d.line((xx-17,329+(k-1)*57,xx+9,329+k*57),fill=navy,width=4)
   write(d,(52,234),'A EXPLICAÇÃO SE CONSTRÓI',21,navy,True,30)
 d.rounded_rectangle((56,746,484,790),8,fill=navy);write(d,(74,758),['INÍCIO DA FALA','INFORMAÇÃO ENTRA','AÇÃO E RESPOSTA','IDEIA COMPREENDIDA'][step],17,'#FFFFFF',True,34)
 write(d,(31,840),f'{step+1:02} · '+action,20,'#FFFFFF',False,37)
 write(d,(31,925),'Estudo original em código · movimento não validado',14,accent,width=58)
 return im

def build():
 catalog_file=DIST/'catalog.json';catalog=json.loads(catalog_file.read_text())
 old=[s for s in catalog['styles'] if s.get('edition')!='4.5'];catalog['styles']=old
 catalog['families']=[f for f in catalog['families'] if f['id']!='explicadores']
 catalog['families'].append({'id':'explicadores','name':'Apresentador e explicação','kind':'Edição com apresentador','count':20})
 catalog['version']='4.5'
 if not any(s.get('id')=='presenter-course-reference' for s in catalog['research']['sources']):catalog['research']['sources'].append({'id':'presenter-course-reference','title':'SuperEditor IA — página pública e demonstrações','url':'https://supereditoria.anovainteligencia.ia.br','note':'Referência de técnica, sem reutilização de assets ou receitas privadas.'})
 manifest=[];assets=DIST/'assets/presenter-20';assets.mkdir(exist_ok=True)
 for index,(slug,name,signature,mechanism,route,extra) in enumerate(ROWS):
  sid='explicador-'+slug;actions=['A pessoa apresenta o assunto sem elementos sobre o rosto.',signature+'.','O elemento responde ao trecho ou gesto conferido no original.','O resultado permanece legível e a pessoa conclui.']
  frames=[];records=[]
  for step,action in enumerate(actions):
   image=frame_image(index,step,mechanism,name,action);relative=f'assets/presenter-20/{sid}-{step+1:02}.webp';image.save(DIST/relative,'WEBP',quality=92)
   small=f'assets/presenter-20/{sid}-{step+1:02}-small.webp';thumb=image.resize((270,480));thumb.save(DIST/small,'WEBP',quality=85)
   frames.append({'src':relative,'thumbnail':small,'width':540,'height':960,'label':['Apresentação','Explicação','Interação','Resumo'][step],'alt':name+' — estudo esquemático. '+action,'action':action});records.append({'path':relative,'sha256':hashlib.sha256((DIST/relative).read_bytes()).hexdigest()})
  resources=['Vídeo gravado autorizado ou avatar explicitamente selecionado','Fala original e tempos conferidos','Remotion e FFmpeg locais','Textos e gráficos editáveis']+extra
  p=copy.deepcopy(old[0]['preset']);p['avatar']=False;p['brand']='Adaptar à marca. Confirmar vídeo gravado ou avatar; não gerar pessoa por inferência.'
  p['research']='Conferir afirmações, unidades e fontes; diagramas de exemplo são fictícios.'
  policy={'version':1,'recipeId':sid,'mechanism':mechanism,'route':route,'presenterSources':['recorded_video','explicitly_selected_avatar'],'avatarOptInRequired':True,'originalFootageRequired':True,'requiredInputs':extra,'nativeOperators':['layer_visibility','editable_speech_words','registered_media','source_cut_ranges'],'automaticTranscription':False,'automaticSegmentation':False,'automaticGestureTracking':False,'trackCoordinates':'output-normalized; scene-local frames; original source asset bound','review':['Rosto e mãos livres','Sincronismo com fala e gesto','Bordas do recorte e oclusão','Dados e texto revisados'],'referenceIsExecutionProof':False}
  requirements='Preservar originais, rosto, corpo e voz. Confirmar a fonte do apresentador. Para avatar novo, seleção explícita, identidade autorizada e geração aprovada; um MP4 de avatar pode ser mídia de entrada. '+('Exige: '+'; '.join(extra)+'. ' if extra else '')+'Transcrição, segmentação e tracking automáticos não acompanham esta receita. Usar tempos, máscaras e trajetórias reais conferidos; explicar bloqueios antes de prometer o efeito.'
  s={'id':sid,'name':name,'family':'explicadores','familyName':'Apresentador e explicação','kind':'Edição com apresentador','edition':'4.5','signature':signature,'exampleTopic':'Explicação demonstrativa com pessoa e informação em cena','uses':'Reels explicativos, aulas, anúncios, tutoriais e vídeos com avatar autorizado','resources':resources,'motion':signature+'. A duração segue a fala e o gesto medido, sem movimento aleatório.','complexity':'Alta' if extra else 'Média','note':'Estudo esquemático original em código, não filmagem, teste de movimento ou aprovação do usuário. Nenhum quadro do curso ou dos Reels foi reutilizado.','image':{'atlas':frames[1]['src'],'columns':1,'rows':1,'width':540,'height':960,'sourceKind':'code','source':'Ilustração original de composição e estados.'},'preset':p,'readiness':{'status':'visual_reference','evidence':'Receita e operadores documentados; requer mídia e amostra real revisada.'},'proof':'Na amostra, demonstrar '+signature.lower()+', preservando rosto, mãos, fala, dados e recorte. Não aprovar por imagem estática.','requirements':requirements,'audio':{'voice':'Preservar a fala do vídeo ou usar voz autorizada de avatar explicitamente escolhido.','music':'Trilha opcional discreta; manter a fala inteligível.','sfx':'Sons pontuais nos acontecimentos, nunca em todas as palavras.','mix':'Não duplicar a voz original. Ducking sob narração e escuta integral.'},'sequence':{'version':1,'heroIndex':1,'theme':'Exemplo ilustrativo, sem métricas reais','frames':frames,'audio':'Fala sincronizada; música e SFX opcionais.','conceptOnly':True,'motionValidated':False,'conceptApproval':'pending_user_review'},'presenterEditing':policy,'researchRefs':['presenter-course-reference']}
  s['executionPlan']={'version':1,'appearance':signature,'categoryDirection':'Apresentador preservado, hierarquia clara e informação legível. As cores do estudo são provisórias.','referenceStates':[{'frame':i+1,'state':a} for i,a in enumerate(actions)],'motionTargets':[{'fromFrame':i+1,'toFrame':i+2,'initialState':actions[i],'actionAndResult':actions[i+1]} for i in range(3)],'movementLanguage':s['motion'],'resources':resources,'shotPlanFields':['initialState','action','result','camera','depth','narration','editableText','sourceTime','gestureAnchor','maskAssetId','durationFromVoice'],'planningRule':'Adaptar à fala real, sem divisão uniforme. Não trocar gesto medido por animação aleatória.','textRule':'Todo texto e dado deve permanecer editável, com fonte licenciada e conferência de leitura.','invariants':p['productFidelity']+' Preservar a identidade do apresentador e o áudio original.','validation':requirements,'presenterEditing':policy}
  catalog['styles'].append(s);manifest.append({'id':sid,'generator':'Original Python/Pillow schematic illustration','source':'build.py','motionValidated':False,'frames':records})
 catalog_file.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');(Path(__file__).parent/'assets.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('20 directions, 80 original frames and 80 thumbnails; concepts pending review.')
if __name__=='__main__':build()
