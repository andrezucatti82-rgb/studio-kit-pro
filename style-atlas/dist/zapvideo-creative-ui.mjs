import {creativeOrigins,creativePace,creativeProfile,directions,normalize,recommend,sound,themes} from './zapvideo-planning.mjs';
import {findRecipe} from './zapvideo-recipes.mjs';

const pageSize=12;
const output='/zapvideo-style-index.json';
const node=(tag,text,className)=>{
  const el=document.createElement(tag);
  if (text) el.textContent=text;
  if (className) el.className=className;
  return el;
};
const button=(label,run,{primary=false,selected}={})=>{
  const el=node('button',label,primary?'primary':'secondary');
  el.type='button';
  if (selected!==undefined) el.setAttribute('aria-pressed',String(selected));
  el.onclick=run;
  return el;
};
export function styleFrame(frame) {
  const well=node('div','','creative-portrait');
  if (!frame?.image?.startsWith('/assets/')) return well;
  const image=node('img');
  image.src=frame.image;image.alt='';image.loading='lazy';image.decoding='async';
  if (frame.crop) {
    const [x,y,width,height]=frame.crop;
    const style=image.style;
    style.position='absolute';style.width=100/width+'%';style.height=100/height+'%';
    style.left=-100*x/width+'%';style.top=-100*y/height+'%';style.maxWidth='none';
  }
  well.append(image);
  return well;
}
export function setupCreative({getDraft,getCapabilities,busy,changed,notify,request,manual}) {
  const origin=document.getElementById('creative-origin');
  const style=document.getElementById('creative-styles');
  const dialog=document.getElementById('creative-preview');
  const heading=document.getElementById('style-title');
  const catalogById=new Map();
  let index;
  let pendingIndex;
  const results=new WeakMap();
  const view=()=>getDraft()?.creative;
  const currentRecipe=()=>findRecipe(getDraft()?.recipe?.id);
  const current=()=>view()?.choice;
  const selectedStyle=()=>catalogById.get(view()?.styleId);
  async function getIndex(){
    if (index) return index;
    pendingIndex ??= fetch(output).then(response=>{
      if (!response.ok) throw new Error('O catálogo não carregou. Tente novamente.');
      return response.json();
    }).then(value=>{
      for (const item of value) catalogById.set(item.id,item);
      index=value;
      return index;
    }).finally(()=>{pendingIndex=null;});
    return pendingIndex;
  }
  function resetGoal(v){
    delete v.choice;resetStyle(v);
  }
  function resetStyle(v){
    delete v.styleId;delete v.direction;delete v.visual;delete v.pace;delete v.sound;delete v.narration;
    delete v.feedback;v.substep='catalog';
  }
  function chooseSource(v,key,value){
    if (v[key]===value) return;
    v[key]=value;delete v.result;resetGoal(v);changed();
  }
  function originReady({silent=false}={}){
    if (!current()) {
      if (!silent) notify('Gere os objetivos e escolha um para seguir.');
      return false;
    }
    return true;
  }
  function chooseGoal(v,goal){
    if (current()?.title===goal.title) return;
    v.choice=goal;resetStyle(v);changed();renderOrigin();
  }
  function renderOrigin() {
    const v=view();
    origin.hidden=!v;
    if (!v) return;
    const field=node('label',v.source==='link'?'Link do produto ou do site':'Sua ideia em uma frase');
    const input=node('input');
    input.type=v.source==='link'?'url':'text';input.maxLength=v.source==='link'?500:240;
    input.id='creative-source';input.placeholder=v.source==='link'?'https://sualoja.com.br/produto':'Ex.: como usar inteligência artificial no atendimento';
    input.value=v[v.source==='link'?'url':'idea'] || '';
    input.oninput=()=>{
      const key=v.source==='link'?'url':'idea';
      const had=Boolean(v.result);
      chooseSource(v,key,input.value);
      if (had) origin.querySelector('.creative-goals')?.remove();
      refresh();
    };
    field.append(input);
    const starts=node('div','','button-row');
    starts.setAttribute('aria-label','Ponto de partida');
    for (const [source,label] of [['link','Link do produto ou site'],['idea','Uma ideia']]) {
      starts.append(button(label,()=>{chooseSource(v,'source',source);renderOrigin();document.getElementById('creative-source').focus();},{selected:v.source===source}));
    }
    const guides=node('div','','creative-pills');
    for (const [id,label] of Object.entries(creativeOrigins)) guides.append(button(label,()=>{
      chooseSource(v,'origin',id);renderOrigin();guidesFocus(id);
    },{selected:v.origin===id}));
    for (const [i,chip] of [...guides.children].entries()) chip.dataset.origin=Object.keys(creativeOrigins)[i];
    const generate=button('Gerar objetivos e estilos com IA',()=>{
      if (!input.reportValidity()) return;
      request('objectives');
    },{primary:true});
    generate.id='creative-generate';
    const note=node('p','','small');note.id='creative-availability';
    const fallback=button('Planejar manualmente',manual);
    fallback.className='plain';
    const actions=node('div','','button-row');actions.append(generate,fallback);
    origin.replaceChildren(starts,field,node('h3','Que rumo você quer dar?'),guides,actions,note);
    if (v.result) {
      const group=node('section','','creative-goals');
      const title=node('h3','Qual objetivo você quer seguir?');
      const entity=node('p',[v.result.name,v.result.category].filter(Boolean).join(' · '),'muted');
      const groupGrid=node('div','','creative-options');
      for (const goal of v.result.goals) {
        const pick=button(goal.title,()=>chooseGoal(v,goal),{selected:current()?.title===goal.title});
        pick.append(node('span',goal.detail),node('small',goal.directions.map(key=>themes[key].name).join(' · ')));
        groupGrid.append(pick);
      }
      group.append(title,entity,groupGrid);origin.append(group);
    }
    refresh();
  }
  function guidesFocus(id){origin.querySelector('[data-origin="'+id+'"]')?.focus();}
  function refresh(){
    const v=view(),el=document.getElementById('creative-generate'),hint=document.getElementById('creative-availability');
    if (!v || !el || !hint) return;
    const cap=getCapabilities(),mode=v.source==='link'?cap.product:cap.brief;
    el.disabled=busy() || !(v.source==='link'?v.url:v.idea)?.trim();
    hint.textContent=mode==='mock'?'Simulação local.':mode==='gemini'?'Escolha um objetivo antes de avançar.':
      'Conecte o acesso ao piloto para gerar com IA, ou planeje manualmente.';
  }
  function applyObjectives(result){
    const v=view();
    if (!v) return;
    v.result=result.creative;
    resetGoal(v);
    getDraft().subject=result.creative.name;
    changed();renderOrigin();
    origin.querySelector('.creative-goals button')?.focus();
  }
  function profile(v){
    return creativeProfile(v.result,currentRecipe());
  }
  function resultState(v){
    if (!results.has(v) || results.get(v).goal!==v.choice) {
      results.set(v,{goal:v.choice,filter:'',query:'',shown:pageSize});
    }
    return results.get(v);
  }
  function preview(item,choose){
    const container=dialog.querySelector('.creative-strip');
    dialog.querySelector('h2').textContent=item.label;
    dialog.querySelector('.creative-preview-caption').textContent=item.caption;
    container.replaceChildren(...item.frames.map(frame=>{
      const figure=node('figure'),caption=node('figcaption',frame.label || '');
      caption.append(node('small',frame.caption,'muted'));
      figure.append(styleFrame(frame),caption);return figure;
    }));
    const action=dialog.querySelector('.creative-use');
    action.onclick=()=>{dialog.close();choose();};
    dialog.showModal();
  }
  function pickStyle(v,item,filter){
    if (v.styleId===item.id && v.direction===(filter || item.dirs[0])) return;
    resetStyle(v);
    v.styleId=item.id;v.direction=filter || item.dirs[0];
    changed();void renderStyles();
  }
  function renderCatalog(v,items){
    const state=resultState(v);
    const filters=node('div','','creative-pills');
    const queryLabel=node('label','Buscar nos estilos sugeridos'),search=node('input');
    search.type='search';search.value=state.query;queryLabel.append(search);
    const list=node('div','','creative-cards'),report=node('p','','small'),more=button('Mostrar mais estilos',()=>{
      const before=state.shown;state.shown+=pageSize;draw();
      list.children[before]?.querySelector('button')?.focus();
    });
    report.setAttribute('role','status');
    const draw=()=>{
      const terms=normalize(state.query).trim().split(/\s+/).filter(Boolean);
      const matching=items.filter(item=>(!state.filter || item.dirs.includes(state.filter)) &&
        terms.every(term=>normalize([item.label,item.caption,item.familyName,...item.tags].join(' ')).includes(term)));
      report.textContent=matching.length?matching.length+' estilos relacionados ao objetivo.':'Nenhum estilo para esta busca.';
      list.replaceChildren(...matching.slice(0,state.shown).map(item=>{
        const card=node('article','','creative-card');
        const selected=item.id===v.styleId;
        const choose=()=>pickStyle(v,item,state.filter);
        const choices=node('div','','button-row');
        const see=button('Ver prévia',()=>preview(item,choose));
        see.setAttribute('aria-label','Ver prévia de '+item.label);
        const use=button(selected?'Escolhido':'Usar estilo',choose,{selected});
        use.setAttribute('aria-label','Usar estilo '+item.label);
        choices.append(see,use);
        card.append(styleFrame(item.frames[0]),node('small',item.familyName,'muted'),node('h3',item.label),
          node('p',item.caption,'small'));
        if (item.needsPerson) card.append(node('p','Pode precisar de voz ou imagem autorizada.','small'));
        card.append(choices);
        return card;
      }));
      more.hidden=matching.length<=state.shown;
      for (const item of filters.children) item.setAttribute('aria-pressed',String(item.dataset.group===state.filter));
    };
    const groups=[['','Todas as direções'],...v.choice.directions.filter(key=>items.some(item=>item.dirs.includes(key))).map(key=>[key,themes[key].name])];
    for (const [id,label] of groups) {
      const filter=button(label,()=>{state.filter=id;state.shown=pageSize;draw();},{selected:state.filter===id});
      filter.dataset.group=id;filters.append(filter);
    }
    search.oninput=()=>{state.query=search.value;state.shown=pageSize;draw();};
    style.replaceChildren(node('p',v.choice.title,'small creative-context'),filters,queryLabel,report,list,more);
    draw();
  }
  async function renderStyles(){
    const v=view();style.hidden=!v;
    if (!v?.choice) return;
    if (!index) style.replaceChildren(node('p','Carregando estilos…','small'));
    let catalog;
    try {catalog=await getIndex();}
    catch(error) {
      if(view()===v) style.replaceChildren(node('p',error.message,'small'),button('Tentar novamente',()=>void renderStyles()));
      return;
    }
    if (view()!==v || !v.choice) return;
    if (v.substep==='catalog' || !v.styleId) {
      heading.textContent='Qual estilo combina com o objetivo?';
      renderCatalog(v,recommend(catalog,profile(v),v.choice));
      return;
    }
    const chosen={...selectedStyle(),dirs:[v.direction]};
    const choices=node('div','','creative-options');
    const kind=v.substep;
    const items=kind==='visual'?directions(profile(v),chosen):kind==='pace'?
      Object.entries(creativePace).map(([key,value])=>[value.label,value.detail,key]):
      sound(profile(v),chosen,{origin:v.origin});
    const question={visual:'Como quer mostrar a ideia?',pace:'Qual ritmo combina com o vídeo?',sound:'O que a pessoa deve ouvir?'}[kind];
    for (const [label,description,value=label] of items) {
      const select=button(label,()=>{
        v[kind]=value;
        if (kind==='sound') v.narration=/narração|locução/i.test(label);
        changed();
        for (const option of choices.children) option.setAttribute('aria-pressed',String(option.dataset.value===v[kind]));
      },{selected:v[kind]===value});
      select.dataset.value=value;select.append(node('span',description));choices.append(select);
    }
    heading.textContent=question;
    style.replaceChildren(node('p',chosen.label+' · '+themes[v.direction].name,'small creative-context'),choices);
  }
  const detailSteps=['catalog','visual','pace','sound'];
  function moveDirection(step){
    const v=view();v.substep=step;changed();void renderStyles();
  }
  function nextDirection(){
    const v=view();
    if (!v.styleId) {notify('Escolha um estilo para continuar.');return;}
    const next=detailSteps[detailSteps.indexOf(v.substep)+1];
    if (next) {moveDirection(next);return;}
    request('storyboard');
  }
  function previousDirection(){
    const previous=detailSteps[detailSteps.indexOf(view()?.substep)-1];
    if (!previous) return false;
    moveDirection(previous);return true;
  }
  function payload(){
    const v=view();
    if (!v) return undefined;
    return {recipeId:currentRecipe()?.id || null,source:v.source,origin:v.origin,
      ...(v.source==='link'?{url:v.url?.trim() || ''}:{}),
      ...(v.choice?{goal:v.choice,summary:v.result?.description || '',category:v.result?.category || ''}:{}),
      ...(v.styleId?{styleId:v.styleId,direction:v.direction}:{}),
      ...(v.visual?{visual:v.visual}:{}),...(v.pace?{pace:v.pace}:{}),
      ...(v.sound?{sound:v.sound,narration:Boolean(v.narration)}:{}),
      ...(v.feedback?{feedback:v.feedback}:{}),
    };
  }
  dialog.querySelector('.creative-close').onclick=()=>dialog.close();
  return {renderOrigin,renderStyles,refresh,applyObjectives,originReady,nextDirection,previousDirection,payload,selectedStyle,getIndex};
}
