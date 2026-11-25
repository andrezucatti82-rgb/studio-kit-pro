import {findRecipe} from './zapvideo-recipes.mjs';

const bounded = (value, max, empty = false) => typeof value==='string' && value.length<=max && (empty || Boolean(value.trim()));
export function validateCreative(input, subject) {
  const recipe=input?.recipeId===null?null:findRecipe(input?.recipeId);
  const source=input?.source;
  if (!input || (input.recipeId!==null && (!recipe || !['video','review'].includes(recipe.route))) ||
      !Object.hasOwn(creativeOrigins,input.origin) || !['link','idea'].includes(source) ||
      (source==='link' && !bounded(input.url,500)) || (source==='idea' && (!bounded(subject,240)||input.url!==undefined))) {
    throw new Error('Confira a receita e o ponto de partida.');
  }
  if (input.goal!==undefined) {
    const {title,detail,directions}=input.goal ?? {};
    if (!bounded(title,80) || !bounded(detail,380) || !Array.isArray(directions) || !directions.length || directions.length>4 ||
        new Set(directions).size!==directions.length || directions.some(id=>!Object.hasOwn(themes,id))) {
      throw new Error('Confira o objetivo escolhido.');
    }
  }
  if (input.styleId!==undefined && (!input.goal || !/^[a-z0-9][a-z0-9-]{0,125}$/.test(input.styleId) ||
      !input.goal.directions.includes(input.direction))) throw new Error('Confira o estilo e a direção.');
  for (const key of ['visual','sound','feedback','summary','category']) {
    if (input[key]!==undefined && !bounded(input[key],['feedback','summary'].includes(key)?500:120,true)) throw new Error('Ajuste de direção inválido.');
  }
  if (input.pace!==undefined && !Object.hasOwn(creativePace,input.pace)) throw new Error('Ritmo inválido.');
  if (input.sound!==undefined && typeof input.narration!=='boolean') throw new Error('Confira a direção de som.');
  return recipe;
}
export const creativePace = {
  balanced:{label:'Ritmo equilibrado',detail:'Divida o tempo entre as três cenas.',seconds:[5,5,5]},
  quick:{label:'Abertura rápida',detail:'Chegue à ação nos primeiros segundos.',seconds:[3,7,5]},
  detail:{label:'Pausa no detalhe',detail:'Dê mais tempo ao gesto, à comparação ou à textura.',seconds:[4,7,4]},
  close:{label:'Fechamento com respiro',detail:'Reserve mais tempo para a conclusão.',seconds:[4,5,6]},
};

export const normalize = text => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export const themes = {
  demo:{name:"Demonstração", example:"demonstracao-de-produto", label:"Mostrar uma ação do começo ao resultado",
    families:["hibridos","anuncios","campanhas","ecommerce","software"], pattern:/demonstr|passo a passo|como usar|tutorial|em uso|unboxing|montagem/},
  sensory:{name:"Sensorial e detalhes",example:"acabamentos-em-macro",label:"Aproximar a câmera de textura, luz e movimento",
    families:["cinema","materiais","volume","anuncios","ecommerce","campanhas"],pattern:/as[tm]r|sensorial|macro|textur|acabamento|material|detalhe/},
  life:{name:"Rotina e uso real",example:"ads26-alimentacao-o-cafe-muda-o-ponto-de-vista",label:"Mostrar a ideia numa situação reconhecível",
    families:["cinema","hibridos","campanhas","ecommerce"],pattern:/rotina|cotidiano|lifestyle|em uso|gesto|bastidor|modo de usar/},
  motion:{name:"Gráficos e movimento",example:"tipografia-cinetica",label:"Usar formas, texto e transições para organizar a mensagem",
    families:["motion","motion-campanha","tecnologia","apresentacoes","grafico","volume"],pattern:/motion|anima|tipografia|grafico|revela|transicao|dados|morph/},
  editorial:{name:"Editorial e explicação",example:"explicador-por-metafora",label:"Apresentar uma ideia por vez, com texto ou imagens de apoio",
    families:["grafico","apresentacoes","tecnologia","infoprodutores","hibridos","explicadores"],pattern:/explica|simplific|editorial|compar|dado|pergunta|conceito|tipografia|document/},
  metaphor:{name:"Ilustração e metáfora",example:"explicador-por-metafora",label:"Converter um assunto abstrato numa cena fácil de visualizar",
    families:["ilustracao","volume","grafico","materiais","hibridos"],pattern:/metafora|ilustr|analogia|colagem|conceito|visualiz|abstrat/},
  interface:{name:"Telas e passo a passo",example:"interface-demonstrativa",label:"Destacar na tela onde agir e o que acontece",
    families:["tecnologia","software","explicadores","hibridos"],pattern:/tela|interface|app|dashboard|software|fluxo|passo a passo|digital/},
  brand:{name:"Vitrine e marca",example:"publicidade-cinematografica",label:"Dar espaço para o produto, a identidade e a chamada final",
    families:["cinema","anuncios","campanhas","ecommerce","volume","hibridos"],pattern:/marca|packshot|vitrine|produto|embalagem|pre[mê]ium|lancamento|oferta/},
  presenter:{name:"Pessoa em cena",example:"apresentacao-direta",label:"Conduzir a explicação com fala, gestos e imagens de apoio",
    families:["avatares","explicadores","infoprodutores"],pattern:/apresentador|entrevista|depoimento|fala|locucao/}
};
const segments = [
  ["ads-alimentacao",/aliment|cereal|cacau|quinoa|chocolate|cafe\b|cozinha|receita|bebida|culinaria|iogurte|sabor/],
  ["ads-moda",/\bmoda\b|vestuario|roupa|vestido|camiseta|look\b/],
  ["ads-casa",/decoracao|moveis|caneca|luminaria|utensilio|cortina|sofa/],
  ["ads-joias",/\banel\b|brinco|joia|prata|colar|ourives|pulseira/],
  ["ads-juridico",/advocacia|juridic|contrato|direito/],
  ["ads-pets",/\bpet\b|cachorr|gato|veterin/],
  ["ads-automotivo",/automot|carro|moto\b|veiculo/],
  ["ads-turismo",/viagem|turismo|hotel|pousada/],
  ["ads-beleza",/beleza|cosmet|skincare|batom|maquiag|perfume/],
  ["ads-servicos",/limpeza|encanador|reparo|eletricista|manutencao|reforma/],
  ["ads-infantil",/materni|bebe\b|infantil|brinquedo/],
  ["software",/inteligencia.*artifi|\bia\b|software|saas|aplicativo|app\b|dados|dashboard|automacao|plataforma|chatbot/],
  ["imoveis",/imobili|imovel|apartamento|empreendimento|aluguel/],
  ["saude",/saude|odontol|dentista|clinica|fisiotera/],
  ["infoprodutores",/curso|mentoria|treinamento|aula|infoprod|educacao/]
];
const stopWords=new Set("para como quem pelo pelos pela pelas uma umas uns seu seus sua suas sobre isso fazer feito mostrar aprender ideia video quer quero projeto coisa usar usada esta este com que por das dos nos nas ao".split(" "));
const uniq = values => [...new Set(values)];
const tokenList = value => uniq(normalize(value).match(/[a-z0-9]{3,}/g) || []).filter(word=>!stopWords.has(word));
export const creativeOrigins = {
product:'Produto ou serviço',launch:'Lançamentos e novidades',question:'O que o público procura',
trend:'Em alta',news:'Notícias',tool:'Ferramentas e apps',
};
export function creativeProfile(context, recipe) {
const source=[context.name,context.category,context.description].filter(Boolean).join(' ');
const normalized=normalize(source);
return {
  isCommerce:recipe?.group==='loja'||recipe?.group==='ecommerce'||Boolean(context.url),
  domains:segments.filter(([,pattern])=>pattern.test(normalized)).map(([domain])=>domain),
  words:tokenList(context.name).slice(0,12),
};
}
const specialized=new Set(["imoveis","saude","software","infoprodutores"]);
export function recommend(catalog, profile, goal) {
  const direct=goal.directions.filter(id=>Object.hasOwn(themes,id));
  const result=[];
  for(const style of catalog) {
    const name=normalize(style.label), signature=normalize(style.caption);
    const tags=style.tags.filter(tag=>tag!==style.familyName);
    const text=normalize([style.label,style.caption,style.uses,style.specialty,...tags].join(" "));
    const hits=profile.words.filter(word=>text.includes(word)).length;
    const sector=profile.domains.includes(style.family);
    if(style.family.startsWith("ads-") && !sector) continue;
    if(specialized.has(style.family) && !sector) continue;
    if(style.family==="explicadores" && hits===0) continue;
    if(profile.isCommerce && style.family==="avatares" && !direct.includes("presenter")) continue;
    const strength=id=>{
      const theme=themes[id];
      return (style.id===theme.example?22:0)+(theme.pattern.test(name)?9:0)+
        (theme.pattern.test(signature)?6:0)+(theme.families.includes(style.family)?2:0);
    };
    const valid=direct.filter(id => {
      const theme=themes[id];
      const hasTerm=theme.pattern.test(text);
      return style.id===theme.example || (hasTerm && (theme.families.includes(style.family) || sector || hits>0));
    }).sort((a,b)=>strength(b)-strength(a)||direct.indexOf(a)-direct.indexOf(b));
    if(!valid.length) continue;
    const primary=valid[0];
    const score=(sector?14:0)+Math.min(hits,6)*3+Math.min(strength(primary),12)+(direct.length-direct.indexOf(primary))*2+valid.length;
    result.push({...style,dirs:valid,score});
  }
  return result.sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,"pt-BR"));
}
const visual = {
  demo:[["Mãos em ação","Enquadre o gesto e mostre o resultado sem pular etapas."],["Ação em três planos","Combine visão geral, gesto e resultado."],["Antes e depois","Mostre a mudança no mesmo enquadramento."]],
  sensory:[["Detalhes em macro","Aproxime de textura, brilho ou movimento."],["Luz lateral suave","Realce o relevo e as sombras leves."],["Movimento lento","Dê tempo para perceber os detalhes."]],
  life:[["Na rotina","Mostre a situação num ambiente natural."],["Do ponto de vista de quem usa","Acompanhe a ação na altura dos olhos."],["Planos abertos e próximos","Mostre o lugar antes de aproximar."]],
  motion:[["Textos animados","Use palavras para guiar a leitura."],["Gráfico ou diagrama","Mostre relações entre os elementos."],["Comparação lado a lado","Mostre duas opções no mesmo quadro."]],
  editorial:[["Cartões de informação","Organize um ponto em cada quadro."],["Começar pela pergunta","Introduza o tema e responda com um exemplo."],["Capítulos curtos","Organize o assunto em uma pequena sequência."]],
  metaphor:[["Metáfora visual","Represente a ideia com uma imagem concreta."],["Ilustração em camadas","Adicione elementos à medida que a história avança."],["Mudança de forma","Use transformação visual para explicar a passagem."]],
  interface:[["Captura de tela","Mostre uma tela real com destaque no ponto certo."],["Passo a passo na tela","Destaque um clique ou decisão por vez."],["Comparar duas telas","Mostre os dois resultados na mesma escala."]],
  brand:[["Em fundo neutro","Dê destaque ao produto ou à marca."],["Revelação gradual","Mostre detalhes antes de revelar o conjunto."],["Abertura com a embalagem","Apresente o rótulo já no primeiro quadro."]],
  presenter:[["Pessoa falando para a câmera","Use uma fala curta e direta."],["Fala com imagens de apoio","Alterne a pessoa com cenas que explicam o assunto."],["Pergunta e resposta","Use a fala para conduzir uma dúvida de cada vez."]]
};
export function directions(profile, style) {
  const group=style?.dirs[0] || "editorial";
  const family=style?.family;
  const options=[...visual[group]];
  if(group==="motion" && family==="tecnologia") options.unshift(...visual.interface.slice(1,2));
  if(profile.isCommerce) options.push(["Em uso","Mostre o produto em uma situação simples."],["Em fundo neutro","Dê destaque ao produto ou à marca."],["Na rotina","Mostre o produto em contexto."]);
  else options.push(...visual[style?.dirs[1] || "editorial"].slice(0,2),["Quadro principal e fechamento","Abra com uma imagem forte e feche com a mensagem principal."]);
  return options.filter(([title],i,list)=>list.findIndex(item=>item[0]===title)===i);
}
export function sound(profile, style, goal) {
  const group=style?.dirs[0] || "editorial";
  const explainFirst=["editorial","interface","presenter"].includes(group) || ["news","question","tool"].includes(goal?.origin);
  const visualFirst=[
    ["Trilha suave","Instrumental leve, sem locução."],
    ["Trilha marcante","Marque os cortes e a chegada do elemento principal."],
    ["Som ambiente","Mantenha os sons naturais da cena."],
    ["Sem som","Deixe a mensagem nas imagens e nos textos."]
  ];
  const speaking=[["Narração com trilha","Uma voz conduz o vídeo com música ao fundo."],["Só narração","Deixe a fala em primeiro plano, sem trilha."]];
  const local=profile.domains.includes("ads-alimentacao")?["Som do preparo","Realce sons de abrir, despejar, servir e mexer."]:["Efeitos sonoros pontuais","Use sons curtos para marcar ações e transições."];
  const preserve=group==="presenter"?[["Fala da gravação","Conserve a voz original de quem aparece em cena."]]:[];
  const detail=group==="sensory"?[local,["Som em primeiro plano (ASMR)","Destaque sons pequenos, com música bem baixa ou ausente."]]:[local];
  if(group==="sensory" && profile.domains.includes("ads-alimentacao"))
    detail.push(["Narração e sons do preparo","Intercale uma voz próxima com o som de abrir, servir ou misturar."]);
  if(group==="motion") detail.push(["Trilha e efeitos de transição","Sincronize a entrada de texto e formas com os acentos da trilha."]);
  return explainFirst?[...preserve,...speaking,...detail,...visualFirst]:[...detail,...visualFirst,...speaking];
}
