/* Discovery is a browsing aid. It never writes a production brief or approvals. */
(()=>{
 const product=['anuncios','campanhas','ecommerce','volume','ads-moda','ads-alimentacao','ads-joias','ads-automotivo','ads-pets','ads-beleza','ads-infantil'];
 const space=['imoveis','ads-casa','ads-turismo','ads-servicos'];
 const people=['explicadores','avatares','saude','software','tecnologia','infoprodutores','ads-juridico'];
 const visual=['cinema','grafico','ilustracao','materiais','motion','motion-campanha','apresentacoes','hibridos'];
 const audience=(id,label,families=[],sectors=[],children=[])=>({id,label,families,sectors,children});
 const sector=(id,label,sectors,families=[])=>audience(id,label,families,sectors);
 const palette=(id,label,colors=[id])=>({id,label,colors});
 const productTopics=[
  audience('moda','Moda e acessórios',['ads-moda','ads-joias']),
  audience('comida','Comida e bebida',['ads-alimentacao']),
  audience('casa','Casa e decoração',['ads-casa']),
  audience('beleza','Beleza e autocuidado',['ads-beleza']),
  audience('pets-infantil','Pets e produtos infantis',['ads-pets','ads-infantil']),
  audience('tecnologia','Eletrônicos e veículos',['ads-automotivo','tecnologia','volume']),
  audience('vitrine','Vitrine e demonstração',['anuncios','ecommerce','campanhas'])
 ];
 const browseGroups=[
  {id:'social',label:'Redes sociais',topics:[
   audience('reels','Reels e stories',['cinema','grafico','motion','ilustracao','materiais','hibridos','ads-moda','ads-alimentacao','ads-beleza','ads-pets','ads-joias','ads-infantil']),
   audience('bastidores','Bastidores e rotina',['cinema','hibridos','ads-moda','ads-alimentacao','ads-joias','ads-servicos','ads-turismo']),
   audience('dicas','Dicas rápidas',['explicadores','avatares','saude','infoprodutores','motion']),
   audience('marca','Conteúdo de marca',['grafico','apresentacoes','cinema','motion-campanha']),
   audience('dia-a-dia','Produto no dia a dia',['ads-moda','ads-casa','ads-pets','ads-infantil','ads-beleza','ads-alimentacao'])
  ]},
  {id:'ads',label:'Anúncios',topics:[
   audience('produtos','Vender produtos',[...product,'ads-casa'],[],productTopics),
   audience('servicos','Divulgar serviços',[...space,'ads-juridico','saude','software','infoprodutores','explicadores']),
   audience('promocoes','Promoções e lançamentos',['campanhas','motion-campanha','ecommerce','apresentacoes','grafico','tecnologia']),
   sector('online','Loja online e marketplaces',['ecommerce','lojas'],['ecommerce']),
   audience('demonstracao','Demonstrar benefícios',['anuncios','campanhas','volume','software','tecnologia'])
  ]},
  {id:'presentations',label:'Apresentações',topics:[
   audience('empresa','Apresentar a empresa',['apresentacoes','avatares','explicadores','grafico','saude','tecnologia','infoprodutores','ads-juridico']),
   audience('portfolio','Mostrar produtos e portfólios',['anuncios','ecommerce','volume','materiais','cinema','ads-moda','ads-joias','ads-casa']),
   audience('espacos','Apresentar espaços',space),
   sector('resultados','Resultados e números',['financas','consultoria','contabilidade','trafego-pago'],['software','tecnologia','apresentacoes']),
   sector('profissional','Apresentação profissional',['advogados','agencias','consultoria','rh','arquitetos'],['avatares','explicadores'])
  ]},
  {id:'tutorials',label:'Tutoriais',topics:[
   audience('passos','Ensinar passo a passo',['explicadores','infoprodutores','motion','ilustracao','avatares','ads-casa','ads-servicos']),
   audience('explicar','Explicar como funciona',['explicadores','saude','anuncios','volume','hibridos','imoveis']),
   audience('tela','Mostrar uma tela',['software','tecnologia','apresentacoes'],['ia-negocios','ecommerce','trafego-pago','seguranca-digital','telecom']),
   audience('produto','Demonstrar um produto',['anuncios','volume','ecommerce','ads-casa','ads-beleza']),
   sector('treinamento','Aulas e treinamento',['educacao','rh','assistencia'],['infoprodutores'])
  ]},
  {id:'business',label:'Por negócio',topics:[
   audience('lojas','Lojas e e-commerce',['ecommerce','anuncios'],[],[
    sector('vestuario','Moda e vestuário',['moda'],['ads-moda']),
    sector('joias','Joias e acessórios',['joalheria','oticas'],['ads-joias']),
    sector('infantil','Infantil e maternidade',[],['ads-infantil']),
    sector('presentes','Presentes e papelaria',['floriculturas','livrarias','perfumaria']),
    sector('loja-online','Lojas e marketplaces',['lojas','ecommerce'],['ecommerce'])
   ]),
   audience('comida','Alimentação e bebidas',['ads-alimentacao'],[],[
    sector('restaurantes','Restaurantes e gastronomia',['gastronomia']),
    sector('cafes','Cafeterias',['cafeterias']),
    sector('bares','Bares e pubs',['bares']),
    sector('confeitarias','Confeitaria e padarias',['confeitarias']),
    sector('agro','Agronegócio',['agro'])
   ]),
   audience('bem-estar','Saúde, beleza e bem-estar',['saude','ads-beleza'],[],[
    sector('odontologia','Dentistas e odontologia',['dentistas']),
    sector('clinicas','Clínicas e laboratórios',['clinicas','laboratorios','farmacias']),
    sector('cabelos','Salões e barbearias',['cabelos']),
    sector('estetica','Estética e autocuidado',['esteticas','procedimentos'],['ads-beleza']),
    sector('academias','Academias e movimento',['fitness','fisioterapia']),
    sector('bem-estar','Nutrição e psicologia',['nutricao','psicologia'])
   ]),
   audience('casa','Casa, decoração e imóveis',['imoveis','ads-casa','ads-servicos'],[],[
    sector('imoveis','Imóveis e corretoras',['corretores'],['imoveis']),
    sector('arquitetura','Arquitetura e interiores',['arquitetos','interiores']),
    sector('moveis','Móveis e decoração',['marcenaria'],['ads-casa']),
    sector('servicos-residenciais','Serviços residenciais',['limpeza','seguranca-patrimonial'],['ads-servicos']),
    sector('obras','Engenharia e energia solar',['engenharia','solar'])
   ]),
   audience('profissionais','Serviços profissionais',['ads-juridico'],[],[
    sector('direito','Advocacia',['advogados'],['ads-juridico']),
    sector('contabilidade','Contabilidade e finanças',['contabilidade','financas','seguros']),
    sector('marketing','Marketing e agências',['agencias','trafego-pago']),
    sector('consultoria','Consultorias e franquias',['consultoria','franquias']),
    sector('rh','RH e logística',['rh','logistica'])
   ]),
   audience('educacao','Educação e cursos',['infoprodutores'],['educacao']),
   audience('tecnologia','Tecnologia e assistência',['tecnologia','software'],[],[
    sector('sistemas','Software e automação',['ia-negocios'],['software','tecnologia']),
    sector('suporte','Suporte e assistência técnica',['assistencia']),
    sector('seguranca','Segurança digital e internet',['seguranca-digital','telecom'])
   ]),
   audience('veiculos','Carros, motos e mobilidade',['ads-automotivo'],[],[
    sector('revendas','Revenda de carros e motos',['revendas-veiculos']),
    sector('oficinas','Oficinas e manutenção',['automotivo']),
    sector('eletrica','Mobilidade elétrica',['mobilidade-eletrica'])
   ]),
   audience('turismo','Turismo e eventos',['ads-turismo'],[],[
    sector('hotelaria','Viagens e hospedagem',['turismo'],['ads-turismo']),
    sector('eventos','Produção de eventos',['eventos'])
   ]),
   audience('pets','Pets e cuidados animais',['ads-pets'],['pets'])
  ]},
  {id:'look',label:'Estilo e cor',topics:[
   audience('artistico','Estilos artísticos',[],[],[
    audience('cinema','Cinema e fotografia',['cinema']),
    audience('design','Design e tipografia',['grafico','apresentacoes']),
    audience('ilustracao','Ilustração e desenho',['ilustracao']),
    audience('texturas','Texturas e materiais',['materiais','grafico']),
    audience('3d','3D e maquetes',['volume']),
    audience('movimento','Animação e movimento',['motion','motion-campanha']),
    audience('colagem','Colagem e misturas visuais',['hibridos'])
   ]),
   audience('cores','Cores das referências',[],[],[
    palette('vermelho','Vermelho'),palette('vinho','Vinho'),palette('laranja','Laranja'),
    palette('amarelo','Amarelo'),palette('verde','Verde'),palette('turquesa','Turquesa'),
    palette('azul','Azul'),palette('roxo','Roxo'),palette('rosa','Rosa'),
    palette('marrom','Marrom'),palette('bege','Bege'),palette('cinza','Cinza'),
    palette('preto','Preto'),palette('branco','Branco e off-white',['branco','off-white'])
   ])
  ]}
 ];
 const browseGroup=id=>browseGroups.find(group=>group.id===id);
 function matchesNode(style,node,colors){
  return node.families?.includes(style.family)||node.sectors?.includes(style.presenterEditing?.sector)||
   node.colors?.some(color=>colors.includes(color))||node.children?.some(child=>matchesNode(style,child,colors))||false;
 }
 function matchesBrowse(style,group,topic='',detail='',colors=[]){
  const entry=browseGroup(group);
  if(!entry)return !group;
  if(!topic)return entry.topics.some(item=>matchesNode(style,item,colors));
  const selected=entry.topics.find(item=>item.id===topic);
  if(!selected)return false;
  const node=detail?selected.children.find(item=>item.id===detail):selected;
  return !!node&&matchesNode(style,node,colors);
 }
 const businessTopics=browseGroup('business').topics;
 const marketSectors=new Map(businessTopics.flatMap(topic=>[topic,...topic.children].flatMap(node=>node.sectors.map(id=>[id,topic]))));
 function groupByNiche(styles,preferredSectors=[]){
  const groups=new Map();
  for(const style of styles){
   const sector=style.presenterEditing?.sector;
   const niche=marketSectors.get(sector)||businessTopics.find(topic=>matchesNode(style,topic,[]));
   const id=niche?.id||'geral';
   if(!groups.has(id))groups.set(id,{id,label:niche?.label||'Para vários tipos de negócio',prioritized:[],styles:[]});
   const group=groups.get(id);
   (preferredSectors.includes(sector)?group.prioritized:group.styles).push(style);
  }
  const order=[...businessTopics.map(topic=>topic.id),'geral'];
  return [...groups.values()]
   .sort((a,b)=>Number(b.prioritized.length>0)-Number(a.prioritized.length>0)||order.indexOf(a.id)-order.indexOf(b.id))
   .map(({id,label,prioritized,styles})=>({id,label,styles:[...prioritized,...styles]}));
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
 globalThis.DiStevenCollections=Object.freeze({goals,definitions,collection,niches,matchesNiche,matchesCollection,previewRatio,diversify,browseGroups,browseGroup,matchesBrowse,groupByNiche});
})();
