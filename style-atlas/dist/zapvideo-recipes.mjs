const sequence = (name, numbers = [1, 2, 3]) => numbers.map(n => `/assets/style-sequences/${name}-0${n}.webp`);
const campaign = n => ({frames:[1,2,3].map(i => `/assets/motion-campaign-0${i}.webp`), video:`/previews/motion-campaign-0${n}.mp4`});

const presenterPanels = (asset, reference) => ({
  frames:Array(3).fill('/assets/presenter-realistic/'+asset), panels:[0,1,2], style:'presenter', reference,
});

export const recipePreviews = {
  beforeAfter:{frames:sequence('antes-e-depois',[1,2,4]),style:'routine'},
  unboxing:{frames:sequence('unboxing-artesanal',[1,2,4]),style:'product'},
  tutorial:{frames:sequence('tutorial-de-interface',[1,2,4]),style:'motion'},
  backstage:{frames:sequence('anfitriao-de-cinema-em-bastidores-visiveis',[1,2,4]),style:'routine'},
  diagram:presenterPanels('explicador-diagrama-ao-lado.png','Planta em vidro'),
  orbit:presenterPanels('explicador-orbita-frente-tras.png','Sorriso em etapas'),
  steps:presenterPanels('explicador-agencias-do-anuncio-ao-caixa-com-evidencias.webp','Do anúncio ao caixa, com evidências'),
  gesture:presenterPanels('explicador-dados-no-gesto.png','Apresentador com dados'),
  layers:presenterPanels('explicador-dentistas-implante-pilar-e-coroa-em-conversa.webp','Implante, pilar e coroa em conversa'),
  roles:presenterPanels('explicador-clones-dialogando.png','Duas perguntas, uma orientação'),
  presenter:{frames:sequence('apresentadora-despojada-em-cafe-externo',[2,3,4]), style:'presenter'},
  edit:{frames:sequence('campanha-legenda-como-faixa-editorial-movel'), style:'routine'},
  product:{frames:[4,2,3].map(n => `/assets/segments-440/ads26-alimentacao-o-cafe-muda-o-ponto-de-vista-0${n}.webp`),
    video:'/previews/automation-pilot/01-product.mp4', style:'product'},
  motion:{...campaign(1),style:'motion'},
  cinema:{frames:sequence('acabamentos-em-macro',[1,3,4]),style:'sensory'},
  editorial:{frames:[40,39,38].map(n => `/assets/editorial-r3/grafico-${n}.webp`),style:'motion'},
  screen:{frames:[0,1,2].map(n => `/previews/automation-pilot/02-software-board-${n}.jpg`),
    video:'/previews/automation-pilot/02-software.mp4',style:'motion'},
};

const visuals='image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm,.mkv,.m4v,.mov';
const materials = {
  comparison:{kind:'visuals',label:'Enviar fotos ou vídeos',accept:visuals,multiple:true,
    hint:'Use arquivos próprios ou autorizados para mostrar o que aconteceu.'},
  presenterAssets:{kind:'presenterAssets',label:'Gravações e referências',accept:visuals,multiple:true,
    hint:'Selecione o material do apresentador e as imagens que aparecem na explicação.'},
  person:{kind:'person',label:'Foto ou vídeo de quem apresenta',accept:'image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm',
    hint:'Prefira um vídeo com fala limpa para ter imagem e voz na mesma referência.'},
  product:{kind:'product',label:'Foto do produto',accept:'image/png,image/jpeg,image/webp',
    hint:'Uma foto nítida ajuda a preservar a aparência do produto.'},
  video:{kind:'video',label:'Gravação original',accept:'video/mp4,video/quicktime,video/webm,.mkv,.m4v,.mov',
    hint:'Escolha o vídeo que deve servir de base.'},
  image:{kind:'image',label:'Imagem, logo ou referência',accept:'image/png,image/jpeg,image/webp',
    hint:'Use uma imagem que ajude a mostrar como deve ficar.'},
};
export const recipeGoals = {
  explain:'Explicar uma ideia', sell:'Vender ou gerar contatos', brand:'Divulgar uma marca', engage:'Gerar interesse',
};

// Each recipe names the beats that make its result different from a generic video.
const groups = [
  ['editar','Editar vídeo que já tenho',[
    ['reels-edicao','Editar vídeo pronto e transformar em Reels','edit','edit','engage','video','Parte que prende','Corte e legenda','Fechamento'],
    ['cortes-podcast','Cortes de vídeo longo ou podcast','edit','edit','engage','video','Escolher um gancho','Recortar uma ideia completa','Ajustar enquadramento e legenda'],
    ['depoimento','Depoimento de cliente','presenter','review','brand','video','Apresentar o cliente','Mostrar a experiência real','Concluir com as palavras do cliente'],
    ['broll-graficos','Vídeo gravado com b-roll e gráficos','edit','review','explain','video','Escolher a fala principal','Apoiar com imagens e gráficos','Voltar à fala para concluir'],
    ['vfx','Efeitos especiais em vídeo','cinema','review','engage','video','Estabelecer a cena original','Planejar a transformação','Mostrar o resultado da ação'],
    ['podcast-completo','Podcast completo: cortes + capa + áudio','edit','review','engage','video','Separar os melhores momentos','Planejar tratamento do áudio','Propor abertura e capa'],
    ['tutorial-tela','Tutorial com gravação de tela','screen','video','explain','video','Mostrar o resultado esperado','Guiar pela tela real','Repetir o passo decisivo'],
    ['bastidores','Bastidores da loja ou produção','backstage','review','brand','video','Apresente o ambiente e o processo','Costure etapas com cortes no ritmo','Mostre o que ficou pronto'],
  ]],
  ['ia','Vídeo com IA',[
    ['video-ia','Criar vídeo com IA generativa','cinema','video','brand','image','Abrir com uma imagem forte','Revelar a ação','Fechar a história'],
    ['ia-motion','Vídeo com IA + motion design','motion','review','explain','image','Apresentar a cena','Destacar a ideia com animação','Reunir cena e mensagem'],
    ['ia-ugc','Vídeo com IA + anúncio estilo UGC','presenter','video','sell','product','Abrir com a situação','Intercalar uso e cenas de apoio','Fechar com um convite'],
    ['loja-ia','Loja online + vídeo com IA generativa','product','video','sell','product','Escolher o produto da vitrine','Mostrar o uso com cenas de apoio','Levar à página do produto'],
    ['influencer-ia','Influencer de IA para a marca','presenter','review','brand','image','Definir a presença do personagem','Apresentar um assunto da marca','Planejar uma sequência recorrente'],
  ]],
  ['apres','Apresentador e avatar',[
    ['avatar','Criar vídeo do zero com avatar','presenter','review','explain','person','Apresentar o assunto','Explicar olhando para a câmera','Concluir com um convite'],
    ['avatar-motion','Avatar + motion design','presenter','review','explain','person','Apresentar o assunto com a pessoa','Animar a ideia junto à fala','Fechar com a conclusão'],
    ['noticia-tela-verde','Comentando notícia com tela verde','screen','review','explain','comparison','Mostre a manchete e a fonte','Apresente o contexto da notícia','Mostre o comentário em frente à manchete'],
    ['responder-comentario','Vídeo respondendo comentário','presenter','review','engage','comparison','Mostre a pergunta real com os dados pessoais ocultos','Responda à câmera','Feche com uma demonstração ou próxima ação'],
    ['diagrama-aceso','Diagrama que acende quando é citado','diagram','review','explain','presenterAssets','Apresente o diagrama real','Destaque a parte no momento da fala','Mostre como as partes se conectam'],
    ['objetos-orbita','Objetos em órbita ao redor do apresentador','orbit','review','explain','presenterAssets','Apresente os três itens','Alterne os itens na frente e atrás da pessoa','Alinhe os itens na ordem da explicação'],
    ['etapas-degraus','Etapas em degraus: o apresentador caminha','steps','review','explain','presenterAssets','Apresente as etapas em degraus','Mostre a pessoa caminhando entre as etapas','Feche com o resultado e a evidência disponível'],
    ['dados-gesto','Dados que respondem ao gesto','gesture','review','explain','presenterAssets','Marque o gesto que dispara o gráfico','Faça o gráfico responder ao gesto','Destaque o número final e cite a fonte'],
    ['produto-camadas','Produto explicado por camadas','layers','review','explain','presenterAssets','Mostre o produto completo','Separe as peças reais e explique sua função','Recomponha o produto'],
    ['mitos-dois-papeis','Mitos e fatos com dois papéis','roles','review','explain','presenterAssets','Uma versão da pessoa apresenta o mito','A outra responde e mostra a evidência','Resuma o fato e a orientação'],
  ]],
  ['motion','Motion design e explicativos',[
    ['motion','Vídeo só com motion design','motion','review','explain','image','Isolar uma ideia','Transformar formas e texto','Finalizar com a mensagem'],
    ['apresentacao','Criar apresentação','editorial','plan','explain','image','Definir a mensagem da abertura','Organizar um ponto por slide','Encerrar com a decisão esperada'],
    ['dados-graficos','Explicativo com dados e gráficos','editorial','review','explain','image','Fazer uma pergunta','Mostrar o dado e sua fonte','Explicar o que muda'],
    ['vinheta','Abertura, vinheta e logo animado','motion','review','brand','image','Introduzir a forma da marca','Animar a revelação','Segurar o logo legível'],
    ['educativo-multi','Conteúdo educativo multiformato','editorial','video','explain','image','Abrir com a dúvida','Demonstrar com um exemplo','Adaptar a conclusão para outros formatos'],
    ['noticia-reels','Notícia do dia em Reels','editorial','review','explain',null,'Apresentar o fato com a fonte','Explicar o contexto','Mostrar por que importa'],
    ['institucional','Vídeo institucional da empresa','cinema','video','brand','image','Apresentar a empresa','Mostrar como ela trabalha','Fechar com propósito e contato'],
  ]],
  ['anuncios','Anúncios e vendas',[
    ['foto-pessoa','Anúncio com foto de produto e pessoa','product','video','sell','product','Apresentar o produto','Mostrar uma pessoa em contexto','Convidar para conhecer'],
    ['lancamento','Lançamento ou promoção','product','video','sell','product','Revelar a novidade','Mostrar uso ou condição da oferta','Orientar a próxima ação'],
    ['ugc','Anúncio estilo UGC / influencer','presenter','video','sell','product','Abrir com uma situação cotidiana','Demonstrar em primeira pessoa','Convidar para experimentar'],
    ['produto-digital','Lançamento de produto digital','screen','video','sell','image','Apresentar o problema','Mostrar o produto em ação','Convidar para acessar'],
    ['depoimento-anuncio','Depoimento que vira anúncio','presenter','review','sell','video','Selecionar a frase mais clara','Dar contexto com imagem de apoio','Fechar com convite separado da fala'],
    ['criativos-meta','Kit de criativos para Meta Ads','product','review','sell','product','Testar um gancho de problema','Testar um gancho de demonstração','Propor variações de convite'],
    ['comparativo-produto','Comparativo ou teste do produto','editorial','review','explain','comparison','Apresente critérios e condições do teste','Compare resultados verificáveis','Conclua com o resultado e seus limites'],
  ]],
  ['loja','Loja online',[
    ['produto-loja','Vídeo de produto para loja online','product','video','sell','product','Apresentar a peça','Mostrar detalhes e uso','Orientar a compra'],
    ['fotos-banners','Fotos e banners para e-commerce','cinema','plan','sell','product','Definir a foto principal','Planejar imagens de detalhe','Adaptar o visual para banners'],
    ['datas','Campanha de promoção e datas','product','video','sell','product','Apresentar a condição confirmada','Destacar produtos participantes','Informar prazo e convite'],
    ['black-friday-ugc','Promoção com UGC e contagem','product','video','sell','product','Apresentar um uso cotidiano','Mostrar a oferta confirmada','Fechar com o prazo real'],
    ['colecao','Coleção em vídeo com música','cinema','video','brand','product','Abrir com a peça principal','Alternar detalhes no ritmo da trilha','Fechar com a coleção'],
    ['unboxing','Unboxing e primeira impressão','unboxing','review','engage','video','Abra a embalagem','Mostre detalhes e a reação real','Feche com onde encontrar o produto'],
  ]],
  ['posts','Posts, carrossel e Stories',[
    ['carrossel','Carrossel para Instagram','editorial','plan','engage','image','Abrir com uma promessa','Desenvolver um ponto por cartão','Concluir com uma ação'],
    ['capas','Thumbnails e capas','editorial','plan','engage','image','Definir a promessa visual','Comparar composição e títulos','Testar leitura em tamanho pequeno'],
    ['stories','Sequência de Stories que vende','product','video','sell','product','Prender atenção','Mostrar o benefício em uso','Dar uma ação simples'],
    ['reels-carrossel','Reels + carrossel do mesmo tema','editorial','video','engage','image','Abrir com a pergunta do tema','Explicar um ponto no Reels','Derivar os cartões do roteiro'],
    ['carrossel-salvavel','Carrossel salvável (guia ou checklist)','editorial','plan','engage','image','Confira os dados que sustentam o guia','Separe a promessa e os passos','Finalize com um resumo para salvar'],
  ]],
  ['engaja','Engajamento e crescimento',[
    ['calendario','Calendário e pautas de conteúdo','editorial','plan','engage',null,'Escolher temas','Distribuir formatos e datas','Definir entregas da semana'],
    ['crescer-perfil','Crescer perfil no Instagram e TikTok','edit','plan','engage',null,'Escolher assuntos recorrentes','Planejar formatos para testar','Definir o que acompanhar'],
    ['antes-depois','Antes e depois do produto','beforeAfter','review','sell','comparison','Mostre o antes real','Passe ao depois na batida','Conclua com a transformação comprovada'],
    ['como-usar','Tutorial "como usar" em 30s','tutorial','review','explain','comparison','Mostre o resultado esperado','Demonstre três passos e o erro comum','Reveja o resultado e indique onde encontrar'],
    ['tres-erros','"3 erros que…" em 20 segundos','motion','video','explain',null,'Abra com o primeiro erro e a correção','Mostre o segundo erro','Mostre o terceiro e feche a lista'],
    ['pov-cliente','POV / história do cliente','presenter','video','engage','comparison','Abra do ponto de vista do cliente','Mostre a virada no dia a dia','Feche com a solução em ação'],
    ['trend-audio','Trend com áudio em alta','edit','review','engage','video','Identifique o formato da trend e a origem do áudio','Adapte à mensagem da marca','Revise o corte e o direito de usar o som'],
  ]],
  ['gda','Linha GDA (uso interno)',[
    ['gda','Vídeo da linha oficial GDA','presenter','video','explain','image','Abrir com uma pergunta real','Explicar com um exemplo concreto','Aplicar à próxima decisão'],
  ]],
];

const recipeDetails = {
  'antes-depois':{hint:'Envie os registros reais do antes e do depois.'},
  unboxing:{hint:'Envie a gravação abrindo a embalagem. Inclua closes do produto, se tiver.'},
  'como-usar':{duration:30,hint:'Envie a gravação do uso ou uma foto de cada passo.'},
  'tres-erros':{duration:20},
  'pov-cliente':{hint:'Inclua cenas do dia a dia ou uma referência do produto.'},
  bastidores:{hint:'Envie clipes curtos das etapas que você quer mostrar.'},
  'noticia-tela-verde':{hint:'Inclua a gravação do comentário e um print da manchete com sua fonte.'},
  'comparativo-produto':{hint:'Inclua registros do teste. Informe critérios e resultados reais no assunto.'},
  'trend-audio':{hint:'Anexe os clipes da marca. Identifique no assunto a referência de som ou da tendência.'},
  'responder-comentario':{hint:'Inclua o print da pergunta com os dados pessoais ocultos e a resposta gravada, se houver.'},
  'diagrama-aceso':{hint:'Inclua a gravação e a planta, o mapa ou o diagrama verdadeiro.'},
  'objetos-orbita':{hint:'Inclua a gravação e imagens dos três itens que vão circular.'},
  'etapas-degraus':{hint:'Use uma gravação da pessoa andando. Conte quais são as etapas, na ordem.'},
  'dados-gesto':{hint:'Use uma gravação com os gestos visíveis. Informe o dado, a unidade e a fonte.'},
  'produto-camadas':{hint:'Inclua a gravação e fotos das peças reais que serão explicadas.'},
  'mitos-dois-papeis':{hint:'Inclua as gravações de pergunta e resposta e as imagens que mostram a evidência.'},
};

export const recipeGroups = groups.map(([id,name])=>({id,name}));
export const recipes = groups.flatMap(([group,,entries])=>entries.map(
  ([id,name,preview,route,goal,material,...beats])=>({
    id,name,group,preview,route,goal,material:materials[material],beats,...recipeDetails[id],
  })));
const recipesById = new Map(recipes.map(recipe=>[recipe.id,recipe]));
export const findRecipe = id => recipesById.get(id);
export const recipeCanGenerateClip = id => !id || findRecipe(id)?.route==='video';

