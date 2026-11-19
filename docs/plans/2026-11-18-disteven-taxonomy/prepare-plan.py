"""Textual editorial proposal, not a production or visual-quality certification."""
from pathlib import Path
import json,re,unicodedata,collections,csv,hashlib
root=Path(__file__).resolve().parents[3];catalogPath=root/'style-atlas/dist/catalog.json';c=json.loads(catalogPath.read_text());out=Path(__file__).resolve().parent
N=lambda x:''.join(ch for ch in unicodedata.normalize('NFD',str(x).lower()) if unicodedata.category(ch)!='Mn')
def match(pattern,text):return bool(re.search(pattern,N(text)))
definitions=[
 ('vender','Vender',[('ofertas','Ofertas e promoções'),('uso','Produto em uso'),('diferenciais','Diferenciais e benefícios'),('decisao','Decisão de compra')]),
 ('explicar','Explicar',[('funcionamento','Como funciona'),('processos','Processos e etapas'),('conceitos','Ideias e conceitos'),('dados','Dados e comparações')]),
 ('apresentar','Apresentar',[('negocio','Negócio e equipe'),('produtos','Produtos e serviços'),('espacos','Imóveis e espaços'),('projetos','Projetos e portfólio')]),
 ('ensinar','Ensinar',[('tutoriais','Tutoriais práticos'),('cuidados','Cuidados e orientações'),('aulas','Aulas e métodos'),('duvidas','Dúvidas e mitos')]),
 ('historias','Contar histórias',[('bastidores','Bastidores e rotina'),('pessoas','Histórias de pessoas'),('marca','Histórias de marca'),('experiencias','Experiências e lugares')]),
 ('divulgar','Divulgar',[('lancamentos','Lançamentos'),('eventos','Eventos e datas'),('novidades','Novidades e avisos'),('convites','Convites e chamadas')])]
patterns={
 'vender':r'compr|vend|e.?commerce|marketplace|oferta|promoc|anuncio|campanh|vitrine|conversa[oõ]|obje[cç]',
 'explicar':r'explic|conceit|compreen|entend|process|funciona|dados|analit|compar|sistem|mecanism|demonstr',
 'apresentar':r'apresent|institucion|negocio|empresa|equipe|portfolio|imov|apartamento|residenc|interior|arquitet|espac|servic|produto|projeto',
 'ensinar':r'tutorial|ensino|aprendiz|educa|aula|metodo|didatic|orienta|cuidado|treina|onboarding|curso|passo a passo',
 'historias':r'bastidor|historia|personage|narrativa|documental|rotina|cotidian|memoria|experienc|viagem|turismo|hosped',
 'divulgar':r'lancamento|evento|convite|novidade|aniversario|comemor|aviso|calendario|data especial'}
renames={
'Noir':'Sombras e mistério em preto e branco','Macrofotografia':'Detalhes em macro','Design suíço':'Grade limpa e tipografia suíça','Bauhaus':'Composição geométrica Bauhaus','Flat vetorial':'Ilustração vetorial plana','Line art técnico':'Desenho técnico em linhas','Cartoon expressivo':'Personagens em cartoon expressivo','Quadrinhos':'História em quadrinhos','Massinha':'Cenas com aparência de massinha','Clay render':'3D com acabamento de argila','Low poly':'3D com formas geométricas','Voxel':'Cenas formadas por blocos 3D','Papercraft 3D':'Cenas 3D com papel dobrado','Tipografia cinética':'Tipografia animada com ritmo','Liquid motion':'Formas líquidas em movimento','Trim paths':'Linhas que desenham a informação','Morphing':'Transformação contínua entre formas','Frame a frame':'Animação quadro a quadro','Blueprint':'Projeto explicado em desenho técnico','Planta em vidro':'Planta do imóvel em vidro','Endereço editorial':'Imóvel com títulos atrás do apresentador','Maquete na palma':'Maquete do imóvel na palma','Detalhes que fazem sentido':'Detalhes do imóvel ativados pelo gesto','Sorriso em etapas':'Consulta odontológica explicada por etapas','Antes da assinatura, uma conversa':'Dúvidas sobre contrato em uma conversa','O passeio começa no encaixe':'Ajuste do peitoral antes do passeio'}

def subcategory(goal,text,s):
 if goal=='vender':
  if match(r'oferta|promoc|desconto|black friday',text):return 'ofertas'
  if match(r'compatib|medida|tamanho|variante|escolh|obje',text):return 'decisao'
  if match(r'uso|gesto|rotina|experiencia|demonstr',text):return 'uso'
  return 'diferenciais'
 if goal=='explicar':
  if match(r'dados|indicador|dashboard|grafico|analit|compar',text):return 'dados'
  if match(r'etapa|sequenc|process|linha do tempo|fluxo',text):return 'processos'
  if match(r'conceit|metafora|ideia|abstrat',text):return 'conceitos'
  return 'funcionamento'
 if goal=='apresentar':
  if s['family']=='imoveis' or match(r'imov|corret|interior|fachada|apartamento|arquitet|hosped',text):return 'espacos'
  if match(r'equipe|institucion|empresa|negocio|escritorio|profission',text):return 'negocio'
  if match(r'projeto|portfolio|design|composi|estetica|material',text):return 'projetos'
  return 'produtos'
 if goal=='ensinar':
  if match(r'mito|duvida|pergunta|erro|obje',text):return 'duvidas'
  if match(r'cuidado|saude|odont|dent|clin|segur|orienta',text):return 'cuidados'
  if match(r'aula|metodo|educa|curso|didatic|aprendiz',text):return 'aulas'
  return 'tutoriais'
 if goal=='historias':
  if match(r'bastidor|rotina|cotidian|preparo|oficio',text):return 'bastidores'
  if match(r'viagem|turismo|lugar|hosped|experienc|bairro',text):return 'experiencias'
  if match(r'pessoa|personage|depoimento|artesa|profission',text):return 'pessoas'
  return 'marca'
 if goal=='divulgar':
  if match(r'lancamento',text):return 'lancamentos'
  if match(r'evento|comemor|aniversario|calendario|data',text):return 'eventos'
  if match(r'convite|inscri|reserva|chamada',text):return 'convites'
  return 'novidades'

rows=[]
for s in c['styles']:
 uses=s['uses'];specific=' '.join([s['name'],s['signature'],s.get('exampleTopic','')]);text=uses+' '+specific
 scores={g:0 for g,_,_ in definitions};evidence={g:[] for g in scores}
 for g,pattern in patterns.items():
  if match(pattern,uses):scores[g]+=4;evidence[g].append({'field':'uses','text':uses})
  if match(pattern,specific):scores[g]+=2;evidence[g].append({'field':'name/signature/exampleTopic','text':s['signature']})
 if s.get('advertising') and s['family']!='ads-juridico':scores['vender']+=6;evidence['vender'].append({'field':'advertising','text':'Estrutura publicitária registrada'})
 if s.get('presenterEditing'):scores['explicar']+=5;evidence['explicar'].append({'field':'presenterEditing','text':'Receita de explicação com pessoa e informação em cena'})
 if s['family']=='infoprodutores':scores['ensinar']+=3
 if s['family']=='imoveis':scores['apresentar']+=5
 if s['family']=='ads-juridico':scores['vender']=0
 ranking=sorted(scores,key=lambda g:-scores[g]);supported=[g for g in ranking if scores[g]>=4];fallback=not supported
 if fallback:supported=[]
 primary=supported[0] if supported else None;goals=supported[:3];name=renames.get(s['name'],s['name'])
 memberships=[{'objective':g,'subcategory':g+'/'+subcategory(g,text,s),'textualScore':scores[g],'evidence':evidence[g]} for g in goals]
 generic=bool(s.get('presenterEditing') and s['name'] not in renames and len(s['name'].split())<=3)
 rows.append({'id':s['id'],'currentName':s['name'],'proposedName':name,'nameAction':'propor alteração' if name!=s['name'] else 'revisar contexto' if generic else 'manter nesta proposta','aliases':[s['name']] if name!=s['name'] else [],'legacyFamily':s['family'],'legacyFamilyName':s['familyName'],'primaryObjective':primary,'memberships':memberships,'segment':s.get('presenterEditing',{}).get('sector') or s.get('segment') or s.get('adSubniche') or None,'uses':uses,'signature':s['signature'],'editorialReviewRequired':fallback or generic or name!=s['name'],'proposalStatus':'rascunho textual; conferir mecanismo visual e contexto antes da migração','fallback':fallback})
counts=collections.Counter(v['objective'] for r in rows for v in r['memberships']);subs=collections.Counter(v['subcategory'] for r in rows for v in r['memberships'])
result={'version':1,'status':'proposal_not_live','catalogVersion':c['version'],'sourceSha256':hashlib.sha256(catalogPath.read_bytes()).hexdigest(),'method':'Sinais textuais de uses, nome, assinatura, tema e contratos publicitários/apresentador; regras explícitas. Pontuação é triagem, não avaliação semântica ou visual final. Até três objetivos sugeridos por ficha, sem impedir curadoria de mais vínculos. Regras não autorizam produção nem mudam identidade/receitas.','categories':[{'id':g,'name':name,'proposedUniqueStyles':counts[g],'subcategories':[{'id':g+'/'+sid,'name':label,'proposedUniqueStyles':subs[g+'/'+sid]} for sid,label in children]} for g,name,children in definitions],'audit':{'uniqueStyles':len(rows),'duplicateIDs':len(rows)-len({r['id'] for r in rows}),'currentDuplicateNames':0,'stylesWithMultipleObjectives':sum(len(r['memberships'])>1 for r in rows),'proposedNameChanges':sum(r['nameAction']=='propor alteração' for r in rows),'editorialReviewRequired':sum(r['editorialReviewRequired'] for r in rows),'fallbacksNeedingDecision':sum(r['fallback'] for r in rows),'imageReviewPerformed':False},'styles':rows}
result['audit']['duplicateProposedNames']=[name for name,count in collections.Counter(r['proposedName'].casefold() for r in rows).items() if count>1]
(out/'matrix.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
with (out/'matrix.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.writer(f,delimiter=';',lineterminator='\n');w.writerow(['ID','Nome atual','Nome proposto','Recomendação de nome','Grupo atual','Objetivo principal proposto','Demais objetivos propostos','Subcategorias propostas','Segmento registrado','Revisão necessária','Uso registrado','Assinatura registrada'])
 for r in rows:w.writerow([r['id'],r['currentName'],r['proposedName'],r['nameAction'],r['legacyFamilyName'],r['primaryObjective'],', '.join(v['objective'] for v in r['memberships'][1:]),', '.join(v['subcategory'] for v in r['memberships']),r['segment'],r['editorialReviewRequired'],r['uses'],r['signature']])
print(json.dumps({'audit':result['audit'],'categories':result['categories']},ensure_ascii=False))
