/* Discovery is a browsing aid. It never writes a production brief or approvals. */
(()=>{
 const product=['anuncios','campanhas','ecommerce','volume','ads-moda','ads-alimentacao','ads-joias','ads-automotivo','ads-pets','ads-beleza','ads-infantil'];
 const space=['imoveis','ads-casa','ads-turismo','ads-servicos'];
 const people=['explicadores','avatares','saude','software','tecnologia','infoprodutores','ads-juridico'];
 const visual=['cinema','grafico','ilustracao','materiais','motion','motion-campanha','apresentacoes','hibridos'];
 const audience=(id,label,families,sectors=[])=>({id,label,families,sectors});
 const browseGroups=[
  {id:'social',label:'Redes sociais',topics:[
   audience('reels','Reels e stories',['cinema','grafico','motion','ilustracao','materiais','hibridos','ads-moda','ads-alimentacao','ads-beleza','ads-pets','ads-joias','ads-infantil']),
   audience('bastidores','Bastidores e rotina',['cinema','hibridos','ads-moda','ads-alimentacao','ads-joias','ads-servicos','ads-turismo']),
   audience('dicas','Dicas rápidas',['explicadores','avatares','saude','infoprodutores','motion'])
  ]},
  {id:'ads',label:'Anúncios',topics:[
   audience('produtos','Vender produtos',[...product,'ads-casa']),
   audience('servicos','Divulgar serviços',[...space,'ads-juridico','saude','software','infoprodutores','explicadores']),
   audience('promocoes','Promoções e lançamentos',['campanhas','motion-campanha','ecommerce','apresentacoes','grafico','tecnologia'])
  ]},
  {id:'presentations',label:'Apresentações',topics:[
   audience('empresa','Apresentar a empresa',['apresentacoes','avatares','explicadores','grafico','saude','tecnologia','infoprodutores','ads-juridico']),
   audience('portfolio','Mostrar produtos e portfólios',['anuncios','ecommerce','volume','materiais','cinema','ads-moda','ads-joias','ads-casa']),
   audience('espacos','Apresentar espaços',space)
  ]},
  {id:'tutorials',label:'Tutoriais',topics:[
   audience('passos','Ensinar passo a passo',['explicadores','infoprodutores','motion','ilustracao','avatares','ads-casa','ads-servicos']),
   audience('explicar','Explicar como funciona',['explicadores','saude','anuncios','volume','hibridos','imoveis']),
   audience('tela','Mostrar uma tela',['software','tecnologia','apresentacoes'],['ia-negocios','ecommerce','trafego-pago','seguranca-digital','telecom'])
  ]},
  {id:'business',label:'Por negócio',topics:[
   audience('lojas','Lojas e e-commerce',['ecommerce','anuncios','ads-moda','ads-joias','ads-infantil'],['lojas','ecommerce','moda','joalheria','oticas','perfumaria','floriculturas','livrarias']),
   audience('comida','Alimentação e bebidas',['ads-alimentacao'],['gastronomia','bares','cafeterias','confeitarias','agro']),
   audience('bem-estar','Saúde, beleza e bem-estar',['saude','ads-beleza'],['dentistas','clinicas','cabelos','farmacias','esteticas','fisioterapia','fitness','laboratorios','nutricao','procedimentos','psicologia']),
   audience('casa','Casa, decoração e imóveis',['imoveis','ads-casa','ads-servicos'],['corretores','arquitetos','interiores','marcenaria','limpeza','engenharia','solar','seguranca-patrimonial']),
   audience('profissionais','Serviços profissionais',['ads-juridico'],['advogados','consultoria','contabilidade','financas','seguros','rh','franquias','agencias','trafego-pago','logistica']),
   audience('educacao','Educação e cursos',['infoprodutores'],['educacao']),
   audience('tecnologia','Tecnologia e assistência',['tecnologia','software'],['ia-negocios','assistencia','seguranca-digital','telecom']),
   audience('veiculos','Carros, motos e mobilidade',['ads-automotivo'],['automotivo','mobilidade-eletrica','revendas-veiculos']),
   audience('turismo','Turismo e eventos',['ads-turismo'],['turismo','eventos']),
   audience('pets','Pets e cuidados animais',['ads-pets'],['pets'])
  ]}
 ];
 const browseGroup=id=>browseGroups.find(group=>group.id===id);
 function matchesBrowse(style,group,topic=''){
  const topics=browseGroup(group)?.topics;
  return !topics||topics.some(item=>(!topic||item.id===topic)&&
   (item.families.includes(style.family)||item.sectors.includes(style.presenterEditing?.sector)));
 }
 const goals=[{id:'explain',label:'Explicar'},{id:'present',label:'Apresentar'},{id:'sell',label:'Vender'}];
 const definitions=[
  {id:'explanations',goal:'explain',title:'Explicações que ganham forma',description:'A pessoa apresenta. Os elementos ajudam a entender.',families:people,preferred:['explicador-dentistas-implante-pilar-e-coroa-em-conversa','explicador-fitness-alinhamento','explicador-agencias-do-anuncio-ao-caixa-com-evidencias']},
  {id:'inside-products',goal:'explain',title:'Por dentro do produto',description:'Camadas, detalhes e demonstrações que tornam a ideia clara.',families:product},
  {id:'understand-spaces',goal:'explain',title:'O espaço também explica',description:'Percursos, ambientes e projetos apresentados com contexto.',families:space},
  {id:'visual-ideas',goal:'explain',title:'Ideias em movimento',description:'Diagramas, materiais e composição a serviço da explicação.',families:visual},
  {id:'people-and-business',goal:'present',title:'Quem está por trás da ideia',description:'Pessoas, serviços e conhecimento com presença.',families:people},
  {id:'product-presence',goal:'present',title:'O produto em primeiro plano',description:'Mostre forma, uso e detalhes que merecem ser vistos.',families:product},
  {id:'places-and-projects',goal:'present',title:'Lugares que contam histórias',description:'Uma apresentação para cada espaço e cada projeto.',families:space},
  {id:'visual-signature',goal:'present',title:'Uma assinatura para sua marca',description:'Encontre uma linguagem visual para a sua apresentação.',families:visual},
  {id:'product-value',goal:'sell',title:'Mostre o valor do produto',description:'Do primeiro contato à demonstração do que faz diferença.',families:product},
  {id:'service-trust',goal:'sell',title:'Serviços que inspiram confiança',description:'Explique a proposta e ajude a pessoa a escolher.',families:people},
  {id:'space-decisions',goal:'sell',title:'Um lugar, várias possibilidades',description:'Diferenciais, localização e usos que ajudam na decisão.',families:space},
  {id:'campaign-language',goal:'sell',title:'Dê forma à sua campanha',description:'Direções de arte e movimento para construir sua mensagem.',families:visual}
 ];
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function niches(styles){return [...new Map(styles.filter(s=>s.presenterEditing?.sector).map(s=>[s.presenterEditing.sector,{id:s.presenterEditing.sector,name:s.presenterEditing.sectorName}])).values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));}
 const legacyTerms={dentistas:/dent|odont|implante/,corretores:/imove|imobili|corretor|moradia|apartamento/,fitness:/fitness|treino|academia|exercicio/,floriculturas:/flor|arranjo|buque/,gastronomia:/gastronom|culin|restaurante|receita|alimento/,agencias:/agencia|publicidade|campanha/, 'trafego-pago':/trafego|anuncio|campanha|leads/,ecommerce:/e-commerce|ecommerce|loja virtual|marketplace/,'ia-negocios':/inteligencia artificial|automacao|\bia\b/};
 function matchesNiche(s,id,options=[]){
  if(!id)return true;
  if(s.presenterEditing?.sector)return s.presenterEditing.sector===id;
  const text=normalize([s.name,s.familyName,s.exampleTopic,s.uses,s.segment].join(' '));
  const terms=legacyTerms[id];
  if(terms)return terms.test(text);
  const name=normalize(options.find(n=>n.id===id)?.name||'');
  return !!name&&text.includes(name);
 }
 function matchesCollection(style,definition){return !!definition?.families.includes(style.family);}
 function previewRatio(style){
  const index=style.sequence?.heroIndex??1,frame=globalThis.AtlasViews?.frameView?.(style,index)||style.sequence?.frames?.[index]||style.image;
  const width=Number(frame?.width),height=Number(frame?.height);
  return Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0?`${width}/${height}`:'3/4';
 }
 // Different sectors/families appear before another variation of the same niche.
 function diversify(styles,preferred=[]){
  const byId=new Map(styles.map(s=>[s.id,s])),used=new Set(),out=[];
  for(const id of preferred){const s=byId.get(id);if(s&&!used.has(id)){out.push(s);used.add(id);}}
  const buckets=new Map();
  for(const s of styles){if(used.has(s.id))continue;const key=s.presenterEditing?.sector||s.family;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s);}
  const queues=[...buckets.values()];
  for(let i=0;queues.some(q=>i<q.length);i++)for(const q of queues)if(q[i])out.push(q[i]);
  return out;
 }
 const collection=id=>definitions.find(c=>c.id===id);
 globalThis.FolioCollections=Object.freeze({goals,definitions,collection,niches,matchesNiche,matchesCollection,previewRatio,diversify,browseGroups,browseGroup,matchesBrowse});
})();
