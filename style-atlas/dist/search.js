/* Local catalogue search: editorial tags are discovery data, never production instructions. */
(function(root){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 // Explicit variants avoid substring errors such as cão -> educação or mão -> limão.
 const concepts=[
  ['cachorro','cachorro|cachorros|cachorrinho|cachorrinhos|cão|cães|canino|canina|caninos|caninas|dog|dogs'],
  ['gato','gato|gatos|felino|felina|felinos|felinas|cat|cats'],
  ['pet','pet|pets|animal de estimação|animais de estimação'],
  ['animal','animal|animais'],['veterinária','veterinário|veterinária|veterinários|veterinárias|clínica veterinária'],
  ['banho e tosa','banho e tosa|grooming'],['peitoral','peitoral|peitorais|harness'],['coleira','coleira|coleiras'],['ração','ração|rações'],['peixe','peixe|peixes'],['aquário','aquário|aquários|aquarismo'],['brinquedo','brinquedo|brinquedos'],['cama','cama|camas'],['bebedouro','bebedouro|bebedouros|fonte de água|fontes de água'],['comedouro','comedouro|comedouros'],['caixa de transporte','caixa de transporte|caixas de transporte'],['bolsa de transporte','bolsa de transporte|bolsas de transporte'],['passeio','passeio|passeios'],['escova','escova|escovas|escovação'],['banho','banho|banhos'],['tosa','tosa|tosar'],['medidas','medida|medidas|medição'],['embalagem','embalagem|embalagens'],['petisco','petisco|petiscos'],['arranhador','arranhador|arranhadores'],
  ['imóvel','imóvel|imóveis|imobiliária|imobiliário|imobiliárias|imobiliários|corretor|corretora|corretores|corretoras'],
  ['apartamento','apartamento|apartamentos|apto'],['casa','casa|casas'],['planta baixa','planta baixa|plantas baixas|floor plan|floorplan'],['maquete','maquete|maquetes'],['arquitetura','arquitetura|arquiteto|arquiteta|arquitetos|arquitetas'],['interiores','interior|interiores|design de interiores'],['engenharia','engenharia|engenheiro|engenheira|engenheiros|engenheiras'],['ponte','ponte|pontes'],['obra','obra|obras|construção|construções'],
  ['dentista','dentista|dentistas|odontologia|odontológico|odontológica'],['dente','dente|dentes|dentição'],['saúde','saúde|health'],['pele','pele|peles'],['estética','estética|estético|estéticas|estéticos'],['cosmético','cosmético|cosméticos|cosmética|skincare'],['cabelo','cabelo|cabelos|capilar'],
  ['fitness','fitness|academia|academias|musculação'],['exercício','exercício|exercícios|treino|treinos|workout'],['corpo','corpo|corpos|corporal'],['respiração','respiração|respirar'],
  ['gastronomia','gastronomia|gastronômico|gastronômica|culinária'],['restaurante','restaurante|restaurantes'],['comida','comida|comidas|alimento|alimentos|alimentação'],['bebida','bebida|bebidas|drink|drinks'],['café','café|cafés|coffee'],['ingrediente','ingrediente|ingredientes'],['receita culinária','receita culinária|preparo culinário'],
  ['moda','moda|fashion|vestuário'],['roupa','roupa|roupas|vestido|vestidos|camisa|camisas|calça|calças'],['tecido','tecido|tecidos|têxtil|têxteis'],['joia','joia|joias|jóia|jóias|joalheria'],['anel','anel|anéis'],['relógio','relógio|relógios'],
  ['advocacia','advocacia|advogado|advogada|advogados|advogadas|jurídico|jurídica|jurídicos|jurídicas'],['contrato','contrato|contratos|cláusula|cláusulas'],['documento','documento|documentos'],
  ['educação','educação|educacional|educacionais|ensino|aprendizagem'],['curso','curso|cursos|aula|aulas'],['agro','agro|agronegócio|agricultura|agrícola|agrícolas'],['plantio','plantio|plantar|semeadura'],['colheita','colheita|colheitas'],['trator','trator|tratores'],
  ['turismo','turismo|turístico|turística|viagem|viagens'],['hotel','hotel|hotéis|hospedagem|pousada|pousadas'],['praia','praia|praias'],['evento','evento|eventos'],['palco','palco|palcos'],['mapa','mapa|mapas'],['rota','rota|rotas|percurso|percursos'],
  ['tráfego pago','tráfego pago|gestor de tráfego|gestora de tráfego|gestão de tráfego|mídia paga'],['agência','agência|agências|agência de publicidade|agências de publicidade'],['alto padrão','alto padrão|luxo|imóvel de luxo|imóveis de luxo'],['implante','implante|implantes|implante dentário|implantes dentários'],['dentista','dentista|dentistas|odontologia|odontológico|odontológica'],['Minha Casa, Minha Vida','minha casa minha vida|mcmv'],
  ['flores','flor|flores|floricultura|floriculturas|floral|florais'],['padaria','padaria|padarias|panificação'],['pão','pão|pães|pao|paes'],['confeitaria','confeitaria|confeitarias|confeiteiro|confeiteira'],['bolo','bolo|bolos'],['livraria','livraria|livrarias'],['livro','livro|livros'],['papelaria','papelaria|papelarias'],['moto','moto|motos|motocicleta|motocicletas'],['bar','bar|bares|pub|pubs'],
  ['carro','carro|carros|automóvel|automóveis|automotivo|automotiva'],['pneu','pneu|pneus'],['infantil','infantil|criança|crianças|bebê|bebês'],
  ['produto','produto|produtos'],['serviço','serviço|serviços'],['loja','loja|lojas|varejo'],['ecommerce','ecommerce|e commerce|comércio eletrônico|loja virtual|lojas virtuais'],
  ['software','software|softwares|aplicativo|aplicativos|app|apps'],['site','site|sites|website|websites'],['formulário','formulário|formulários|form'],['crm','crm|gestão de clientes|relacionamento com clientes'],['interface','interface|interfaces|ui'],['dashboard','dashboard|dashboards|painel de indicadores'],['inteligência artificial','inteligência artificial|ia|ai|artificial intelligence'],
  ['gráfico','gráfico|gráficos|chart|charts'],['tabela','tabela|tabelas|table|tables'],['diagrama','diagrama|diagramas|diagram|diagrams'],['fluxograma','fluxograma|fluxogramas|flowchart'],['linha do tempo','linha do tempo|linhas do tempo|timeline'],['infográfico','infográfico|infográficos|infografia'],['ícone','ícone|ícones|icon|icons'],['widget','widget|widgets'],
  ['explicador','explicador|explicadores|explicação|explicações|explainer'],['avatar','avatar|avatares|avatars'],['apresentador','apresentador|apresentadora|apresentadores|apresentadoras|presenter'],['mão','mão|mãos|hand|hands'],['gesto','gesto|gestos|gesture|gestures'],['rosto','rosto|rostos|face|faces'],['diálogo','diálogo|diálogos|conversa|conversas'],['janela','janela|janelas|picture in picture|pip'],
  ['motion design','motion design|motion graphics|motion|grafismo|grafismos'],['animação','animação|animações|animation|animations'],['tipografia','tipografia|tipográfico|tipográfica|texto|textos|letra|letras|lettering'],['3d','3d|tridimensional|tridimensionais'],['2d','2d|bidimensional|bidimensionais'],['stop motion','stop motion|stopmotion'],['zoom','zoom|aproximação|ultrazoom|ultra zoom'],['macro','macro|macrofotografia'],['órbita','órbita|órbitas|orbital|orbit'],['camadas','camada|camadas|layer|layers'],['lousa','lousa|lousas|quadro branco|whiteboard'],['corte técnico','corte técnico|cortes técnicos|cutaway'],['antes e depois','antes e depois|antes depois|before and after'],
  ['vidro','vidro|vidros|glass'],['transparência','transparência|transparências|transparente|transparentes|translúcido|translúcida'],['metal','metal|metais|metálico|metálica'],['madeira','madeira|madeiras'],['papel','papel|papéis|paper'],['água','água|águas|water'],['textura','textura|texturas|tátil|táteis'],['luz','luz|luzes|iluminação|lighting'],['sombra','sombra|sombras|shadow|shadows'],['brilho','brilho|brilhos|bloom|glow'],['preto e branco','preto e branco|preto branco|black and white|monocromático|monocromática'],['minimalista','minimalista|minimalistas|minimalismo'],['neon','neon|néon'],['cinema','cinema|cinematográfico|cinematográfica'],['realista','realista|realistas|fotorrealista|fotorrealismo|photorealistic'],['ilustração','ilustração|ilustrações|ilustrado|ilustrada'],['ugc','ugc|conteúdo de criador'],['narração','narração|narrado|narrada|voz|voiceover'],['legenda','legenda|legendas|caption|captions'],['efeito sonoro','efeito sonoro|efeitos sonoros|sfx|foley'],['música','música|músicas|trilha|trilhas']
 ].map(([tag,aliases])=>({tag,aliases:aliases.split('|')}));
 const aliases=new Map(),maxPhrase=5;
 for(const {tag,aliases:variants}of concepts)for(const word of [tag,...variants])aliases.set(normalize(word),tag);
 const stop=new Set('a o as os de da do das dos em no na nos nas um uma uns umas e ou para por com que meu minha seu sua dos video videos estilo estilos'.split(' '));
 function units(value){
  const words=normalize(value).split(' ').filter(Boolean),out=[];
  for(let i=0;i<words.length;){let found=false;for(let n=Math.min(maxPhrase,words.length-i);n>0;n--){const phrase=words.slice(i,i+n).join(' '),tag=aliases.get(phrase);if(tag){out.push({value:tag,known:true});i+=n;found=true;break;}}if(!found){if(!stop.has(words[i]))out.push({value:words[i],known:false});i++;}}
  return out;
 }
 const strings=value=>Array.isArray(value)?value.flatMap(strings):typeof value==='string'?[value]:[];
 // Positive description fields only: policy/proof boilerplate must not tag every style with a forbidden effect.
 const positive=value=>strings(value).flatMap(s=>s.split(/(?<=[.!?;])\s+/).map(part=>/\b(?:não|nunca|evitar|evite)\b/i.test(part)?'':part.replace(/(?:,?\s+)?\bsem\b[^.;→]*/gi,'')));
 function fields(s){return [...strings([s.name,s.familyName,s.kind,s.exampleTopic,s.adSubniche,s.sequence?.theme]),...positive([s.signature,s.uses,(s.resources||[]).filter(v=>! /^(Fotos ou vídeos originais|Ficha real de características|Pessoas e vozes autorizadas|Identidade da marca,|Narração profissional em|Letreiros, legendas sincronizadas, diagramas e CTA)/i.test(v)),s.motion,s.sequence?.frames?.map(f=>[f.action,f.caption]),s.executionPlan?.appearance,s.executionPlan?.visualLayout,s.presenterEditing?.creativeDirection?.compositionIdea])];}
 function tagsFor(s,extra=[]){
  const text=fields(s).join(' '),tags=new Set(units(text).filter(u=>u.known).map(u=>u.value));
  for(const tag of [s.name,s.familyName,s.kind,s.exampleTopic,...extra])if(typeof tag==='string'&&tag.trim())tags.add(tag.trim());
  if(s.presenterEditing?.presenterSources?.includes('explicitly_selected_avatar')){tags.add('avatar');tags.add('apresentador');tags.add('explicador');tags.add('explicação interativa');}
  if(/\bplantas?\b/.test(normalize(text))&&(s.family==='imoveis'||/corret|imove|arquitet|interiore|engenharia|evento/.test(normalize(s.presenterEditing?.sector))))tags.add('planta baixa');
  // A dog/cat is a pet, but an unspecified pet is not necessarily a dog or a cat.
  if(tags.has('cachorro')||tags.has('gato'))tags.add('pet');if(tags.has('pet'))tags.add('animal');
  return [...tags].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 }
 function createIndex(styles,metadata={}){
  const entries=styles.map((style,order)=>{
   const tags=metadata.styleTags?.[style.id]||tagsFor(style),text=fields(style).concat(tags).join(' '),tokens=new Set(units(text).map(u=>u.value));
   if(tokens.has('cachorro')||tokens.has('gato'))tokens.add('pet');if(tokens.has('pet'))tokens.add('animal');
   return {style,order,tags,tokens,words:new Set(normalize(text).split(' ')),title:normalize(style.name),titleTokens:new Set(units(style.name).map(u=>u.value))};
  });
  function search(query){
   const q=normalize(String(query??'').slice(0,256)),terms=[...new Map(units(q).map(u=>[u.value,u])).values()];if(!terms.length)return entries.map(e=>({style:e.style,score:0}));
   return entries.flatMap(e=>{
    const matches=terms.map(t=>e.tokens.has(t.value)||e.words.has(normalize(t.value))||(!t.known&&t.value.length>=3&&[...e.words].some(w=>w.startsWith(t.value))));if(matches.some(m=>!m))return [];
    const score=(e.title===q?1000:e.title.includes(q)?300:0)+terms.reduce((n,t)=>n+(e.titleTokens.has(t.value)?30:0)+(e.tokens.has(t.value)?10:1),0);
    return [{style:e.style,score,order:e.order}];
   }).sort((a,b)=>b.score-a.score||a.order-b.order);
  }
  return {search,tagsForId:id=>entries.find(e=>e.style.id===id)?.tags||[]};
 }
 root.AtlasSearch={normalize,concepts,fields,tagsFor,createIndex};
})(globalThis);
