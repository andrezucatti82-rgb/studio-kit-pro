/* Local catalogue search: editorial tags are discovery data, never production instructions. */
(function(root){
 'use strict';
 const normalize=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
 // Explicit variants avoid substring errors such as cão -> educação or mão -> limão.
 const discoveryConcepts=[
  ['vender','vender|venda|vendas|converter|conversão|conversões','purpose'],
  ['explicar','explicar|explicativo|explicativa|explicativos|explicativas|como funciona','purpose'],
  ['apresentar','apresentar|apresentação|apresentações|apresentação de produto|apresentar produto|apresentar serviço','purpose'],
  ['ensinar','ensinar|ensinar a fazer|educar|passo a passo|didático|didática','purpose'],
  ['lançamento','lançamento|lançamentos|lançar|estreia','purpose'],
  ['promoção','promoção|promoções|oferta|ofertas|desconto|descontos','purpose'],
  ['anúncio','anúncio|anúncios|propaganda|publicidade|publicitário|publicitária|ads','purpose'],
  ['institucional','institucional|institucionais|vídeo de empresa|apresentação da empresa','purpose'],
  ['marca','marca|marcas|branding|identidade visual|posicionamento de marca','purpose'],
  ['tutorial','tutorial|tutoriais|guia de uso|instrução|instruções','purpose'],
  ['demonstração','demonstração|demonstrações|demonstrar|demonstração de uso','purpose'],
  ['comparação','comparação|comparações|comparar|comparativo|comparativa|versus','purpose'],
  ['bastidores','bastidores|making of|processo de produção|processo artesanal','purpose'],
  ['depoimento','depoimento|depoimentos|testemunho|testemunhos|prova social','purpose'],
  ['lançamento imobiliário','lançamento imobiliário|lançamentos imobiliários|imóvel na planta|imóveis na planta','niche'],
  ['investimento','investimento|investimentos|investir|investidor|investidores','purpose'],
  ['aluguel','aluguel|aluguéis|locação|locações|alugar','purpose'],
  ['moradia','moradia|morar|primeiro imóvel|primeira casa','purpose'],
  ['airbnb','airbnb|locação por temporada|aluguel por temporada','niche'],
  ['posição solar','posição solar|orientação solar|sol da manhã|sol da tarde|insolação','content'],
  ['localização','localização|localizações|vizinhança|bairro|bairros|proximidade','content'],
  ['imóvel comercial','imóvel comercial|imóveis comerciais|sala comercial|salas comerciais|ponto comercial','niche'],
  ['redes sociais','redes sociais|rede social|conteúdo social|conteúdo para redes sociais','channel'],
  ['instagram','instagram|insta','channel'],['reels','reels|reel','channel'],['stories','stories|story','channel'],
  ['tiktok','tiktok|tik tok','channel'],['youtube','youtube|you tube','channel'],['shorts','shorts|youtube shorts','channel'],
  ['whatsapp','whatsapp|whats|zap','channel'],['landing page','landing page|landing pages|página de vendas|páginas de vendas','channel'],
  ['feed','feed|feed de notícias','channel'],['apresentação comercial','apresentação comercial|apresentações comerciais|pitch|pitch comercial','channel'],
  ['azul','azul|azuis|azulado|azulada','color'],['verde','verde|verdes|esverdeado|esverdeada','color'],
  ['vermelho','vermelho|vermelha|vermelhos|vermelhas|avermelhado','color'],['amarelo','amarelo|amarela|amarelos|amarelas','color'],
  ['laranja','laranja|alaranjado|alaranjada','color'],['roxo','roxo|roxa|violeta|lilás','color'],['rosa','rosa|rosado|rosada|pink','color'],
  ['bege','bege|bege claro|areia','color'],['marrom','marrom|marrons|castanho|castanha','color'],['cinza','cinza|cinzas|acinzentado','color'],
  ['preto','preto|preta|pretos|pretas|negro|negra','color'],['branco','branco|branca|brancos|brancas','color'],
  ['dourado','dourado|dourada|gold|ouro','color'],['prateado','prateado|prateada|prata|silver','color'],
  ['vinho','vinho|bordô|bordo|burgundy','color'],['turquesa','turquesa|ciano|cyan|teal','color'],['off-white','off white|offwhite|marfim','color'],
  ['tons quentes','tons quentes|paleta quente|cores quentes','color'],['tons frios','tons frios|paleta fria|cores frias','color'],
  ['tons pastéis','tons pastéis|tons pastel|cores pastéis|paleta pastel','color'],['colorido','colorido|colorida|multicolorido|multicolorida','color'],
  ['saturado','saturado|saturada|cores vibrantes|paleta vibrante','visual'],
  ['sofisticado','sofisticado|sofisticada|sofisticados|sofisticadas|refinado|refinada|elegante|elegantes','visual'],
  ['premium','premium|luxuoso|luxuosa|luxuosos|luxuosas','visual'],['editorial','editorial|editoriais|revista|revistas','visual'],
  ['lúdico','lúdico|lúdica|lúdicos|lúdicas|divertido|divertida','visual'],['orgânico','orgânico|orgânica|orgânicos|orgânicas','visual'],
  ['analógico','analógico|analógica|analógicos|analógicas|analogue','visual'],['retrô','retrô|retro|vintage|nostálgico|nostálgica','visual'],
  ['futurista','futurista|futuristas|futurismo|ficção científica|sci fi','visual'],['documental','documental|documentário|documentários|observacional','visual'],
  ['sensorial','sensorial|sensoriais|asmr','visual'],['artesanal','artesanal|artesanais|feito à mão|feito a mão','visual'],
  ['serifa','serifa|serifas|serif|serifada','visual'],['sem serifa','sem serifa|sans|sans serif|sans serifa|humanista','visual'],
  ['tipografia cinética','tipografia cinética|kinetic type|kinetic typography|texto animado','visual'],
  ['câmera lenta','câmera lenta|slow motion|slowmotion','visual'],['time-lapse','time lapse|timelapse|passagem de tempo','visual'],
  ['drone','drone|drones|vista aérea|vistas aéreas|plano aéreo','visual'],['plano sequência','plano sequência|plano sequencia|one take|tomada única','visual'],
  ['travelling','travelling|traveling|dolly|deslocamento de câmera','visual'],['close-up','close up|closeup|close|plano detalhe','visual'],
  ['split screen','split screen|tela dividida|telas divididas','visual'],['realidade aumentada','realidade aumentada|augmented reality','visual'],
  ['sobreposição','sobreposição|sobreposições|overlay|overlays','visual'],['profundidade','profundidade|paralaxe|parallax','visual'],
  ['funil de vendas','funil de vendas|funil comercial|funil|funis','content'],['métricas','métrica|métricas|indicador|indicadores|kpi|kpis','content'],
  ['retorno de investimento','retorno de investimento|retorno sobre investimento|roi|roas','content'],['leads','lead|leads|captação de clientes|captar clientes','content'],
  ['automação','automação|automações|automatizar|automático|automática','content'],['atendimento','atendimento|atendimentos|suporte ao cliente','content'],
  ['logística','logística|entrega|entregas|frete|estoque','content'],['pagamento','pagamento|pagamentos|checkout|carrinho','content'],
  ['clínica odontológica','clínica odontológica|consultório odontológico|saúde bucal|implantodontia','niche'],
  ['prótese','prótese|próteses|prótese dentária|próteses dentárias','product'],['coroa dentária','coroa dentária|coroas dentárias|coroa do dente','product'],
  ['clareamento','clareamento|clareamento dental|clarear os dentes','content'],['ortodontia','ortodontia|aparelho dental|alinhador|alinhadores','niche'],
  ['fisioterapia','fisioterapia|fisioterapeuta|fisioterapeutas|reabilitação física','niche'],['nutrição','nutrição|nutricionista|nutricionistas','niche'],
  ['psicologia','psicologia|psicólogo|psicóloga|terapia|terapeuta','niche'],['medicina','medicina|médico|médica|médicos|médicas|consultório médico','niche'],
  ['salão de beleza','salão de beleza|salões de beleza|cabeleireiro|cabeleireira|barbearia|barbeiro','niche'],
  ['maquiagem','maquiagem|maquiagens|makeup|batom|batons','product'],['perfume','perfume|perfumes|perfumaria|fragrância|fragrâncias','product'],
  ['creme','creme|cremes|hidratante|hidratantes|sérum|serum','product'],['protetor solar','protetor solar|protetores solares|filtro solar','product'],
  ['hambúrguer','hambúrguer|hambúrgueres|hamburgueria|burger','product'],['pizza','pizza|pizzas|pizzaria','product'],
  ['cerveja','cerveja|cervejas|cervejaria|cervejarias|chopp','product'],['coquetel','coquetel|coquetéis|cocktail|cocktails','product'],
  ['chocolate','chocolate|chocolates|brigadeiro|brigadeiros','product'],['doce','doce|doces|sobremesa|sobremesas','product'],
  ['croissant','croissant|croissants|massa folhada','product'],['buquê','buquê|buquês|buque|buques|arranjo floral','product'],
  ['casamento','casamento|casamentos|noiva|noivas|nupcial','niche'],['presente','presente|presentes|presentear|vale presente','purpose'],
  ['camiseta','camiseta|camisetas|t shirt|t shirts','product'],['calçado','calçado|calçados|sapato|sapatos|tênis|tenis|sandália|sandálias','product'],
  ['bolsa','bolsa|bolsas|mochila|mochilas','product'],['óculos','óculos|oculos|ótica|otica','product'],['acessório','acessório|acessórios|acessorio|acessorios','product'],
  ['móveis','móvel|móveis|moveis|mobiliário|mobiliario|marcenaria','product'],['sofá','sofá|sofás|sofa|sofas','product'],
  ['iluminação decorativa','luminária|luminárias|abajur|pendente de iluminação','product'],['tapete','tapete|tapetes|capacho|capachos','product'],
  ['limpeza','limpeza|limpar|higienização|higienizacao','niche'],['reforma','reforma|reformas|reformar','niche'],
  ['energia solar','energia solar|painel solar|painéis solares|fotovoltaico|fotovoltaica','niche'],['ar-condicionado','ar condicionado|climatização|climatizacao','product'],
  ['segurança residencial','segurança residencial|alarme|alarmes|câmera de segurança|câmeras de segurança','niche'],
  ['oficina','oficina|oficinas|mecânico|mecânica automotiva|manutenção automotiva','niche'],
  ['concessionária','concessionária|concessionárias|revenda de carros|revenda de veículos|revenda de motos','niche'],
  ['motor','motor|motores|motorização','product'],['acessibilidade','acessibilidade|acessível|acessiveis|mobilidade reduzida','content'],
  ['finanças','finanças|financeiro|financeira|contabilidade|contador|contadora','niche'],['seguro','seguro|seguros|seguradora|seguradoras','niche'],
  ['consultoria','consultoria|consultorias|consultor|consultora','niche'],['comércio local','comércio local|negócio local|negócios locais','niche'],
  ['restaurante delivery','delivery|restaurante delivery|pedido de comida|entrega de comida','niche']
 ];
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
 ,...discoveryConcepts].map(([tag,aliases,facet])=>({tag,aliases:aliases.split('|'),facet:facet||'content'}));
 const aliases=new Map(),maxPhrase=5;
 for(const {tag,aliases:variants}of concepts)for(const word of [tag,...variants])aliases.set(normalize(word),tag);
 const stop=new Set('a o as os de da do das dos em no na nos nas um uma uns umas e ou para por com que meu minha seu sua dos video videos estilo estilos quero preciso procuro busco buscar encontrar fazer criar ideia ideias sobre como'.split(' '));
 function units(value){
  const words=normalize(value).split(' ').filter(Boolean),out=[];
  for(let i=0;i<words.length;){let found=false;for(let n=Math.min(maxPhrase,words.length-i);n>0;n--){const phrase=words.slice(i,i+n).join(' '),tag=aliases.get(phrase);if(tag){out.push({value:tag,known:true});i+=n;found=true;break;}}if(!found){if(!stop.has(words[i]))out.push({value:words[i],known:false});i++;}}
  return out;
 }
 const strings=value=>Array.isArray(value)?value.flatMap(strings):typeof value==='string'?[value]:[];
 // Positive description fields only: policy/proof boilerplate must not tag every style with a forbidden effect.
 const positive=value=>strings(value).flatMap(s=>s.replace(/\bsem\s+serifa\b/gi,'sans serif').split(/(?<=[.!?;])\s+/).map(part=>/\b(?:não|nunca|evitar|evite)\b/i.test(part)?'':part.replace(/(?:,?\s+)?\bsem\b[^.;→]*/gi,'')));
 function sourceFields(s){
  const p=s.presenterEditing||{},plan=s.executionPlan||{},direction=p.creativeDirection||plan.creativeDirection||{},depth=p.depthComposition||plan.depthComposition||{};
  return [
   ['name',strings(s.name)],['family',strings(s.familyName)],['kind',strings(s.kind)],['topic',strings([s.exampleTopic,s.adSubniche,s.sequence?.theme])],
   ['signature',positive(s.signature)],['uses',positive(s.uses)],
   ['resources',positive((s.resources||[]).filter(v=>! /^(vídeo IA$|Fotos ou vídeos originais|Ficha real de características|Pessoas e vozes autorizadas|Identidade da marca,|Narração profissional em|Letreiros, legendas sincronizadas, diagramas e CTA)/i.test(v)))],
   ['motion',positive(s.motion)],['frames',positive(s.sequence?.frames?.map(f=>[f.action,f.caption,f.alt]))],
   ['appearance',positive([plan.appearance,plan.visualLayout])],['sector',strings(p.sectorName)],
   ['creativeDirection',positive([direction.compositionIdea,direction.commercialPurpose,direction.shotLanguage,direction.typographyDirection])],
   ['depthComposition',positive([depth.camera,depth.graphicEvolution,depth.typography])]
  ];
 }
 function fields(s){return sourceFields(s).flatMap(([,values])=>values);}
 function paletteColors(s){
  const palette=s.presenterEditing?.finishProfile?.palette||s.executionPlan?.finishProfile?.palette||[],out=new Set();
  for(const hex of palette){
   if(typeof hex!=='string'||!/^#[0-9a-f]{6}$/i.test(hex))continue;
   const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,sat=d/(1-Math.abs(2*l-1)||1);
   let hue=!d?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;hue=(hue*60+360)%360;
   if(l<.13)out.add('preto');else if(l>.95)out.add('branco');else if(l>.86&&sat<.5)out.add('off-white');else if(sat<.12)out.add('cinza');
   else if(hue<15||hue>=345)out.add(l<.35?'vinho':'vermelho');else if(hue<45)out.add(l<.45?'marrom':l>.75&&sat<.6?'bege':'laranja');
   else if(hue<70)out.add(l>.7&&sat<.5?'bege':'amarelo');else if(hue<170)out.add('verde');else if(hue<200)out.add('turquesa');else if(hue<260)out.add('azul');else if(hue<300)out.add('roxo');else out.add(l<.35?'vinho':'rosa');
  }
  return [...out];
 }
 function analyze(s,extra=[],referenceColors=[]){
  const sources=sourceFields(s),text=sources.flatMap(([,v])=>v).join(' '),tags=new Map(),evidence={};
  const add=(tag,source)=>{if(typeof tag!=='string'||!tag.trim())return;const key=normalize(tag);if(!tags.has(key))tags.set(key,tag.trim());(evidence[key]??=[]).includes(source)||evidence[key].push(source);};
  for(const [source,values]of sources)for(const u of units(values.join(' ')))if(u.known)add(u.value,source);
  for(const [source,value]of [['name',s.name],['family',s.familyName],['kind',s.kind],['topic',s.exampleTopic]])add(value,source);
  for(const tag of extra)add(tag,'editorial_override');
  for(const color of paletteColors(s))add(color,'declared_palette');
  for(const color of referenceColors)add(color,'reference_color_analysis');
  if(s.presenterEditing?.presenterSources?.includes('explicitly_selected_avatar'))for(const tag of ['avatar','apresentador','explicador','explicação interativa','explicar'])add(tag,'presenter_recipe');
  if(/\bplantas?\b/.test(normalize(text))&&(s.family==='imoveis'||/corret|imove|arquitet|interiore|engenharia|evento/.test(normalize(s.presenterEditing?.sector))))add('planta baixa','property_context');
  // These are intended uses, not claims that a video has been published there.
  if(s.family?.startsWith('ads-')||['anuncios','campanhas','ecommerce','motion-campanha'].includes(s.family))for(const tag of ['anúncio','vender','apresentar','redes sociais'])add(tag,'commercial_family');
  if(/\b(?:social|redes sociais)\b/.test(normalize(text))||s.presenterEditing?.creativeDirection?.referenceLens==='ultrarealistic_commercial_social')add('redes sociais','social_recipe');
  if(tags.has('redes sociais'))for(const tag of ['instagram','reels','tiktok','shorts'])add(tag,'short_social_use');
  if(tags.has('cachorro')||tags.has('gato'))add('pet','animal_hierarchy');if(tags.has('pet'))add('animal','animal_hierarchy');
  if(tags.has('dentista'))add('clínica odontológica','dental_context');
  if(['explicador','diagrama','infografico','tutorial','demonstracao'].some(t=>tags.has(t)))add('explicar','explanatory_technique');
  if(tags.has('apresentador'))add('apresentar','presenter_recipe');
  if(tags.has('alto padrao'))add('premium','premium_context');
  if(tags.has('off white'))add('branco','color_hierarchy');
  const list=[...tags.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  return {tags:list,evidence};
 }
 function tagsFor(s,extra=[],referenceColors=[]){return analyze(s,extra,referenceColors).tags;}
 // The public code uses only the immutable catalogue ID, independent of names and order.
 const codeAlphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ';
 function styleCode(id){
  let hash=0xcbf29ce484222325n;
  for(const char of id)hash=BigInt.asUintN(64,(hash^BigInt(char.codePointAt(0)))*0x100000001b3n);
  let code='';
  for(let i=0;i<8;i++,hash>>=5n)code=codeAlphabet[Number(hash&31n)]+code;
  return 'DIS-'+code;
 }
 function readCode(query){
  const match=/^(?:DIS|FOL)[\s-]*([0-9A-HJKMNP-TV-Z]{8})$/i.exec(query.trim());
  return match?'DIS-'+match[1].toUpperCase():'';
 }
 function createIndex(styles,metadata={}){
  const entries=styles.map((style,order)=>{
   const tags=metadata.styleTags?.[style.id]||tagsFor(style,[],metadata.styleColors?.[style.id]||[]),text=fields(style).concat(tags).join(' '),tokens=new Set(units(text).map(u=>u.value));
   if(tokens.has('cachorro')||tokens.has('gato'))tokens.add('pet');if(tokens.has('pet'))tokens.add('animal');
   return {style,order,tags,tokens,words:new Set(normalize(text).split(' ')),title:normalize(style.name),titleTokens:new Set(units(style.name).map(u=>u.value))};
  });
  const byCode=new Map(entries.map(entry=>[styleCode(entry.style.id),entry]));
  function search(query){
   const raw=String(query??'').slice(0,256),code=readCode(raw);
   if(code){
    const entry=byCode.get(code);
    return entry?[{style:entry.style,score:1000,order:entry.order}]:[];
   }
   const q=normalize(raw),terms=[...new Map(units(q).map(u=>[u.value,u])).values()];if(!terms.length)return entries.map(e=>({style:e.style,score:0}));
   return entries.flatMap(e=>{
    const matches=terms.map(t=>e.tokens.has(t.value)||e.words.has(normalize(t.value))||(!t.known&&t.value.length>=3&&[...e.words].some(w=>w.startsWith(t.value))));if(matches.some(m=>!m))return [];
    const score=(e.title===q?1000:e.title.includes(q)?300:0)+terms.reduce((n,t)=>n+(e.titleTokens.has(t.value)?30:0)+(e.tokens.has(t.value)?10:1),0);
    return [{style:e.style,score,order:e.order}];
   }).sort((a,b)=>b.score-a.score||a.order-b.order);
  }
  function oneEdit(a,b){
   if(a===b||Math.abs(a.length-b.length)>1)return false;let i=0;while(i<a.length&&a[i]===b[i])i++;
   if(a.length===b.length)return a.slice(i+1)===b.slice(i+1)||(a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2));
   return a.length>b.length?a.slice(i+1)===b.slice(i):a.slice(i)===b.slice(i+1);
  }
  function suggest(query,{limit=6,filter=()=>true}={}){
   const raw=String(query??'').slice(0,256),code=readCode(raw);
   if(code){
    const entry=byCode.get(code);
    return entry&&filter(entry.style)?[{query:code,label:entry.style.name,kind:'style',id:entry.style.id,count:1}]:[];
   }
   const q=normalize(raw);if(q.length<2)return [];
   limit=Math.max(1,Math.min(8,Math.floor(Number(limit)||6)));
   const split=q.lastIndexOf(' '),prefix=split<0?'':q.slice(0,split+1),tail=split<0?q:q.slice(split+1),seen=new Set(),words=[];
   for(const concept of concepts){
    const direct=concept.aliases.some(a=>normalize(a).startsWith(q)),last=prefix&&concept.aliases.some(a=>normalize(a).startsWith(tail));
    if(!direct&&!last)continue;
    const value=(direct?'':prefix)+concept.tag,key=normalize(value);if(key===q||seen.has(key))continue;seen.add(key);
    const count=search(value).filter(r=>filter(r.style)).length;if(!count)continue;
    words.push({query:value,label:value,kind:'keyword',count,priority:(direct?100:50)+(normalize(concept.tag).startsWith(direct?q:tail)?25:0)+Math.log2(count+1)});
   }
   words.sort((a,b)=>b.priority-a.priority||a.label.localeCompare(b.label,'pt-BR'));
   const related=new Set(words.slice(0,3).flatMap(w=>search(w.query).filter(r=>filter(r.style)).map(r=>r.style.id))),titles=[];
   for(const result of search(query)){
    if(!filter(result.style)||(related.size&&!related.has(result.style.id)))continue;const key=normalize(result.style.name);if(seen.has(key)||key===q)continue;seen.add(key);
    titles.push({query:result.style.name,label:result.style.name,kind:'style',id:result.style.id,count:1});if(titles.length===3)break;
   }
   if(!words.length&&!titles.length&&tail.length>=4&&tail.length<=48){
    for(const concept of concepts){if(!concept.aliases.some(a=>oneEdit(tail,normalize(a))))continue;const value=prefix+concept.tag,key=normalize(value);if(seen.has(key))continue;seen.add(key);const count=search(value).filter(r=>filter(r.style)).length;if(count)words.push({query:value,label:value,kind:'keyword',count,correction:true});}
    words.sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'pt-BR'));
   }
   const ordered=titles.length?[...words.slice(0,3),...titles,...words.slice(3)]:words;
   return ordered.slice(0,limit).map(({priority,...item})=>item);
  }
  return {search,suggest,tagsForId:id=>entries.find(e=>e.style.id===id)?.tags||[]};
 }
 function similar(styles,source,limit=24,metadata={}){
  if(!source)return [];
  const common=new Set(['realista','avatar','apresentador','explicador','explicação interativa','produto','serviço','luz','legenda','narração','efeito sonoro','música','anúncio','vender','apresentar','explicar','redes sociais','instagram','reels','tiktok','shorts'].map(normalize));
  const tags=s=>new Set((metadata.styleTags?.[s.id]||tagsFor(s)).map(normalize).filter(t=>!common.has(t))),origin=tags(source),sector=source.presenterEditing?.sector;
  return styles.filter(s=>s.id!==source.id).map((style,order)=>{const terms=tags(style),shared=[...origin].filter(t=>terms.has(t)).length;
   const score=(style.family===source.family?4:0)+(style.kind===source.kind?2:0)+(sector&&style.presenterEditing?.sector===sector?8:0)+12*shared/Math.max(1,new Set([...origin,...terms]).size);
   return {style,score,order};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,limit).map(x=>x.style);
 }
 root.AtlasSearch={normalize,concepts,fields,tagsFor,analyze,sourceFields,paletteColors,createIndex,similar,styleCode};
})(globalThis);
