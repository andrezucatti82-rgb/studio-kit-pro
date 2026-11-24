
const $=s=>document.querySelector(s);
const list=$("#list"),q=$("#q"),count=$("#count");
let tipo="all",dest="code",refined=null;
let sel=new Set();
try{sel=new Set(JSON.parse(localStorage.getItem("arsenal-sel")||"[]").filter(id=>byId[id]))}catch(e){}
const save=()=>{try{localStorage.setItem("arsenal-sel",JSON.stringify([...sel]))}catch(e){}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- busca: sem acento, várias palavras, sinônimos ---------- */
const norm=s=>String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const SYN={
 legenda:["caption","legendas","subtitle"],legendas:["caption","legenda"],voz:["narracao","narrar","eleven","audio","locucao","voice"],narracao:["voz","eleven","locucao"],
 audio:["voz","som","podcast","musica","trilha"],musica:["trilha","beat","audio"],ia:["inteligencia artificial","gerad","higgsfield","veo","generativ","hypit"],
 reels:["9:16","vertical","short","tiktok","stories","reel"],reel:["reels","9:16","short"],tiktok:["reels","short","9:16","trend"],shorts:["short","cortes","reels"],
 anuncio:["ads","publicidade","criativo","meta","ugc","campanha"],anuncios:["ads","publicidade","criativo","anuncio"],ads:["anuncio","publicidade"],
 loja:["ecommerce","e-commerce","produto","catalogo","shopify"],ecommerce:["loja","produto","catalogo","e-commerce"],produto:["loja","ecommerce","unboxing"],
 carrossel:["carousel","cards"],carousel:["carrossel"],thumbnail:["capa","thumb","miniatura"],capa:["thumbnail","thumb","cover"],
 vfx:["efeito","recorte","composicao","mascara","chroma"],efeito:["vfx","effects","motion"],efeitos:["vfx","effects","efeito"],
 motion:["animacao","animad","kinetic","grafico"],animacao:["motion","animad","animation"],grafico:["chart","dados","barras","infografico"],dados:["grafico","chart","numero"],
 avatar:["apresentador","heygen","explicador","pessoa"],apresentador:["avatar","talking head","gravacao"],editar:["edicao","corte","cortar","video use"],edicao:["editar","corte","montagem"],
 corte:["cortes","editar","short"],cortes:["corte","shorts","podcast"],logo:["vinheta","marca","abertura"],abertura:["vinheta","intro","logo"],
 pauta:["calendario","conteudo","tendencia","matriz"],calendario:["pauta","agendar","metricool"],agendar:["metricool","postiz","calendario"],
 instagram:["reels","stories","carrossel","perfil"],stories:["story","reels","9:16"],ugc:["influencer","cliente","anuncio"],depoimento:["testimonial","depoiment"],
 "3d":["three","blender","isometric","title sequence"],imagem:["foto","banner","design","image"],foto:["imagem","photo","unsplash"],design:["grafico","canva","banner","figma"]
};
function matcher(text){
  const terms=norm(text).split(/\s+/).filter(Boolean);
  if(!terms.length)return ()=>true;
  const groups=terms.map(t=>[t,...(SYN[t]||[])].map(norm));
  const hit=(h,w)=>{if(w.length>3)return h.includes(w);const k=w.replace(/[^a-z0-9]/g,"");return k?new RegExp("(^|[^a-z0-9])"+k+"([^a-z0-9]|$)").test(h):false};
  return hay=>{const h=norm(hay);return groups.every(g=>g.some(w=>hit(h,w)))};
}
const recipeText=r=>[r[1],r[2],r[4],r[6],RG[r[6]]||"",...r[3].map(id=>byId[id]?byId[id][3]+" "+byId[id][4]:""),...(r[5]||[]).flat(),...(r[7]||[]),...(r[8]||[]).map(x=>x[0])].join(" ");
function render(){
  const t=q.value.trim();const ok=matcher(t);let n=0,html="";
  for(const k in CAT){
    const items=D.filter(d=>d[1]===k&&(tipo==="all"||d[2]===tipo)&&(!t||ok(d.flat().join(" ")+" "+CAT[k][0])));
    if(!items.length)continue;n+=items.length;
    html+=`<section class="track"><h2>${CAT[k][0]}<small>${items.length} itens</small></h2><p class="sub">${CAT[k][1]}</p><div class="grid">`+items.map(d=>{
      const isMcp=d[2]==="mcp";
      const cmdShown=isMcp?"Peça em português":d[4];
      const copyTxt=isMcp?d[7][0]:d[4];
      const [a,b]=d[5].split(",");
      return `<article class="card${sel.has(d[0])?" on":""}" data-id="${d[0]}"><div class="pvs">${pv(a)}${pv(b||"gen")}</div><div class="body">
        <div class="head"><h3>${esc(d[3])}</h3><label class="pick"><input type="checkbox" data-pick="${d[0]}" ${sel.has(d[0])?"checked":""} aria-label="Selecionar ${esc(d[3])}">usar</label></div>
        <div><span class="badge ${d[2]}">${TYPE[d[2]]}</span></div>
        <p class="desc">${esc(d[6])}</p>
        <ul class="exs">${d[7].map(e=>`<li>${esc(e)}</li>`).join("")}</ul>
        ${d[8]?`<div class="warn">${esc(d[8])}</div>`:""}
        <div class="cmd"><code>${esc(cmdShown)}</code><button class="btn" type="button" data-copy="${esc(copyTxt)}">Copiar</button></div>
      </div></article>`}).join("")+`</div></section>`;
  }
  list.innerHTML=html||(t?'<p style="margin-top:28px;color:var(--ink-soft)">Nenhuma ferramenta para “'+esc(t)+'”. Tente “legenda”, “voz”, “anúncio” ou “carrossel”.</p>':"");
  toolCount=n;showCount();const tc=document.getElementById("tcount");if(tc)tc.textContent=n+" itens";if(typeof observe==="function"&&io)observe();
}
let toolCount=0,recipeCount=0;
function showCount(){const t=q.value.trim();count.textContent=t?`${recipeCount} receitas · ${toolCount} ferramentas`:`${toolCount} ferramentas`}
let searchTimer=null;
function onSearch(){
  render();if(typeof renderRecipes==="function")renderRecipes();
  const t=q.value.trim();const kit=document.querySelector(".kit");if(kit)kit.hidden=!!t;
  clearTimeout(searchTimer);
  if(t)searchTimer=setTimeout(()=>{const target=recipeCount?document.getElementById("receitas"):document.getElementById("list");const bar=document.querySelector(".bar");const top=target.getBoundingClientRect().top+scrollY-(bar?bar.offsetHeight:0)-8;if(Math.abs(scrollY-top)>40)scrollTo({top,behavior:"smooth"})},450);
}
function copy(txt,btn,label){
  const done=()=>{btn.textContent="Copiado";setTimeout(()=>btn.textContent=label,1500)};
  try{navigator.clipboard.writeText(txt).then(done,()=>{btn.textContent="Selecione e copie"})}catch(e){btn.textContent="Selecione e copie"}
}
list.addEventListener("click",e=>{const b=e.target.closest("button[data-copy]");if(b)copy(b.dataset.copy,b,"Copiar")});
list.addEventListener("change",e=>{const c=e.target.closest("input[data-pick]");if(!c)return;
  c.checked?sel.add(c.dataset.pick):sel.delete(c.dataset.pick);save();refined=null;
  c.closest(".card").classList.toggle("on",c.checked);updateTray()});
q.addEventListener("input",onSearch);
q.addEventListener("keydown",e=>{if(e.key==="Escape"){q.value="";onSearch()}});
document.querySelectorAll("#tchips .chip").forEach(b=>b.addEventListener("click",()=>{tipo=b.dataset.t;document.querySelectorAll("#tchips .chip").forEach(x=>x.setAttribute("aria-pressed",x===b));render()}));

/* ---------- perguntas de direcionamento ---------- */
const has=(...ids)=>ids.some(i=>sel.has(i));
const hasCat=(...cs)=>[...sel].some(i=>cs.includes(byId[i][1]));
function questions(){
  const Q=[];
  const add=(p,o,multi)=>Q.push({p,o,multi:!!multi});
  const isVideo=hasCat("code","fmt","edit","skp")||has("heygen","higgs","google","hypit","prodgda","vpro","smgda","swap");
  if(isVideo){
    add("Em qual formato a peça vai ao ar?",["9:16 (Reels, TikTok, Shorts)","1:1 (feed quadrado)","4:5 (feed vertical)","16:9 (YouTube, site)"]);
    add("Qual a duração ideal?",["Até 15s","30s","45 a 60s","90s ou mais"]);
  }
  if(hasCat("gfx","cnt")||has("canva","cargda","edgda"))add("Que peça gráfica você quer?",["Carrossel","Post único","Sequência de Stories","Thumbnail ou capa"]);
  add("Para quem é o conteúdo?",["Donos de pequenas e médias lojas","Gestores de marketing","Consumidor final","Outro público (vou descrever)"]);
  add("Qual o objetivo principal da peça?",["Atrair seguidores e alcance","Gerar lead (quiz ou WhatsApp)","Vender uma oferta","Educar e gerar autoridade"]);
  add("Qual tom combina mais?",["Didático e calmo","Provocativo e direto","Inspirador","Bem-humorado"]);
  add("Qual chamada para ação no final?",["Comentar uma palavra","Link na bio","Chamar no WhatsApp","Seguir o perfil"]);
  if(isVideo)add("Quem fala no vídeo?",["Voz gerada por IA (ElevenLabs)","Minha voz gravada","Avatar HeyGen","Sem narração, só texto na tela"]);
  if(has("captions","short","videouse","hfaudio","remfam","vexp","thead","kinetic","smskills"))add("Que estilo de legenda?",["Palavra a palavra em destaque","Frase inteira, discreta","No topo, estilo editorial","Sem legenda"]);
  if(hasCat("code","fmt","skp","dir"))add("Que linguagem visual você prefere?",["Tipografia e motion","Gráficos e números","Imagens reais com b-roll","Ilustração ou 3D"]);
  if(has("vmm","vplan","vexp","vpub","vedi","vvfx","vtrat","vrev","distev","multi"))add("Já escolheu os estilos na galeria DiSteven?",["Sim, vou anexar o pedido do site","Sugira 3 estilos para eu escolher","Use o mesmo da última peça","Pode decidir sozinho"]);
  if(hasCat("edit")||has("vedi","vvfx","vtrat","fxmask","fxrife","fxcomp","fxedit","vision"))add("Que material bruto você tem?",["Vídeo longo para cortar","Gravação de tela","Vários clipes curtos","Ainda não tenho material"]);
  if(has("higgs","google","hypit","swap","adobe","fxcomp","vvfx"))add("Até onde pode ir a IA generativa?",["Pessoas fictícias liberadas","Só cenários e objetos","Só retoque, nada gerado do zero","Nenhuma IA generativa"]);
  if(has("audiogram","mediause","hfaudio","eleven")||isVideo)add("E a trilha sonora?",["Calma e corporativa","Energética","Sem música","Eu envio a trilha"]);
  if(hasCat("cnt")||has("metricool","postiz","smgda"))add("Em quais redes vai publicar?",["Instagram","LinkedIn","TikTok","YouTube"],true);
  add("Que materiais você já tem para usar?",["Logo e cores da marca","Fotos ou vídeos meus","Prints de tela ou dados","Nada, pode buscar ou gerar"],true);
  add("Quanto pode gastar em créditos de ferramentas pagas?",["Nada, só ferramentas gratuitas","Até uns R$ 25","Até uns R$ 100","Pode gastar, mas me mostre o custo antes"]);
  add("O que você quer receber no fim?",["MP4 pronto para postar","Roteiro e storyboard para aprovar","MP4 e arquivos editáveis","Prompts prontos para outra ferramenta"]);
  if(Q.length<12)add("Tem alguma referência que quer seguir?",["Tenho um link ou vídeo","Tenho prints","Não, pode propor","Siga a identidade da marca"]);
  if(Q.length<12)add("Qual o prazo?",["Hoje","Até amanhã","Esta semana","Sem pressa"]);
  return Q;
}
function qText(Q,mode){
  return Q.map((x,i)=>`${i+1}. ${x.p}${x.multi?" (pode marcar mais de uma)":""}\n`+x.o.map((o,j)=>mode==="gpt"?`   ${String.fromCharCode(97+j)}) ${o}`:`   - ${o}`).join("\n")).join("\n");
}

const NOTE={code:"Os comandos com / ativam as skills direto no Claude Code desta máquina; as perguntas aparecem como pop-up.",
 claude:"No Claude.ai só funcionam os conectores ligados à sua conta; as skills locais viram instruções de método.",
 gpt:"O ChatGPT não tem estas skills nem conectores; o prompt descreve o método de cada uma e as perguntas vêm em lista."};
const TAGS=[["dur",/dura|tamanho final|quantos segundos/i],["voz",/narra|quem (fala|narra|responde|demonstra|aparece)|^voz|tem fala/i],["leg",/legenda/i],["som",/trilha|som|música|ritmo/i],["rede",/formato|plataforma|rede|onde vai/i],["cta",/chamada|cta|^final\?/i],["ia",/ia generativa|pessoas nas cenas|pessoa\?|pode ter pessoas/i],["estilo",/linguagem visual|estilo/i]];
const tagsOf=t=>TAGS.filter(x=>x[1].test(t)).map(x=>x[0]);
function mergeQ(){
  const rec=recipeOn?R.find(r=>r[0]===recipeOn):null;
  const rq=rec&&rec[8]?rec[8].map(q=>({p:q[0],o:q[1],multi:!!q[2]})):[];
  const used=new Set(rq.flatMap(q=>tagsOf(q.p)));
  const gen=questions().filter(q=>!tagsOf(q.p).some(t=>used.has(t)));
  const all=[...rq,...gen];
  return all.slice(0,Math.max(12,rq.length+4));
}
function linksList(){return ($("#links")?$("#links").value:"").split(/\s+/).map(s=>s.trim()).filter(s=>/^https?:\/\/\S+\.\S+/i.test(s)).slice(0,10)}
function linksTxt(mode){
  const L=linksList();if(!L.length)return "";
  const how=mode==="code"?"Use /firecrawl-scrape (ou o conector Firecrawl) para ler cada página; se a página exigir login, me avise.":mode==="claude"?"Abra cada link com a ferramenta de navegação ou de busca disponível.":"Abra cada link com a navegação na web.";
  return "LINKS PARA PUXAR MATERIAL:\n"+L.map(u=>"- "+u).join("\n")+"\n"+how+" Extraia fotos e vídeos do produto, nome, descrição, preço, variações, avaliações, logo e cores da marca. Antes de produzir, me mostre uma lista do que encontrou e do que ainda falta. Use as imagens reais sem alterar o produto (forma, cor, rótulo) e confira se o uso das imagens é permitido.\n\n";
}
function build(){
  const goal=$("#goal").value.trim()||"(descreva o objetivo)";
  const items=[...sel].map(id=>byId[id]).filter(Boolean);
  if(!items.length)return "Marque pelo menos uma ferramenta nos cartões.";
  const Q=refined||mergeQ();
  const skills=items.filter(d=>d[2]!=="mcp"),mcps=items.filter(d=>d[2]==="mcp");
  const kit=items.some(d=>d[1]==="skp");
  const rec=recipeOn?R.find(r=>r[0]===recipeOn):null;
  let recTxt="";
  if(rec){
    recTxt=`RECEITA: ${rec[1]} — ${rec[2]}\n`+(rec[9]?`Por que funciona: ${rec[9]}\n`:"")+"Etapas: "+rec[5].map((s,i)=>`${i+1}) ${s[1]}`).join("; ")+"\n\n";
    if(rec[7]&&rec[7].length)recTxt+="O QUE EU PRECISO TE ENVIAR (peça estes materiais antes de tudo e diga o que faltar):\n"+rec[7].map(x=>"- "+x).join("\n")+"\n\n";
  }
  if(rec&&rec[10])recTxt+=`Referência visual: estilo "${rec[11]}" — ${rec[10]}\nOs elementos (gráficos, desenhos, objetos, ilustrações) surgem conforme a fala, interagem com o apresentador e seguem a identidade visual do vídeo.\n\n`;
  if(dest==="code"){
    let p=(skills[0]&&skills[0][4].startsWith("/")?skills[0][4]+" ":"")+`Objetivo: ${goal}\n\n`+recTxt+linksTxt("code");
    if(kit)p+="Use o Studio Kit Pro 2.16.0 pelo comando /video-multimarcas:video-multimarcas (não use a /video-multimarcas sem prefixo, que é a versão antiga 2.2.13).\n\n";
    if(skills.length)p+="FERRAMENTAS (carregue cada skill antes de usar):\n"+skills.map((d,i)=>`${i+1}. ${d[4]} — ${d[6]}`).join("\n")+"\n\n";
    if(mcps.length)p+="CONECTORES:\n"+mcps.map(d=>`- ${d[3]} — ${d[6]}`).join("\n")+"\n\n";
    const cf=conflicts(sel).filter(c=>c[0]==="warn");if(cf.length)p+="ATENÇÃO A CONFLITOS:\n"+cf.map(c=>"- "+c[1]).join("\n")+"\n\n";
    p+=`ANTES DE COMEÇAR: me faça as ${Q.length} perguntas abaixo usando a ferramenta de pergunta em pop-up (AskUserQuestion), em blocos de até 4 perguntas, com as opções listadas. Sempre deixe a opção de eu responder com texto livre. Não comece a produzir antes das respostas.\n\n${qText(Q,"code")}\n\n`;
    p+="DEPOIS DAS RESPOSTAS:\n1. Resuma o que entendeu em 5 linhas.\n2. Mostre o plano (pauta, roteiro e cenas) e espere minha aprovação.\n3. Antes de qualquer geração que gaste crédito, me diga o custo e espere meu ok.\n4. Produza, revise o resultado e me entregue os arquivos com o caminho de cada um.";
    return p;
  }
  const head=dest==="gpt"?"Você vai atuar como diretor de criação e produtor de conteúdo.":"Você vai atuar como diretor de criação e produtor de conteúdo, usando os conectores que estiverem ligados à minha conta.";
  let p=`${head}\n\nObjetivo: ${goal}\n\n${recTxt}${linksTxt(dest)}MÉTODO (siga estas etapas):\n`+items.map((d,i)=>`${i+1}. ${d[3]}: ${d[6]}`).join("\n");
  if(dest==="claude"&&mcps.length)p+="\n\nSe estes conectores estiverem disponíveis, use-os: "+mcps.map(d=>d[3]).join(", ")+".";
  p+=`\n\nANTES DE COMEÇAR: me faça estas ${Q.length} perguntas, no máximo 4 por mensagem, com as opções em ${dest==="gpt"?"letras para eu responder só com a letra":"botões ou lista"}. Aceite resposta livre também. Não produza nada antes das respostas.\n\n${qText(Q,dest)}\n\nDEPOIS DAS RESPOSTAS: resuma o que entendeu, mostre o plano (pauta, roteiro e cenas) e espere minha aprovação. Onde não puder gerar o arquivo final, entregue o roteiro, o storyboard cena a cena e os prompts prontos para eu usar nas ferramentas.`;
  return p;
}
function updateTray(){
  const cf=conflicts(sel);const ul=$("#conf");ul.textContent="";cf.forEach(c=>{const li=document.createElement("li");li.className=c[0];li.textContent=(c[0]==="warn"?"⚠ ":"ℹ ")+c[1];ul.appendChild(li)});
  $("#nsel").textContent=sel.size;
  $("#selnames").textContent=sel.size?[...sel].map(id=>byId[id][3]).join(", "):"Escolha uma receita ou marque ferramentas para montar o prompt.";
  $("#out").value=build();$("#dnote").textContent=NOTE[dest];
}
$("#toggle").addEventListener("click",e=>{const p=$("#panel");p.hidden=!p.hidden;e.currentTarget.setAttribute("aria-expanded",String(!p.hidden));e.currentTarget.textContent=p.hidden?"Gerar prompt":"Fechar";updateTray()});
$("#clear").addEventListener("click",()=>{sel.clear();save();refined=null;recipeOn=null;render();renderRecipes();updateTray()});
$("#goal").addEventListener("input",()=>{refined=null;updateTray()});
try{const sv=localStorage.getItem("arsenal-links");if(sv)$("#links").value=sv}catch(e){}
$("#links").addEventListener("input",()=>{try{localStorage.setItem("arsenal-links",$("#links").value)}catch(e){}updateTray()});
document.querySelectorAll("[data-d]").forEach(b=>b.addEventListener("click",()=>{dest=b.dataset.d;document.querySelectorAll("[data-d]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));updateTray()}));
$("#copy").addEventListener("click",e=>{const o=$("#out");copy(o.value,e.currentTarget,"Copiar prompt");o.select()});

/* ---------- capacidades: pesquisa de notícias e IA ---------- */
let mcpApi=null,sampleApi=null;
(async()=>{try{mcpApi=await window.claude?.use?.("mcp")}catch(e){}try{sampleApi=await window.claude?.use?.("sample")}catch(e){}
  if(!sampleApi)$("#refine").hidden=true;
  if(!mcpApi&&!sampleApi){$("#pautaBtn").disabled=true;$("#pstatus").textContent="A geração de pauta só funciona com a página aberta no claude.ai."}})();

function collectNews(payload){
  const out=[];const seen=new Set();
  const walk=v=>{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(walk);return}
    if(typeof v.url==="string"&&typeof v.title==="string"&&!seen.has(v.url)){seen.add(v.url);out.push({title:v.title,url:v.url,date:v.date||"",desc:v.description||v.snippet||""})}
    Object.values(v).forEach(walk)};
  walk(payload);return out.slice(0,10);
}
/* tipos de pauta */
const PMODES={
 noticia:{nome:"Notícias",ph:"Ex.: estoque parado no varejo de moda",q:t=>t,src:["news","web"],tbs:"qdr:m",busca:"Buscando notícias do último mês…",inst:"Monte a pauta a partir das notícias: o que aconteceu e o que muda para o público."},
 produto:{nome:"Produto ou serviço",ph:"Ex.: tênis de corrida leve / limpeza de sofá a domicílio",q:t=>t+" benefícios diferenciais avaliações dúvidas",src:["web"],tbs:"",busca:"Pesquisando o produto e o que falam dele…",inst:"Monte a pauta para apresentar e vender o produto ou serviço: dor que resolve, diferencial, prova e oferta. Use as informações da página do produto quando houver."},
 alta:{nome:"Em alta",ph:"Ex.: skincare coreano / IA no atendimento",q:t=>t+" tendência viral em alta",src:["news","web"],tbs:"qdr:w",busca:"Procurando o que está em alta nesta semana…",inst:"Monte a pauta surfando no assunto em alta, ligando a tendência ao negócio sem forçar."},
 lancamento:{nome:"Lançamentos e novidades",ph:"Ex.: nova função do WhatsApp Business / novo iPhone",q:t=>t+" lançamento novidade nova funcionalidade",src:["news","web"],tbs:"qdr:m",busca:"Buscando lançamentos e novidades…",inst:"Monte a pauta explicando o lançamento ou a novidade: o que é, o que muda na prática e como aproveitar."},
 ferramenta:{nome:"Ferramentas e apps",ph:"Ex.: apps para controlar estoque / IA para fotos de produto",q:t=>t+" melhores ferramentas apps comparativo",src:["web"],tbs:"qdr:y",busca:"Comparando ferramentas e apps…",inst:"Monte a pauta como lista útil de ferramentas: para que serve cada uma, para quem é e um cuidado ao escolher."},
 duvidas:{nome:"O que o público procura",ph:"Ex.: pet shop / clínica de estética / energia solar",q:t=>t+" dúvidas perguntas frequentes como quanto custa vale a pena",src:["web"],tbs:"qdr:y",busca:"Levantando as dúvidas e buscas do público do nicho…",inst:"Monte a pauta respondendo à dúvida mais procurada do público desse nicho, de forma direta e com exemplo."}
};
let pmode="noticia";
async function searchSources(topic,mode){
  if(!mcpApi)return [];
  const m=PMODES[mode];const args={query:m.q(topic),objective:"Encontrar fontes recentes e confiáveis para criar uma pauta de conteúdo para redes sociais no Brasil",limit:8,sources:m.src,location:"Brazil"};
  if(m.tbs)args.tbs=m.tbs;
  const r=await mcpApi.callTool("Firecrawl","firecrawl_search",args);
  let payload=r.payload??r.structuredContent;
  if(!payload){const t=(r.content||[]).find(c=>c.type==="text");try{payload=JSON.parse(t.text)}catch(e){payload=null}}
  return collectNews(payload);
}
async function readFirstLink(){
  const u=linksList()[0];if(!mcpApi||!u)return "";
  try{const r=await mcpApi.callTool("Firecrawl","firecrawl_scrape",{url:u,formats:["markdown"],onlyMainContent:true,objective:"Ler a página do produto ou da marca para montar uma pauta de conteúdo"});
    let pl=r.payload??r.structuredContent;let md="";
    if(pl&&typeof pl==="object")md=pl.markdown||(pl.data&&pl.data.markdown)||"";
    if(!md){const t=(r.content||[]).find(c=>c.type==="text");if(t){try{const j=JSON.parse(t.text);md=j.markdown||(j.data&&j.data.markdown)||""}catch(e){md=t.text}}}
    return String(md).slice(0,3500);
  }catch(e){return ""}
}
function renderPauta(p,news){
  const box=$("#pauta");box.hidden=false;box.textContent="";
  const h=document.createElement("h4");h.textContent=p.titulo||"Pauta";box.appendChild(h);
  if(p.angulo){const d=document.createElement("div");d.textContent="Ângulo: "+p.angulo;box.appendChild(d)}
  if(p.dados&&p.dados.length){const ul=document.createElement("ul");p.dados.forEach(x=>{const li=document.createElement("li");li.textContent=x;ul.appendChild(li)});box.appendChild(ul)}
  if(news.length){const s=document.createElement("div");s.style.marginTop="6px";s.textContent="Fontes:";box.appendChild(s);const ul=document.createElement("ul");
    news.slice(0,6).forEach(n=>{const li=document.createElement("li");if(/^https:\/\//.test(n.url)){const a=document.createElement("a");a.href=n.url;a.target="_blank";a.rel="noopener";a.textContent=n.title;li.appendChild(a)}else li.textContent=n.title;if(n.date)li.append(" · "+n.date);ul.appendChild(li)});box.appendChild(ul)}
}
document.getElementById("pmodes").addEventListener("click",ev=>{const b=ev.target.closest("[data-pm]");if(!b)return;pmode=b.dataset.pm;document.querySelectorAll("#pmodes .chip").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));$("#topic").placeholder=PMODES[pmode].ph});
$("#pautaBtn").addEventListener("click",async()=>{
  const topic=$("#topic").value.trim();const st=$("#pstatus");const btn=$("#pautaBtn");const m=PMODES[pmode];
  if(!topic){st.textContent="Digite um assunto, produto, serviço ou nicho primeiro.";$("#topic").focus();return}
  btn.disabled=true;let news=[],page="";
  try{st.textContent=m.busca;news=await searchSources(topic,pmode)}
  catch(e){st.textContent=e&&e.code==="not_granted"?"Sem permissão para pesquisar; vou montar a pauta sem fontes.":"A pesquisa falhou ("+(e&&e.code||"erro")+"); vou montar a pauta sem fontes."}
  if(linksList().length){st.textContent="Lendo a página do link informado…";page=await readFirstLink()}
  const tools=[...sel].map(id=>byId[id][3]).join(", ")||"nenhuma ferramenta marcada ainda";
  if(sampleApi){
    try{
      st.textContent="Escrevendo a pauta…";
      const p=await sampleApi.json(`Você é editor de conteúdo de uma marca brasileira que fala com donos de negócio e consumidores. Escreva em português do Brasil, linguagem simples, sem jargão de análise.
Tipo de pauta: ${m.nome}. ${m.inst}
Assunto: ${topic}
Ferramentas escolhidas: ${tools}
Objetivo atual: ${$("#goal").value}
Links informados: ${linksList().join(", ")||"nenhum"}
${page?"Conteúdo da página do link (use nomes, preços e características daqui, sem inventar):\n"+page+"\n":""}Fontes encontradas (use só o que estiver aqui; não invente números):
${news.map((n,i)=>`${i+1}. ${n.title} (${n.date}) ${n.desc}`).join("\n")||"(nenhuma fonte disponível; não cite dados específicos)"}

Responda só com JSON: {"titulo": "título da pauta, até 70 caracteres", "angulo": "1 frase com o ângulo para o público", "dados": ["até 3 fatos tirados das fontes ou da página, cada um com a origem entre parênteses"], "objetivo": "objetivo melhorado em 2 a 4 frases: formato, duração, público, mensagem central, os fatos que vão sustentar e a chamada final, coerente com as ferramentas escolhidas"}`,{modelTier:"default"});
      renderPauta(p,news);
      if(p.objetivo){$("#goal").value=p.objetivo;refined=null;updateTray()}
      st.textContent=(news.length?`Pauta criada com ${news.length} fontes`:"Pauta criada sem fontes ao vivo")+(page?" e a página do link":"")+". O objetivo foi atualizado.";
    }catch(e){st.textContent=e&&e.code==="not_granted"?"A página não tem permissão para usar o Claude.":"Não consegui escrever a pauta agora ("+(e&&e.code||"erro")+")."; if(news.length)renderPauta({titulo:"Fontes encontradas"},news)}
  }else if(news.length){renderPauta({titulo:"Fontes encontradas"},news);st.textContent="Fontes encontradas; a escrita da pauta precisa da página aberta no claude.ai."}
  btn.disabled=false;
});
$("#refine").addEventListener("click",async()=>{
  const st=$("#rstatus");if(!sel.size){st.textContent="Marque ferramentas primeiro.";return}
  st.textContent="Refinando…";$("#refine").disabled=true;
  try{
    const base=questions();
    const r=await sampleApi.json(`Reescreva estas perguntas de direcionamento para o objetivo abaixo, em português do Brasil, simples. Mantenha entre 10 e 14 perguntas, cada uma com 3 ou 4 opções curtas e concretas para este caso. Pode trocar, juntar ou acrescentar perguntas.
Objetivo: ${$("#goal").value}
Ferramentas: ${[...sel].map(id=>byId[id][3]).join(", ")}
Perguntas atuais: ${JSON.stringify(base.map(x=>({p:x.p,o:x.o,multi:x.multi})))}
Responda só com JSON: [{"p":"pergunta","o":["opção"],"multi":false}]`,{modelTier:"default"});
    if(Array.isArray(r)&&r.length>=10){refined=r.filter(x=>x&&x.p&&Array.isArray(x.o)).map(x=>({p:String(x.p),o:x.o.map(String).slice(0,4),multi:!!x.multi}));updateTray();st.textContent="Perguntas adaptadas ao objetivo."}
    else st.textContent="A IA devolveu poucas perguntas; mantive as originais.";
  }catch(e){st.textContent="Não consegui refinar agora ("+(e&&e.code||"erro")+")."}
  $("#refine").disabled=false;
});
/* ---------- receitas ---------- */
let recipeOn=null,rgroup='all';
function story(r){
  return '<div class="story" aria-hidden="true"><div class="st-bars"><i><b class="k1"></b></i><i><b class="k2"></b></i><i><b class="k3"></b></i></div>'+
   r[5].map((s,i)=>'<div class="sc k'+(i+1)+'">'+scene(s[0])+'</div>').join('')+
   r[5].map((s,i)=>'<div class="st-cap k'+(i+1)+'"><span class="n">'+(i+1)+'/3</span><strong>'+esc(s[1])+'</strong><em>'+esc(s[2])+'</em></div>').join('')+'</div>';
}
function renderRecipes(){
  $('#rchips').innerHTML=[['all','Todas']].concat(Object.entries(RG)).map(([k,v])=>'<button type="button" class="chip" data-g="'+k+'" aria-pressed="'+(rgroup===k)+'">'+v+(k==='all'?'':' · '+R.filter(r=>r[6]===k&&matcher(q.value.trim())(recipeText(r))).length)+'</button>').join('');
  const okR=matcher(q.value.trim());const vis=R.filter(r=>(rgroup==='all'||r[6]===rgroup)&&okR(recipeText(r)));if(q.value.trim())vis.sort((a,b)=>(okR(b[1]+' '+b[2])?1:0)-(okR(a[1]+' '+a[2])?1:0));recipeCount=vis.length;showCount();$('#rgrid').innerHTML=(vis.length?'':'<p style="color:var(--ink-soft);margin:0">Nenhuma receita para essa busca'+(rgroup!=='all'?' neste grupo. <button type="button" class="btn" data-g="all">Ver todos os grupos</button>':'.')+'</p>')+vis.map(r=>'<button type="button" class="recipe'+(recipeOn===r[0]?' on':'')+'" data-r="'+r[0]+'">'+story(r)+'<div style="min-width:0"><h3>'+esc(r[1])+'</h3><p>'+esc(r[2])+'</p>'+(r[7]?'<p class="need"><b>Você envia:</b> '+esc(r[7].join(' · '))+'</p>':'')+(r[11]?'<p class="ref">Referência zapvideo: '+esc(r[11])+'</p>':'')+'<div class="tags">'+r[3].map(id=>'<span>'+esc(byId[id][3].split(' (')[0])+'</span>').join('')+'</div><span class="go">Usar esta receita →</span></div></button>').join('');
  observe();
}
$('#rchips').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(!b)return;rgroup=b.dataset.g;renderRecipes()});
$('#rgrid').addEventListener('click',e=>{const gb=e.target.closest('[data-g]');if(gb){rgroup='all';renderRecipes();return}
  const b=e.target.closest('[data-r]');if(!b)return;const r=R.find(x=>x[0]===b.dataset.r);
  recipeOn=r[0];sel=new Set(r[3]);save();refined=null;
  $('#goal').value=r[4];render();renderRecipes();
  const p=$('#panel');p.hidden=false;$('#toggle').textContent='Fechar';$('#toggle').setAttribute('aria-expanded','true');
  updateTray();$('#pstatus').textContent='Receita aplicada: '+r[3].length+' ferramentas marcadas. Troque os [colchetes] do objetivo ou gere uma pauta.';
});
/* pausa as animações fora da tela */
let io=null;try{io=new IntersectionObserver(es=>es.forEach(en=>en.target.classList.toggle('paused',!en.isIntersecting)),{rootMargin:'200px'})}catch(e){}
function observe(){if(!io)return;document.querySelectorAll('.sc:not([data-o]),.story:not([data-o])').forEach(el=>{el.dataset.o=1;io.observe(el)})}
document.getElementById('rcount').textContent=R.length+' receitas';render();renderRecipes();updateTray();
</script>