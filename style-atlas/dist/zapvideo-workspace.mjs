import {setupCreative,styleFrame} from './zapvideo-creative-ui.mjs';
import {describeProject, editOutputs, isId, limits, parseTime, projectFormat, projectVersion,
  supportedVideo, validateProject} from './zapvideo-contract.mjs';
import {encryptHandoff} from './zapvideo-transfer.mjs';
import {readSrt, suggestCuts} from './zapvideo-captions.mjs';
import {assemblyPlan} from './zapvideo-assembly.mjs';
import {styles,recipeStyles,durations,objectives,makeBoard} from './zapvideo-guided.mjs';
import {findRecipe,recipeGoals,recipePreviews,recipeCanGenerateClip} from './zapvideo-recipes.mjs';
import {recipeGoalOptions,setupRecipes} from './zapvideo-recipe-ui.mjs';
import {setupEditPreviews,showEditSource,positionCropGuide,captureEditFrame,refreshEditTreatment,softImage} from './zapvideo-edit-previews.mjs';

const $ = id => document.getElementById(id);
const storage = 'zapvideo-workspace-v1';
const apiRoot = '/api/zapvideo';
const files = new Map();
const savedDrafts = {};
const savedJobs = {};
const draftKey = record => findRecipe(record.recipe?.id) ? 'recipe-'+record.recipe.id : record.mode;
const editTitle = 'Editar um vídeo que já tenho';
const createTitle = 'Criar um vídeo com IA';
const accessKey = 'zapvideo-pilot';
const formatBytes = bytes => `${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(bytes/1024**2)} MiB`;
const briefPrice = micros => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'USD',maximumFractionDigits:6}).format(micros/1e6);
const unique = () => crypto.randomUUID();
const blankCut = () => ({start:'',end:'',x:0.5,y:0.5});
const newDraft = mode => ({id:unique(),version:projectVersion,revision:1,mode,subject:'',materials:[],scenes:[],
  captions:false,separate:true,cuts:false,ranges:[blankCut(),blankCut(),blankCut()],treatment:false,
  finish:{balance:true,denoise:false,brightness:0,contrast:1,saturation:1}});
let draft = null, previewUrl, previewIndex = -1, proposal = null, job = null, task, token = '', lastJob;
let capabilities = {render:'unavailable',brief:'unavailable',analysis:'unavailable',clip:'unavailable'};
const availableAsset=kind=>['mock','gemini'].includes(capabilities.assets?.[kind]);
const planningButtons=[...document.querySelectorAll('[data-step]')];
const planningPanels=planningButtons.map(button=>document.querySelector(`[data-plan-step="${button.dataset.step}"]`));
const planningNext=['Escolher estilo','Ver storyboard','Continuar para montagem','Revisar e entregar'];
const storyboardIndex=planningButtons.findIndex(button=>button.dataset.step==='scenes');
const currentRecipe=()=>findRecipe(draft?.recipe?.id);
const styleOptions=()=>currentRecipe()?recipeStyles:styles;
const guided=()=>draft.guided ??= {url:'',name:'',category:'',description:'',style:'',aspect:'9:16',duration:15,objective:'sell'};
let stylePreview,productRequest;
const boardUrls=[];
let planningIndex=0;
let deliveryLookup;
const editVideo=$('preview');
const pauseEditAudio=setupEditPreviews(editVideo);
const creativeUI=setupCreative({
  getDraft:()=>draft,getCapabilities:()=>capabilities,busy:()=>Boolean(task),changed:update,notify:note,
  request:requestCreative,
  manual:()=>{
    if (task) return;
    const state=draft.creative;
    if (!state) return;
    if (state.source==='link') {
      if (currentRecipe()) draft.subject=state.result?.name || '';
      else {
        draft.origin='link';
        Object.assign(guided(),{url:state.url || '',name:state.result?.name || '',description:state.result?.description || ''});
      }
    } else {
      if (state.idea) draft.subject=state.idea;
      draft.origin='idea';
    }
    delete draft.creative;delete guided().catalogBoard;delete guided().boardKey;
    update();renderOrigin();
  }
});
function requestCreative(operation) {
  const state=draft?.creative;
  if (!state || task) return;
  if (!token) {
    $('pilot').open=true;$('token').focus();note('Conecte seu código para usar a IA.');return;
  }
  const mode=operation==='storyboard'?capabilities.creativeBoard:state.source==='link'?capabilities.product:capabilities.brief;
  if (!['mock','gemini'].includes(mode)) {note('Planejamento com IA indisponível.');return;}
  const subject=state.source==='idea'?state.idea?.trim():state.result?.name || 'Identificar conteúdo da página pública';
  if (!subject) {note('Informe a ideia em uma frase.');return;}
  if (operation==='storyboard' && sameBoard()) {showPlanningStep(storyboardIndex);return;}
  if (operation==='objectives') draft.subject=subject;
  if (state.source==='link') {
    try {
      const url=new URL(state.url.trim());
      if (url.protocol!=='https:' || url.username || url.password || url.search || url.hash) throw Error();
    } catch {note('Use o endereço público HTTPS sem parâmetros.');return;}
  }
  update();void runTask('brief',false,{operation});
}


try {
  const restored = JSON.parse(localStorage.getItem(storage));
  for (const [mode,record] of Object.entries(restored?.drafts || {})) {
    if (record && ['edit','create'].includes(record.mode) && draftKey(record)===mode &&
      isId(record.id) && record.version===projectVersion) savedDrafts[mode]=record;
  }
  Object.assign(savedJobs,restored?.jobs || {});
  if (isId(restored?.draft?.id) && restored.draft.version === projectVersion) {
    draft = savedDrafts[draftKey(restored.draft)] ?? restored.draft;
    lastJob = savedJobs[draft.id] ?? restored.lastJob;
    $('resume-draft').hidden = false;
  }
} catch { /* Local drafts are optional. */ }
try { token = sessionStorage.getItem(accessKey) || ''; } catch { /* Session storage can be unavailable. */ }
if (location.pathname === '/' && location.hash && ['#instalar','#biblioteca','#projeto','#ajuda'].includes(location.hash)) {
  location.replace('/catalogo'+location.search+location.hash);
}

function note(message) { $('status').textContent = message; }
function save() {
  savedDrafts[draftKey(draft)]=draft;
  if (lastJob) savedJobs[draft.id]=lastJob;
  try { localStorage.setItem(storage,JSON.stringify({draft,drafts:savedDrafts,jobs:savedJobs})); }
  catch { note('Seu navegador restringiu o salvamento. Baixe a ficha para guardar as alterações.'); }
}
function update() {
  draft.revision++;
  if (proposal) $('apply-proposal').disabled = proposal.revision !== draft.revision;
  save();
  refresh();
}
const cameraOptions={
  'Enquadramento':['Ambiente','Plano médio','Detalhe'], 'Ângulo':['De frente','De lado','De cima'],
  'Movimento':['Parada','Aproximação suave','Deslize lateral'], 'Transição':['Corte direto','Dissolver'],
};
function shotDirection(shot) {
  const direction=Object.entries(cameraOptions).filter(([key,values])=>values.includes(shot.camera?.[key]))
    .map(([key])=>`${key}: ${shot.camera[key]}.`).join(' ');
  return direction ? `${shot.direction} ${direction}` : shot.direction;
}
function draftPlan() {
  const analysisIds=new Set(draft.analysisIds || []);
  const assemblyIds=new Set(draft.assemblyIds || []);
  return {format:projectFormat,version:projectVersion,id:draft.id,revision:draft.revision,
    intent:{mode:draft.mode,subject:draft.mode === 'create' ? draft.subject : '',
      ...(currentRecipe()?{recipe:{id:draft.recipe.id,goal:draft.recipe.goal,style:guided().style,duration:draft.creative?15:guided().duration}}:{}),
      ...(draft.creative?{creative:creativeUI.payload()}:{})},
    materials:draft.materials.filter(item => draft.mode === 'create' || item.kind !== 'subtitle' || draft.captions)
      .map(item => ({...item,permission:(draft.mode==='edit' && draft.permission) ||
        (draft.mode==='create' && ((draft.analysisPermit && analysisIds.has(item.id)) || draft.clipFrameIds?.includes(item.id) ||
          assemblyIds.has(item.id))) ? 'process' : 'local'})),
    actions:{captions:draft.captions ? (draft.separate ? 'mp4+srt' : 'mp4') : null,
      cuts:draft.cuts ? draft.ranges.map(cut => ({...cut,start:parseTime(cut.start),end:parseTime(cut.end)})) : [],
      treatment:draft.treatment ? draft.finish : null},
    scenes:draft.scenes.map(scene=>({...scene,shots:scene.shots.map(({example,camera,referenceFrameId,...shot})=>
      ({...shot,direction:shotDirection({...shot,camera})}))})),reviewStatus:'pending',...(draft.mode==='create'?{assembly:{aspect:draft.assemblyAspect || '9:16',
      sampleSceneId:draft.sampleSceneId || null,musicMaterialId:draft.musicMaterialId || null,
      captionMaterialId:draft.materials.find(item=>item.kind==='subtitle')?.id || null}}:{})};
}
function requireSelected(project) {
  return project.materials.map(item => {
    const file = files.get(item.id);
    if (!file) throw new Error(`Selecione novamente o arquivo "${item.name}".`);
    return {id:item.id,file};
  });
}
function displayFile(kind, fallback) {
  const item = draft.materials.find(item => item.kind === kind);
  return item ? `${item.name} · ${formatBytes(item.bytes)}${files.has(item.id)?'':' · selecione novamente para processar'}` : fallback;
}
function materialList(container, kinds) {
  container.replaceChildren();
  for (const item of draft.materials.filter(item => kinds.includes(item.kind))) {
    const row = document.createElement('li');
    row.textContent = `${item.name} · ${formatBytes(item.bytes)} `;
    const button = document.createElement('button');
    button.className = 'plain';
    button.textContent = 'Remover';
    button.setAttribute('aria-label','Remover '+item.name);
    button.onclick = () => {
      removeMaterials(new Set([item.id]));
      renderScenes();
      renderAnalysisFiles();
      update();
    };
    row.append(button);
    container.append(row);
  }
}
function removeMaterials(ids) {
  draft.materials=draft.materials.filter(item=>!ids.has(item.id));
  if (ids.has(draft.musicMaterialId)) delete draft.musicMaterialId;
  if (draft.recipe) draft.recipe.media=(draft.recipe.media || []).filter(id=>!ids.has(id));
  draft.analysisIds=(draft.analysisIds || []).filter(id=>!ids.has(id));
  draft.assemblyIds=(draft.assemblyIds || []).filter(id=>!ids.has(id));
  draft.clipFrameIds=(draft.clipFrameIds || []).filter(id=>!ids.has(id));
  draft.analysisPermit=false;
  for (const scene of draft.scenes) {
    if (ids.has(scene.narrationMaterialId)) delete scene.narrationMaterialId;
    for (const shot of scene.shots) {
      shot.layers=shot.layers.filter(layer=>!ids.has(layer.materialId));
      if (ids.has(shot.referenceFrameId)) delete shot.referenceFrameId;
    }
  }
  for (const id of ids) files.delete(id);
}
function refresh() {
  if (!draft) return;
  $('permit').checked = Boolean(draft.permission);
  $('analysis-permit').checked = Boolean(draft.analysisPermit);
  $('captions-fields').hidden = !draft.captions;
  $('cut-fields').hidden = !draft.cuts;
  if (draft.mode==='edit') refreshEditTreatment(draft.finish,draft.treatment,$('editor-image-original').hidden);
  $('source-info').textContent = displayFile('source','Até 512 MiB e 15 minutos por vídeo.');
  $('srt-info').textContent = displayFile('subtitle','Até 2 MiB.');
  const plan = draftPlan();
  const summary = structuredClone(plan);
  summary.actions.cuts = plan.actions.cuts.filter(cut => Number.isFinite(cut.start) && Number.isFinite(cut.end));
  $('summary').textContent = describeProject(summary);
  $('sizes').textContent = `Arquivos da ficha: ${formatBytes(plan.materials.reduce((sum,item) => sum+item.bytes,0))}. Vídeo: até 512 MiB. SRT: até 2 MiB.`;
  materialList($('reference-list'),['reference','frame','audio']);
  materialList($('take-list'),['take']);
  const online = draft.mode === 'edit' && capabilities.render !== 'unavailable';
  $('permit-label').hidden = !online;
  $('render-note').hidden = draft.mode !== 'edit';
  const connectPilot=capabilities.pilotAvailable && !token;
  $('render-note').textContent = online ? 'Se o envio cair, selecione o mesmo arquivo para retomar.' :
    connectPilot ? 'Conecte seu código em Acesso ao piloto para editar online.' : 'Edição online indisponível. Use a ficha no Studio Kit Pro.';
  $('suggest').disabled = Boolean(task) || capabilities.brief === 'unavailable';
  $('suggest-note').textContent = capabilities.brief === 'mock' ? 'Proposta simulada para testes.' :
    capabilities.brief === 'unavailable' ? (connectPilot ? 'Conecte seu código em Acesso ao piloto para usar o Gemini.' :
      'Gemini indisponível. Você pode montar o briefing aqui.') :
      [capabilities.briefReservedMicros>0?'Reserva por proposta de '+briefPrice(capabilities.briefReservedMicros)+'.':'',
        currentRecipe()?'O Google recebe o assunto e as escolhas desta etapa.':'Apenas seu assunto será enviado ao Gemini.'].filter(Boolean).join(' ');
  $('analysis-controls').hidden=capabilities.analysis==='unavailable';
  $('analysis-note').textContent=capabilities.analysis==='unavailable'?'Análise online indisponível. Suas referências podem acompanhar a ficha.' :
    (capabilities.analysis==='mock'?'Análise simulada para testes. ':'O Gemini recebe somente o assunto e as fontes selecionadas. ')+
    'Até 4 arquivos, com 8 MiB somados. Capturas, fotos, PDF, áudio, vídeo e uma página pública.';
  $('produce').hidden = !online;
  $('send-handoff').hidden = Boolean(currentRecipe()) || !token || !capabilities.limits;
  $('local-help').hidden = draft.mode !== 'edit';
  $('asset-music').hidden=!availableAsset('music');
  refreshAssembly();
  if (draft.mode==='create') {
    refreshGuided();
    if (currentRecipe()) refreshRecipeMedia();
  }
  $('generation-note').textContent=!recipeCanGenerateClip(currentRecipe()?.id)?'Revise o storyboard e baixe seu plano em Entrega.':capabilities.clip==='mock'?'Clipe em simulação local. Aprovações e arquivos de teste ficam neste ambiente.':
    capabilities.clip==='unavailable'?'Geração de clipes, imagens, narração e trilha indisponível no piloto.':
      'A geração de cada clipe exige aprovação do quadro e confirmação do valor.';
}
function renderAnalysisFiles() {
  if (draft?.mode!=='create') return;
  const list=$('analysis-files');
  list.querySelectorAll('label').forEach(label=>label.remove());
  for (const item of draft.materials.filter(item=>capabilities.analysisTypes?.includes(item.name.split('.').at(-1).toLowerCase()))) {
    const wrapper=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.checked=draft.analysisIds?.includes(item.id) ?? false;wrapper.className='toggle';
    check.onchange=()=>{
      const selection=new Set(draft.analysisIds || []);
      if (check.checked) selection.add(item.id);
      else selection.delete(item.id);
      draft.analysisIds=[...selection];
      draft.analysisPermit=false;
      update();
    };
    wrapper.append(check,item.name+' · '+formatBytes(item.bytes));
    list.append(wrapper);
  }
}
function setPreview(index) {
  previewIndex = index;
  positionCropGuide(editVideo,index >= 0 ? draft.ranges[index] : null);
}
function initializeCuts() {
  const container = $('cut-fields');
  container.replaceChildren();
  for (const [index,cut] of draft.ranges.entries()) {
    const copy = $('cut-template').content.cloneNode(true);
    copy.querySelector('legend').textContent = 'Corte '+(index+1);
    for (const input of copy.querySelectorAll('[data-cut]')) {
      const key = input.dataset.cut;
      input.value = cut[key];
      input.oninput = () => {
        cut[key] = input.type === 'range' ? Number(input.value) : input.value;
        if (input.type === 'range' && previewIndex === index) setPreview(index);
        update();
      };
    }
    copy.querySelector('.preview-cut').onclick = () => {
      setPreview(index);
      if (!previewUrl || !editVideo.videoWidth) {
        $('editor-crop-demo').scrollIntoView({block:'nearest'});
        return;
      }
      const time = parseTime(cut.start);
      if (Number.isFinite(time) && Number.isFinite($('preview').duration)) {
        $('preview').currentTime = Math.min(time,$('preview').duration);
      }
      $('preview').scrollIntoView({block:'nearest'});
    };
    container.append(copy);
  }
}
function field(label, value, apply, {textarea,max,type} = {}) {
  const wrapper = document.createElement('label');
  wrapper.textContent = label;
  const control = document.createElement(textarea ? 'textarea' : 'input');
  if (type) control.type = type;
  if (type === 'number') { control.min='0.25'; control.max='120'; control.step='0.25'; }
  if (max) control.maxLength = max;
  control.value = value;
  control.oninput = () => { apply(type === 'number' ? control.valueAsNumber : control.value); update(); };
  wrapper.append(control);
  return wrapper;
}
const newShot = () => ({id:unique(),direction:'',seconds:5,generateSupport:false,layers:[]});
function action(text, handler) {
  const button = document.createElement('button');
  button.type='button';button.className='plain';button.textContent=text;button.onclick=handler;
  return button;
}
function boardImage(path,alt) {
  const img=document.createElement('img');
  img.src=path;img.alt=alt;img.loading='lazy';img.width=512;img.height=288;
  return img;
}
function detachClip(shot,row) {
  if (!shot.selectedClip) return;
  delete shot.selectedClip;
  row.querySelector('[data-linked-clip]')?.remove();
  note('O plano mudou. Revise um clipe para a nova direção.');
}
function renderShotVisual(shot,row) {
  const preview=document.createElement('figure'),caption=document.createElement('figcaption');
  preview.className='shot-visual';
  const original=files.get(shot.referenceFrameId);
  if (original) boardUrls.push(URL.createObjectURL(original));
  preview.append(boardImage(original?boardUrls.at(-1):shot.example,original?'Quadro deste plano':'Referência do catálogo'),caption);
  caption.textContent=original?'Quadro deste plano':'Exemplo de direção';
  const wrapper=document.createElement('label'), frames=document.createElement('select');
  const candidates=draft.materials.filter(item=>['frame','reference'].includes(item.kind) && files.has(item.id) &&
    /\.(?:png|jpeg|jpg|webp)$/i.test(item.name) && item.bytes<=(capabilities.clipFrameMaxBytes ?? 2*1024**2));
  choiceOptions(frames,candidates,shot.referenceFrameId,'Escolha em Referências');
  frames.onchange=()=>{
    shot.referenceFrameId=frames.value || null;
    detachClip(shot,row);
    const old=preview.querySelector('img');
    const file=files.get(shot.referenceFrameId);
    if (old.src.startsWith('blob:')) URL.revokeObjectURL(old.src);
    if (file) boardUrls.push(URL.createObjectURL(file));
    old.src=file?boardUrls.at(-1):shot.example;
    old.alt=caption.textContent=file?'Quadro deste plano':'Exemplo de direção';
    update();
  };
  wrapper.append('Quadro do projeto',frames);
  const camera=document.createElement('div');
  camera.className='camera-grid';
  for (const [key,values] of Object.entries(cameraOptions)) {
    const label=document.createElement('label'),menu=document.createElement('select');
    choiceOptions(menu,values.map(value=>({id:value,name:value})),shot.camera?.[key],'Padrão do estilo');
    menu.onchange=()=>{
      (shot.camera ??= {})[key]=menu.value;
      detachClip(shot,row);
      if (key==='Movimento') {
        shot.motion=menu.value==='Aproximação suave'?'push':'still';
        const zoom=row.querySelector('[data-image-zoom]');
        if (zoom) zoom.checked=shot.motion==='push';
      }
      update();
    };
    label.append(key,menu);camera.append(label);
  }
  return [preview,wrapper,camera];
}
function renderScenes() {
  for (const url of boardUrls.splice(0)) URL.revokeObjectURL(url);
  $('scenes-empty').hidden=draft.scenes.length>0;
  const container = $('scenes');
  const canGenerate=recipeCanGenerateClip(currentRecipe()?.id);
  container.classList.toggle('has-examples',draft.scenes.some(scene=>scene.shots.some(shot=>shot.example)));
  const opened=new Set([...container.querySelectorAll('details[open][data-editor]')].map(item=>item.dataset.editor));
  const editor=(title,id)=>{
    const details=document.createElement('details'),summary=document.createElement('summary');
    details.dataset.editor=id;details.open=opened.has(id);summary.textContent=title;details.append(summary);
    return details;
  };
  container.replaceChildren();
  draft.scenes.forEach((scene,i) => {
    const box = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const compact=scene.shots.some(shot=>shot.example);
    legend.textContent = compact && scene.title ? `${i+1} · ${scene.title}` : 'Cena '+(i+1);
    const sceneSettings=compact?editor('Título e narração',scene.id):box;
    box.append(legend);
    sceneSettings.append(field('Título da cena',scene.title,value=>{
      scene.title=value;
      if (compact) legend.textContent=value?`${i+1} · ${value}`:'Cena '+(i+1);
    },{max:120}),
      field('O que será falado',scene.narration,value => scene.narration=value,{textarea:true,max:1200}));
    if (availableAsset('speech')) sceneSettings.append(action('Preparar narração',()=>openAsset('speech',scene)));
    if (['local','container'].includes(capabilities.assembly)) {
      const label=document.createElement('label'), audio=document.createElement('select');
      choiceOptions(audio,draft.materials.filter(item=>item.kind==='audio'),scene.narrationMaterialId,'Sem narração');
      audio.onchange=()=>{scene.narrationMaterialId=audio.value || null;update();};
      label.append('Faixa de narração',audio);
      sceneSettings.append(label);
    }
    scene.shots.forEach((shot,j) => {
      const row = document.createElement('div');
      row.className='details';
      const title = document.createElement('h3');
      const titleText=()=>`Plano ${j+1}${shot.example && Number.isFinite(shot.seconds)?` · ${shot.seconds} s`:''}`;
      title.textContent=titleText();
      const support = document.createElement('label');
      support.className='toggle';
      const check = document.createElement('input');
      check.type='checkbox';check.checked=shot.generateSupport;
      const clipButton=action('Revisar clipe deste plano',()=>openClip(scene,shot));
      clipButton.hidden=!canGenerate || !shot.generateSupport || capabilities.clip==='unavailable';
      support.hidden=!canGenerate;
      check.onchange=()=>{shot.generateSupport=check.checked;clipButton.hidden=!check.checked || capabilities.clip==='unavailable';update();};
      support.append(check,'Planejar mídia de apoio com IA para este plano');
      const material = document.createElement('select');
      material.add(new Option('Sem material vinculado',''));
      for (const item of draft.materials) material.add(new Option(item.name,item.id));
      material.value=shot.layers[0]?.materialId || '';
      material.onchange=()=>{
        const chosen=draft.materials.find(item=>item.id===material.value);
        shot.layers=chosen ? [{kind:chosen.kind==='take'?'video':'image',materialId:chosen.id}] : [];
        update();
      };
      const label=document.createElement('label');
      label.append('Vincular material',material);
      const shotSettings=shot.example?editor('Ajustar plano',shot.id):row;
      row.append(title);
      if (shot.example) {
        const [preview,frame,controls]=renderShotVisual(shot,row);
        row.append(preview,frame);
        shotSettings.append(controls);
      }
      shotSettings.append(field('O que aparece',shot.direction,value=>{
        shot.direction=value;
        if (shot.example) detachClip(shot,row);
      },{textarea:true,max:shot.example?360:500}),field('Segundos',shot.seconds,value=>{
        shot.seconds=value;title.textContent=titleText();
        if (shot.example) detachClip(shot,row);
      },{type:'number'}),label,support);
      if (['local','container'].includes(capabilities.assembly)) {
        const motion=document.createElement('label'), zoom=document.createElement('input');
        motion.className='toggle';zoom.type='checkbox';zoom.checked=shot.motion==='push';
        zoom.dataset.imageZoom='';
        zoom.onchange=()=>{shot.motion=zoom.checked?'push':'still';update();};
        motion.append(zoom,'Aproximação suave se o material for uma imagem');
        const sound=document.createElement('label'), keep=document.createElement('input');
        sound.className='toggle';keep.type='checkbox';keep.checked=shot.keepAudio!==false;
        keep.onchange=()=>{shot.keepAudio=keep.checked;update();};
        sound.append(keep,'Manter o som da tomada');
        shotSettings.append(field('Título sobre a imagem',shot.overlay || '',value=>shot.overlay=value,{max:100}),motion,sound);
      }
      if (shot.example) row.append(shotSettings);
      row.append(clipButton);
      if (availableAsset('frame')) row.append(action('Preparar quadro conceitual',()=>openAsset('frame',scene,shot)));
      if (shot.selectedClip) {
        const selected=document.createElement('p');
        const linked=document.createElement('div');linked.dataset.linkedClip='';
        selected.className='muted';
        selected.textContent=shot.selectedClip.mode==='mock'?'Clipe simulado vinculado.':'Clipe vinculado ao plano.';
        linked.append(selected,action('Desvincular clipe',()=>{
          delete shot.selectedClip;
          renderScenes();
          update();
          note('Clipe desvinculado do plano.');
        }));
        row.append(linked);
      }
      if (scene.shots.length>1) row.append(action('Remover plano',()=>{scene.shots.splice(j,1);renderScenes();update();box.focus();}));
      box.append(row);
    });
    if (compact) box.append(sceneSettings);
    if (scene.shots.length<8) box.append(action('+ Adicionar plano',()=>{
      scene.shots.push(newShot());renderScenes();update();
      const fields=container.children[i].querySelectorAll('textarea');
      fields[compact?fields.length-2:fields.length-1].focus();
    }));
    box.append(action('Remover cena',()=>{draft.scenes.splice(i,1);renderScenes();update();$('add-scene').focus();}));
    container.append(box);
  });
  renderMoodboard();
}

function renderMoodboard() {

  const board=$('moodboard'),catalogBoard=draft.creative && guided().catalogBoard;
  if (catalogBoard) {
    board.hidden=$('board-note').hidden=false;
    const text=document.createElement('h3');text.textContent='Referência do catálogo · '+catalogBoard.label;
    const strip=document.createElement('div');strip.className='creative-strip';
    strip.append(...catalogBoard.frames.map(styleFrame));
    board.replaceChildren(text,strip);
    $('board-note').textContent='Os quadros mostram o estilo escolhido. Revise abaixo as cenas propostas para o seu projeto.';
    return;
  }
  const style=styleOptions()[draft.guided?.boardStyle];
  board.hidden=$('board-note').hidden=!style || !draft.scenes.some(scene=>scene.shots.some(shot=>shot.example));
  board.replaceChildren();
  if (board.hidden) return;
  const images=document.createElement('div'),copy=document.createElement('div'),title=document.createElement('h3');
  images.className='mood-samples';
  for (const frame of [...new Set(style.frames)].slice(0,2)) images.append(boardImage(frame,'Referência de estilo'));
  title.textContent='Moodboard · '+style.name;
  const caption=document.createElement('p');caption.className='muted';caption.textContent=style.mood;
  const palette=document.createElement('div');palette.className='mood-palette';palette.setAttribute('aria-hidden','true');
  for (const value of style.palette) {
    const swatch=document.createElement('span');swatch.style.backgroundColor=value;palette.append(swatch);
  }
  copy.append(title,caption,palette);board.append(images,copy);
}

function renderOrigin() {
  const recipe=currentRecipe(),linking=draft.origin==='link' && !recipe,settings=guided();
  $('create-section').classList.toggle('creative-active',Boolean(draft.creative));
  $('recipe-intake').hidden=!recipe;
  $('origin-choices').hidden=Boolean(recipe)||Boolean(draft.creative);
  $('brief-title').textContent=draft.creative?'Qual é o ponto de partida?':recipe?'Conte sua ideia':'Defina o assunto';
  if (recipe) {
    $('recipe-subject').value=draft.subject;
    recipeGoalOptions($('recipe-goal'),draft.recipe.goal);
    $('recipe-aspect').value=draft.assemblyAspect || '9:16';
    $('recipe-duration').value=settings.duration;
    const material=recipe.material;
    $('recipe-material-box').hidden=!material;
    if (material) {
      $('recipe-material-label').textContent=material.label;
      $('recipe-material-hint').textContent=recipe.hint || material.hint;
      $('recipe-material').multiple=Boolean(material.multiple);
      $('recipe-material').accept=material.accept;
    }
    const person=material?.kind==='person';
    $('recipe-permission-label').hidden=$('recipe-voice-box').hidden=!person;
    $('recipe-permission').checked=Boolean(draft.recipe.permission);
    $('recipe-material').value=$('recipe-voice').value='';
    $('recipe-scope').hidden=recipeCanGenerateClip(recipe.id);
    $('recipe-scope').textContent='Você consegue planejar e revisar aqui. A produção deste formato acontece fora do ZapVideo.';
    refreshRecipeMedia();
  }
  $('subject').hidden=$('subject').labels[0].hidden=Boolean(recipe);
  const briefControls=['suggest','suggest-note','proposal'];
  for (const id of briefControls) (recipe?$('recipe-assist'):$('manual-intake')).append($(id));
  $('recipe-assist').hidden=!recipe;
  $('suggest').textContent=recipe?'Criar proposta com IA':'Me ajude a montar';
  $('origin-link').setAttribute('aria-pressed',String(linking));
  $('origin-manual').setAttribute('aria-pressed',String(!linking));
  $('manual-intake').hidden=linking || Boolean(draft.creative);$('guided-intake').hidden=!linking || Boolean(draft.creative);
  creativeUI.renderOrigin();
  for (const key of ['url','name','category','description','objective','aspect','duration']) $('product-'+key).value=settings[key];
}
function refreshRecipeMedia() {
  const refs=(draft.recipe.media || []).map(id=>draft.materials.find(item=>item.id===id)).filter(Boolean);
  const allowed=currentRecipe().material?.kind!=='person' || draft.recipe.permission;
  $('recipe-material').disabled=$('recipe-voice').disabled=!allowed;
  $('recipe-remove-media').hidden=!refs.length;
  $('recipe-material-state').textContent=refs.length?refs.map(item=>files.has(item.id)?
    `${item.name} · adicionado`:`${item.name} · selecione de novo para usar`).join(' • '):'';
}
function clearRecipeMedia() {
  const ids=new Set(draft.recipe.media || []);
  removeMaterials(ids);
  $('recipe-material').value=$('recipe-voice').value='';
  renderAnalysisFiles();
  renderScenes();
  update();
}
$('recipe-remove-media').onclick=clearRecipeMedia;
$('recipe-permission').onchange=()=>{
  draft.recipe.permission=$('recipe-permission').checked;
  if (!draft.recipe.permission) clearRecipeMedia();
  else update();
};
for (const id of ['recipe-material','recipe-voice']) $(id).onchange=event=>{
  const picked=[...event.target.files];
  if (!picked.length) return;
  const material=currentRecipe()?.material?.kind;
  try {
    if (material==='person' && !draft.recipe.permission) throw new Error('Confirme que você tem autorização para usar a imagem e a voz.');
    const batch=picked.map(file=>{
      const kind=id==='recipe-voice'?'audio':supportedVideo.test(file.name)?'take':'reference';
      const accepted=kind==='audio'?/\.(mp3|wav|m4a)$/i:kind==='take'?supportedVideo:/\.(png|jpg|jpeg|webp)$/i;
      if (!file.size || file.size>limits.videoBytes || !accepted.test(file.name) ||
        (material==='video' && kind!=='take') || (['image','product'].includes(material) && kind!=='reference')) {
        throw new Error('Confira o formato e o tamanho dos arquivos selecionados.');
      }
      return {file,kind};
    });
    if (draft.materials.length+batch.length>24) throw new Error('Limite de 24 arquivos por ficha.');
    const media=new Set(draft.recipe.media || []);
    for (const [kind, entries] of Object.entries(Object.groupBy(batch,item=>item.kind))) {
      selectFiles(kind,entries.map(item=>item.file),false);
      for (const {file} of entries) {
        const item=draft.materials.find(item=>item.kind===kind && item.name===file.name && item.bytes===file.size);
        media.add(item.id);
      }
    }
    draft.recipe.media=[...media];
    save();
    refreshRecipeMedia();
    note('');
  } catch (error) {
    event.target.value='';
    $('recipe-material-state').textContent=error.message;
  }
};
$('recipe-subject').oninput=()=>{draft.subject=$('recipe-subject').value;update();};
$('recipe-goal').onchange=()=>{draft.recipe.goal=$('recipe-goal').value;update();};
$('recipe-aspect').onchange=()=>{draft.assemblyAspect=$('recipe-aspect').value;update();};
$('recipe-duration').onchange=()=>{guided().duration=Number($('recipe-duration').value);update();};

function setOrigin(origin) {
  draft.origin=origin;
  renderOrigin();
  save();
  refreshGuided();
}
$('origin-link').onclick=()=>setOrigin('link');
$('origin-manual').onclick=()=>setOrigin('manual');
for (const key of ['url','name','category','description','objective','aspect','duration']) {
  $('product-'+key).oninput=event=>{
    const settings=guided();
    settings[key]=key==='duration'?Number(event.target.value):event.target.value;
    if (key==='url' && settings.sourceUrl) {
      Object.assign(settings,{name:'',category:'',description:'',sourceUrl:'',recommended:'',sourceMode:''});
      renderOrigin();
    }
    update();
  };
}
function refreshGuided() {
  const settings=guided(),reserve=capabilities.briefReservedMicros;
  const available=['mock','gemini'].includes(capabilities.product);
  $('read-product').disabled=!available || Boolean(task) || !settings.url.trim();
  if (draft.creative) {
    creativeUI.refresh();
    $('planning-next').textContent=planningIndex===0?'Escolher estilo →':planningIndex===1?
      (draft.creative.substep==='sound'?'Gerar storyboard com IA':'Continuar →'):planningIndex===storyboardIndex?'Aprovar e avançar →':'Revisar e entregar →';
    $('planning-next').disabled=Boolean(task) || (planningIndex===0 && !creativeUI.originReady({silent:true}));
    $('board-replace').hidden=true;
    return;
  }
  $('planning-next').disabled=false;
  $('product-note').textContent=capabilities.product==='mock'?'Análise simulada com dados fictícios.':
    available?`Envia só o link ao Google. Reserva de ${briefPrice(reserve)}.`:
      capabilities.pilotAvailable && !token?'Conecte o piloto para verificar o acesso à análise de links.':'Leitura de links indisponível. Informe o produto para continuar.';
  $('product-source').textContent=settings.sourceMode==='mock'?'Dados simulados para homologação.':
    settings.sourceUrl?'Dados sugeridos pela página. Confira antes de usar.':'Você também pode preencher o nome diretamente.';
  $('board-replace').hidden=planningIndex!==1 || !draft.scenes.length || sameBoard();
  const review=!recipeCanGenerateClip(currentRecipe()?.id);
  $('planning-next').textContent=review && planningIndex===storyboardIndex?'Revisar e entregar →':planningIndex===1 && !$('board-replace').hidden?'Refazer storyboard →':
    planningNext[planningIndex]?`${planningNext[planningIndex]} →`:'';
}

const productDialog=$('product-dialog');
$('read-product').onclick=()=>{
  const input=$('product-url'),value=input.value.trim();
  if (!value.startsWith('https://') || !input.reportValidity()) return note('Informe o endereço público completo, começando com https://.');
  let url;
  try { url=new URL(value); }
  catch { return note('Informe um link público válido.'); }
  if (url.username || url.password || url.port || url.search || url.hash) return note('Use o endereço público sem parâmetros, portas ou dados de acesso.');
  productRequest={value:url.href,revision:draft.revision,reserve:capabilities.briefReservedMicros || 0};
  $('product-confirm-url').textContent=url.href;
  $('product-confirm-price').textContent=capabilities.product==='mock'?'Simulação local sem cobrança.':
    `Somente o link será enviado ao Google. Reserva de ${briefPrice(productRequest.reserve)}.`;
  productDialog.showModal();
};
$('product-cancel').onclick=()=>productDialog.close();
$('product-confirm').onclick=()=>{
  const request=productRequest;
  productDialog.close();
  if (request.revision!==draft.revision || request.reserve!==(capabilities.briefReservedMicros || 0)) return note('O pedido mudou. Confira o link e o valor novamente.');
  void runTask('brief',false,{productUrl:request.value,agreedMicros:request.reserve});
};
function productView(result,revision) {
  if (draft.revision!==revision || draft.origin!=='link') return note('A análise é de uma revisão anterior. Seus dados foram preservados.');
  const product=result.product;
  const {url,name,category,description,recommended}=product;
  Object.assign(guided(),{name,category,description,recommended,sourceUrl:url,sourceMode:result.mode});
  renderOrigin();update();
  note('Confira os dados sugeridos e avance para escolher o estilo.');
}

function renderStyles() {
  $('style-cards').hidden=Boolean(draft.creative);
  $('recipe-assist').hidden=Boolean(draft.creative)||!currentRecipe();
  $('style-section').classList.toggle('creative-active',Boolean(draft.creative));
  $('creative-styles').hidden=!draft.creative;
  if (draft.creative) {void creativeUI.renderStyles();return;}
  $('style-title').textContent='Escolher um estilo';
  const list=$('style-cards'),settings=guided();
  list.replaceChildren();
  const entries=Object.entries(styleOptions()).sort(([a],[b])=>Number(b===settings.recommended)-Number(a===settings.recommended));
  for (const [id,style] of entries) {
    const selected=id===settings.style;
    const card=document.createElement('article');card.className='style-card';card.classList.toggle('selected',selected);
    const title=document.createElement('h3');title.textContent=style.name;
    const caption=document.createElement('p');caption.className='muted';caption.textContent=style.description;
    if (id===settings.recommended) caption.textContent+=currentRecipe()?' Sugerido para esta receita.':' Recomendado para este produto.';
    const choose=action(selected?'Selecionado':'Usar estilo',()=>{
      settings.style=id;update();renderStyles();
      list.querySelector('[aria-pressed="true"]').focus();
    });
    choose.className='secondary';choose.setAttribute('aria-pressed',String(selected));
    choose.setAttribute('aria-label','Usar estilo '+style.name);
    const preview=action('Ver prévia',()=>{
      stylePreview={style,index:0};renderStylePreview();$('style-dialog').showModal();
    });
    preview.setAttribute('aria-label','Ver prévia de '+style.name);
    const row=document.createElement('div');row.className='button-row';row.append(choose,preview);
    card.append(boardImage(style.frames[0],'Exemplo de '+style.name),title,caption,row);list.append(card);
  }
}
function renderStylePreview() {
  const {style,index}=stylePreview;
  $('style-example-title').textContent=style.name;
  $('style-example-image').src=style.frames[index];
  $('style-example-position').textContent=`Quadro ${index+1} de ${style.frames.length}`;
  $('style-example-prev').disabled=index===0;
  $('style-example-next').disabled=index===style.frames.length-1;
}
$('style-example-prev').onclick=()=>{stylePreview.index--;renderStylePreview();};
$('style-example-next').onclick=()=>{stylePreview.index++;renderStylePreview();};
$('style-example-close').onclick=()=>$('style-dialog').close();

function boardKey() {
  if (draft.creative) return JSON.stringify([draft.subject,creativeUI.payload()]);
  const settings=guided();
  return JSON.stringify([draft.subject,settings.style,settings.duration,settings.objective,
    ...(currentRecipe()?[draft.recipe.id,draft.recipe.goal,draft.assemblyAspect]:[])]);
}
function sameBoard() { return draft.scenes.length>0 && guided().boardKey===boardKey(); }
function confirmOrigin() {
  if (draft.creative) return creativeUI.originReady();
  if (draft.origin!=='link') {
    if (!draft.subject.trim()) { $(currentRecipe()?'recipe-subject':'subject').focus();note('Escreva uma frase sobre seu vídeo.');return false; }
    return true;
  }
  const {name,category,description,objective,aspect}=guided();
  if (!name.trim()) { $('product-name').focus();note('Confirme o nome do produto para escolher o estilo.');return false; }
  const subject=[name.trim(),category.trim(),description.trim(),objectives[objective]].filter(Boolean).join('. ');
  if (draft.subject!==subject || draft.assemblyAspect!==aspect) {
    draft.subject=subject;draft.assemblyAspect=aspect;$('subject').value=subject;update();
  }
  return true;
}
function prepareBoard() {
  if (draft.creative) return requestCreative('storyboard');
  const settings=guided();
  if (!settings.style || !Object.hasOwn(styleOptions(),settings.style)) return note('Selecione um estilo para montar o storyboard.');
  if (!sameBoard()) {
    const boardSettings={...settings,name:draft.origin==='link'?settings.name.trim():draft.subject.slice(0,120),
      duration:durations.includes(settings.duration)?settings.duration:15};
    const recipe=currentRecipe();
    draft.scenes=makeBoard(boardSettings,unique);
    if (recipe) {
      const style=styleOptions()[settings.style];
      draft.scenes.forEach((scene,index)=>{
        scene.title=recipe.beats[index];
        const shot=scene.shots[0];
        shot.direction=`${scene.title} em um vídeo sobre ${draft.subject.trim()}. ${style.mood}.`;
        shot.overlay='';
        shot.generateSupport=recipeCanGenerateClip(recipe.id);
      });
    }
    settings.boardKey=boardKey();settings.boardStyle=settings.style;
    delete draft.sampleSceneId;
    delete draft.assemblySample;
    renderScenes();update();
  }
  showPlanningStep(storyboardIndex);note('');
}

function showPlanningStep(index,{focus=true}={}) {
  if (draft.mode!=='create' || !planningPanels[index]) return;
  if (index===3 && !recipeCanGenerateClip(currentRecipe()?.id)) index=2;
  $('grid').dataset.direction=index<planningIndex?'back':'next';
  $('grid').classList.toggle('planning-motion',focus && index!==planningIndex);
  planningIndex=index;
  planningButtons.forEach((button,i)=>{
    planningPanels[i].hidden=i!==index;
    if (i===index) button.setAttribute('aria-current','step');
    else button.removeAttribute('aria-current');
  });
  const review=!recipeCanGenerateClip(currentRecipe()?.id);
  planningButtons[3].closest('li').hidden=review;
  planningButtons[4].querySelector('span').textContent=review?'4':'5';
  $('planning-prev').disabled=index===0;
  $('planning-next').hidden=index===planningPanels.length-1;
  if (index===1) renderStyles();
  refreshGuided();
  const button=planningButtons[index], nav=button.closest('ol');
  $('planning-feedback').dataset.step=button.dataset.step;
  if (nav.scrollWidth>nav.clientWidth) {
    const delta=button.getBoundingClientRect().left-nav.getBoundingClientRect().left;
    nav.scrollLeft+=delta-(nav.clientWidth-button.offsetWidth)/2;
  }
  if (focus) {
    const heading=planningPanels[index].querySelector('h2');
    heading.focus({preventScroll:true});
    $('planning-header').scrollIntoView({block:'start'});
  }
  if (draft.planningStep!==button.dataset.step) {
    draft.planningStep=button.dataset.step;
    save();
  }
  if (button.dataset.step==='delivery') void refreshDeliveryLinks();
}
planningButtons.forEach((button,index)=>{button.onclick=()=>{
  if ((index===1 || (currentRecipe() && index===storyboardIndex)) && !confirmOrigin()) return showPlanningStep(0);
  if (draft.creative && index>=storyboardIndex && !sameBoard()) {
    showPlanningStep(creativeUI.originReady({silent:true})?1:0);note('Revise o objetivo e monte o storyboard atual.');return;
  }
  if (currentRecipe() && index===storyboardIndex && !draft.scenes.length) return prepareBoard();
  showPlanningStep(index);
};});
$('planning-prev').onclick=()=>{
  if (draft.creative && planningIndex===1 && creativeUI.previousDirection()) return;
  showPlanningStep(planningIndex===4 && !recipeCanGenerateClip(currentRecipe()?.id)?2:planningIndex-1);
};
$('planning-next').onclick=()=>{
  if (planningIndex===0 && !confirmOrigin()) return;
  if (planningIndex===1) return draft.creative?creativeUI.nextDirection():prepareBoard();
  if (draft.creative && planningIndex===storyboardIndex) {
    if (!sameBoard()) {note('Conclua a revisão antes de avançar.');return;}
    draft.creative.approvedBoardKey=boardKey();save();
  }
  showPlanningStep(planningIndex===2 && !recipeCanGenerateClip(currentRecipe()?.id)?4:planningIndex+1);
};

function showWorkspace() {
  $('workspace-title').textContent = currentRecipe()?.name ?? (draft.mode === 'edit' ? editTitle : createTitle);
  $('request').textContent=currentRecipe()?'Baixar plano de produção':'Baixar pedido';
  $('handoff-detail').hidden=true;
  $('choose').hidden=true;$('workspace').hidden=false;
  const creating=draft.mode==='create';
  $('creative-review-notes').hidden=!draft.creative;
  $('grid').classList.toggle('planning',creating);
  $('planning-header').hidden=$('planning-footer').hidden=$('planning-feedback').hidden=!creating;
  (creating?$('planning-header'):$('edit-pilot')).append($('pilot'));
  (creating?$('planning-feedback'):$('edit-feedback')).append($('work-feedback'));
  $('edit-section').hidden=$('edit-actions').hidden=creating;
  if (creating) {
    renderOrigin();
    const savedIndex=planningButtons.findIndex(button=>button.dataset.step===draft.planningStep);
    showPlanningStep(savedIndex<0 && draft.planningStep==='materials'?storyboardIndex:Math.max(0,savedIndex),{focus:false});
  } else {
    for (const panel of planningPanels) panel.hidden=panel.dataset.planStep!=='delivery';
    void refreshDeliveryLinks();
  }
  $('workspace-title').focus();
  $('subject').value=draft.subject;
  $('analysis-url').value=draft.analysisUrl || '';
  for (const key of ['captions','separate','cuts','treatment']) $(key).checked=draft[key];
  for (const key of ['balance','denoise']) $(key).checked=draft.finish[key];
  for (const key of ['brightness','contrast','saturation']) $(key).value=draft.finish[key];
  $('permit').checked=Boolean(draft.permission);
  initializeCuts();
  renderScenes();
  renderAnalysisFiles();
  const source=draft.materials.find(item=>item.kind==='source');
  if (source && files.has(source.id) && !previewUrl) openPreview(files.get(source.id));
  refresh();
  if (lastJob?.project === draft.id && token && !task) void runTask(lastJob.kind, true);
}
function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  editVideo.removeAttribute('src');
  editVideo.load();
  showEditSource(false);
  captureEditFrame(editVideo,false);
  $('editor-source-error').hidden=true;
  $('source').value = '';
  $('srt').value = '';
  $('transcript').value = '';
  $('cut-suggestions').replaceChildren();
}
function openMode(mode,{entry,recipe}={}) {
  const key=recipe?'recipe-'+recipe.id:mode;
  if (!draft || draftKey(draft)!==key) {
    clearPreview();
    draft = savedDrafts[key] ?? newDraft(mode);
    if (mode==='create' && !savedDrafts[key]) draft.creative={source:entry==='link'||recipe?.group==='loja'?'link':'idea',origin:'product',substep:'catalog'};
    if (recipe && !draft.recipe) {
      draft.recipe={id:recipe.id,goal:recipe.goal,media:[]};
      draft.assemblyAspect='9:16';
      const style=recipePreviews[recipe.preview].style;
      Object.assign(guided(),{style,recommended:style,duration:recipe.duration || 15});
    }
    lastJob = savedJobs[draft.id] ?? null;
    proposal = null;
    $('analysis-url').value='';
    $('analysis-result').replaceChildren();
    $('analysis-permit').checked=false;
    $('proposal').hidden = $('results').hidden = true;
    note('');
    $('resume-draft').hidden = false;
    save();
  }
  if (entry==='link') {
    draft.origin='link';draft.planningStep='idea';
    if (draft.creative && draft.creative.source!=='link' && !draft.creative.result) draft.creative.source='link';
    save();
  }
  showWorkspace();
}
for (const button of document.querySelectorAll('[data-mode]')) button.onclick=()=>openMode(button.dataset.mode,{entry:button.dataset.entry});
setupRecipes(recipe=>recipe.route==='edit'?openMode('edit'):openMode('create',{recipe}),download);
document.querySelector('[data-back]').onclick = () => {
  if (task) return note('Cancele a operação antes de trocar de projeto.');
  editVideo.pause();
  pauseEditAudio();
  $('workspace').hidden=true;$('choose').hidden=false;
  document.querySelector('[data-mode]').focus();
};
$('resume-draft').onclick = showWorkspace;
for (const key of ['captions','separate','cuts','treatment']) $(key).onchange = () => {
  draft[key]=$(key).checked;
  if (key === 'cuts' && !draft.cuts) setPreview(-1);
  if (key === 'captions') draft.permission = false;
  update();
};
for (const key of ['balance','denoise','brightness','contrast','saturation']) $(key).oninput = () => {
  draft.finish[key]=$(key).type==='checkbox'?$(key).checked:Number($(key).value);
  $('treatment').checked=draft.treatment=true;
  update();
};
$('editor-soft-preset').onclick=()=>{
  for (const [key,value] of Object.entries(softImage)) $(key).value=draft.finish[key]=value;
  $('treatment').checked=draft.treatment=true;
  update();
};
editVideo.onloadedmetadata=()=>setPreview(previewIndex);
const refreshEditFrame=()=>{
  if (draft?.mode!=='edit' || !previewUrl || editVideo.readyState<2) return;
  captureEditFrame(editVideo);
  refreshEditTreatment(draft.finish,draft.treatment,false);
};
editVideo.onloadeddata=editVideo.onseeked=editVideo.onpause=refreshEditFrame;
editVideo.onerror=()=>{
  if (!previewUrl) return;
  showEditSource(false);
  captureEditFrame(editVideo,false);
  $('editor-source-error').textContent='Este formato não abriu na prévia. Você ainda pode salvar o pedido de edição.';
  $('editor-source-error').hidden=false;
};
$('subject').oninput=()=>{draft.subject=$('subject').value;update();};
$('add-scene').onclick=()=>{
  if (draft.scenes.length>=16) return note('Limite de 16 cenas por ficha.');
  draft.scenes.push({id:unique(),title:'',narration:'',shots:[newShot()]});
  renderScenes();
  $('scenes').lastElementChild.querySelector('input').focus();
  update();
};

function selectFiles(kind, picked, single) {
  const batch = Array.from(picked);
  const unknown = batch.some(file => !file.size || file.size > (kind==='subtitle'?limits.subtitleBytes:limits.videoBytes) ||
    (['source','take'].includes(kind)&&!supportedVideo.test(file.name)) ||
    (kind==='subtitle'&&!/\.srt$/i.test(file.name)));
  if (unknown) throw new Error(kind==='subtitle' ? 'Envie um SRT de até 2 MiB.' : 'Confira formato, tamanho e arquivos vazios.');
  if (!batch.length) return;
  if (!single && draft.materials.length+batch.length>24) throw new Error('Limite de 24 arquivos por ficha.');
  for (const file of batch) {
    const old=draft.materials.find(item=>item.kind===kind && item.name===file.name && item.bytes===file.size);
    const entry = old ?? {id:unique(),kind,name:file.name,bytes:file.size};
    if (old && files.has(old.id) && !single) continue;
    if (single) {
      for (const item of draft.materials.filter(item=>item.kind===kind && item.id!==entry.id)) files.delete(item.id);
      draft.materials=draft.materials.filter(item=>item.kind!==kind);
    }
    if (single || !old) draft.materials.push(entry);
    files.set(entry.id,file);
  }
  if (kind === 'source') {
    openPreview(batch[0]);
    $('cut-suggestions').replaceChildren();
  }
  if (single) draft.permission=false;
  renderScenes();
  draft.analysisPermit=false;
  renderAnalysisFiles();
  update();
}
function openPreview(file) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl=URL.createObjectURL(file);
  $('editor-source-error').hidden=true;
  captureEditFrame(editVideo,false);
  editVideo.src=previewUrl;
  showEditSource(true);
  setPreview(-1);
}
for (const [control,kind,single] of [['source','source',true],['srt','subtitle',true],['reference-files','reference',false],['takes','take',false]]) {
  $(control).onchange=()=>{try {selectFiles(kind,$(control).files,single);note('');} catch(e) {note(e.message);$(control).value='';}};
}
$('permit').onchange=()=>{draft.permission=$('permit').checked;update();};

$('suggest-cuts').onclick=async()=>{
  const video=$('preview'), file=$('transcript').files[0], source=previewUrl;
  try {
    if (!source || !Number.isFinite(video.duration)) throw new Error('Envie um vídeo que possa ser aberto na prévia para conferir os tempos.');
    if (!file || !/\.srt$/i.test(file.name) || !file.size || file.size>limits.subtitleBytes) throw new Error('Envie uma transcrição SRT de até 2 MiB.');
    const cuts=suggestCuts(readSrt(await file.text(),video.duration)), list=$('cut-suggestions');
    if (previewUrl!==source) return;
    list.replaceChildren();
    cuts.forEach(({start,end,text,reason},index)=>{
      const item=document.createElement('li');
      item.textContent=`${start}–${end} s · ${text} ${reason} `;
      const button=action('Usar no corte '+(index+1),()=>{
        draft.cuts=true;
        $('cuts').checked=true;
        Object.assign(draft.ranges[index],{start:String(start),end:String(end)});
        initializeCuts();
        update();
        note('Tempos copiados para o corte '+(index+1)+'.');
      });
      item.append(button);
      list.append(item);
    });
    note(cuts.length ? 'Revise as sugestões e marque os três cortes.' : 'O SRT não tem trechos de fala que possam ser sugeridos.');
  } catch(error) { note(error.message); }
};

function download(name, content, type='text/plain') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content],{type}));
  const link = document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const withPlan = callback => async () => {
  try { await callback(validateProject(draftPlan())); }
  catch(error) { note(error.message);$('status').focus(); }
};
$('sheet').onclick=withPlan(plan=>download('projeto-video.json',JSON.stringify(plan,null,2)+'\n','application/json'));
$('request').onclick=withPlan(plan=>download('pedido.txt',describeProject(plan)+'\n'));
$('zip').onclick=withPlan(async plan=>{
  const {writeZipTo} = await import('./zapvideo-zip.mjs');
  const json = value => new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'});
  const selected = $('include-files').checked ? requireSelected(plan) : [];
  const manifest = selected.map(({id,file})=>({id,name:file.name,filename:id+'--'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}));
  const entries = [['pedido.txt',new Blob([describeProject(plan)+'\n'])],['projeto-video.json',json(plan)],
    ['arquivos-recebidos.json',json(manifest)],['referencias.json',json(plan.materials.filter(item=>item.kind==='reference'))],
    ...selected.map(({file},i)=>[manifest[i].filename,file])];
  const bytes = entries.reduce((sum,[,file])=>sum+file.size,0);
  if (bytes > 2*1024**3) throw new Error('O ZIP aceita até 2 GiB. Baixe a ficha e mantenha os originais no computador.');
  if (bytes > 128*1024**2 && typeof showSaveFilePicker !== 'function') {
    throw new Error('Este navegador salva ZIP de até 128 MiB. Baixe a ficha e mantenha o original no computador.');
  }
  if (typeof showSaveFilePicker === 'function') {
    const handle = await showSaveFilePicker({suggestedName:'zapvideo.zip',types:[{description:'Arquivo ZIP',accept:{'application/zip':['.zip']}}]});
    await writeZipTo(await handle.createWritable(),entries);
  } else {
    const chunks=[];
    await writeZipTo(new WritableStream({write:chunk=>chunks.push(chunk)}),entries);
    download('zapvideo.zip',new Blob(chunks,{type:'application/zip'}));
  }
  note('ZIP exportado.');
});

async function api(path, {method='GET',body,signal,raw=false} = {}) {
  const headers = token ? {'ZapVideo-Token':token} : {};
  if (body !== undefined) headers['Content-Type']=raw?'application/octet-stream':'application/json';
  const response = await fetch(apiRoot+path,{method,headers,
    body:body===undefined||raw?body:JSON.stringify(body),signal,redirect:'error'});
  if (response.status === 204) return null;
  const result = await response.json().catch(()=>null);
  if (!response.ok || result === null) throw new Error(result?.error || 'Não foi possível conectar. Confira a rede e tente novamente.');
  return result;
}

$('connect').onclick=async()=>{
  token=$('token').value.trim();
  try {
    await api('/session');
    await refreshCapabilities();
    sessionStorage.setItem(accessKey,token);
    $('token').value='';note('Acesso confirmado.');
    void refreshDeliveryLinks();
    if (lastJob?.project === draft.id && !task) void runTask(lastJob.kind,true);
  } catch (error) {
    token='';sessionStorage.removeItem(accessKey);note(error.message);
  }
  refresh();
};

async function upload(projectPath, attachment, signal) {
  const {fileDigest} = await import('./zapvideo-zip.mjs');
  note('Conferindo '+attachment.file.name+'…');
  const sha256 = await fileDigest(attachment.file,signal);
  const path = projectPath+'/uploads';
  const row = await api(path,{method:'POST',body:{materialId:attachment.id,bytes:attachment.file.size,sha256},signal});
  if (row.state === 'ready') return row.id;
  const sent = new Set(row.parts);
  const count = Math.ceil(attachment.file.size/row.partBytes);
  const progress = $('progress');
  progress.hidden=false;progress.max=count;progress.value=sent.size;
  note('Enviando '+attachment.file.name+'…');
  for (let index=0;index<count;index++) {
    if (sent.has(index+1)) continue;
    const blob = attachment.file.slice(index*row.partBytes,(index+1)*row.partBytes);
    await api(path+'/'+row.id+'/parts/'+(index+1),{method:'PUT',raw:true,body:blob,signal});
    progress.value++;
  }
  await api(path+'/'+row.id+'/complete',{method:'POST',signal});
  progress.hidden=true;
  return row.id;
}
async function applyCreativeBoard(result, revision) {
  await creativeUI.getIndex();
  const style=creativeUI.selectedStyle();
  if (!draft.creative || draft.revision!==revision || !style) {
    note('Storyboard de uma revisão anterior. As escolhas atuais foram preservadas.');return;
  }
  draft.scenes=result.proposal.scenes.map((scene,index)=>({...scene,id:unique(),shots:scene.shots.map(shot=>({
    ...shot,id:unique(),layers:[],generateSupport:recipeCanGenerateClip(currentRecipe()?.id),
    example:style.frames[index]?.image,
  }))}));
  guided().catalogBoard={label:style.label,frames:style.frames};
  guided().boardKey=boardKey();
  delete draft.sampleSceneId;delete draft.assemblySample;delete draft.creative.approvedBoardKey;
  $('creative-review-notes').open=false;$('creative-adjustment').value='';
  renderScenes();update();showPlanningStep(storyboardIndex);
  note('Storyboard pronto para revisão.');
}
$('creative-revise').onclick=()=>{
  if (!draft?.creative || task) return;
  const feedback=$('creative-adjustment').value.trim();
  if (!feedback) {note('Diga em uma frase o que quer ajustar.');return;}
  draft.creative.feedback=feedback;
  requestCreative('storyboard');
};
function proposalView(result, revision) {
  proposal = {...result,revision};
  $('proposal-title').textContent=proposal.proposal.title;
  const list=$('proposal-scenes');
  list.replaceChildren(...proposal.proposal.scenes.map(scene=>{
    const item=document.createElement('li');
    item.textContent=[scene.title,scene.narration,...scene.shots.map(shot=>shot.direction+' ('+shot.seconds+' s)')].filter(Boolean).join(' · ');
    return item;
  }));
  $('apply-proposal').disabled=draft.revision!==revision;
  $('proposal').hidden=false;
  note(draft.revision===revision ? 'Revise a proposta antes de usar.' : 'A proposta é de uma revisão anterior. Suas edições foram preservadas.');
}
$('apply-proposal').onclick=()=>{
  if (!proposal || proposal.revision!==draft.revision) return;
  const recipe=currentRecipe(),settings=guided(),style=recipe && recipeStyles[settings.style];
  draft.scenes=proposal.proposal.scenes.map((scene,index)=>({...scene,id:unique(),
    shots:scene.shots.map(shot=>({...shot,id:unique(),layers:[],generateSupport:Boolean(recipe && recipeCanGenerateClip(recipe.id)),
      ...(style?{example:style.frames[index%style.frames.length]}:{})}))}));
  if (style) {
    settings.boardKey=boardKey();
    settings.boardStyle=settings.style;
    delete draft.sampleSceneId;
    delete draft.assemblySample;
  } else {
    delete settings.boardKey;
    delete settings.boardStyle;
  }
  $('proposal').hidden=true;
  proposal=null;
  renderScenes();
  update();
  showPlanningStep(storyboardIndex);
  note('');
};
async function showResults(projectPath, job, signal) {
  const container=$('files');
  container.replaceChildren();
  $('results').hidden=false;
  if (job.kind==='assembly' && job.result.phase==='sample') {
    draft.assemblySample={id:job.id,sha256:job.result.outputs[0].sha256};
    save();
    refreshAssembly();
  }
  const ending = job.revision === draft.revision ? '' : ' Os arquivos são de uma revisão anterior.';
  const label=job.kind==='assembly'?(job.result.phase==='sample'?'Amostra integrada verificada.':'Montagem completa verificada.'):
    job.result.mode==='mock'?(job.kind==='clip'?'Clipe simulado verificado.':'Material simulado verificado.'):'Arquivo(s) verificado(s).';
  note(label+(job.kind==='asset'?' Revise a prévia.':' Assista e confira o áudio.')+ending);
  for (const output of job.result.outputs) {
    const row=document.createElement('div');
    const link=document.createElement('a');
    const grant=await api(projectPath+'/jobs/'+job.id+'/grant',{method:'POST',body:{file:output.id},signal});
    if (output.type==='video/mp4') {
      const video=document.createElement('video');
      video.controls=true;video.playsInline=true;video.preload='metadata';video.src=grant.url;
      row.append(video);
    } else if (output.type.startsWith('image/')) {
      const preview=document.createElement('img');
      preview.src=grant.url;preview.alt='Prévia do quadro conceitual';
      row.append(preview);
    } else if (output.type.startsWith('audio/')) {
      const audio=document.createElement('audio');
      audio.controls=true;audio.preload='metadata';audio.src=grant.url;
      row.append(audio);
    }
    link.href=grant.url+'?download=1';link.textContent='Baixar '+output.name;
    row.append(link);container.append(row);
    if (job.kind==='asset') row.append(action('Adicionar aos materiais',()=>useAsset(job,output,grant)));
    if (job.kind==='clip') {
      row.append(action(job.result.mode==='mock'?'Vincular clipe simulado ao plano':'Vincular ao plano',()=>{
        if (job.revision!==draft.revision) return note('O plano mudou desde esta prévia. Confira a revisão antes de vincular outro clipe.');
        const scene=draft.scenes.find(scene=>scene.id===job.result.sceneId);
        const shot=scene?.shots.find(shot=>shot.id===job.result.shotId);
        if (!shot) return note('O plano deste clipe não está na ficha.');
        shot.selectedClip={jobId:job.id,sha256:output.sha256,mode:job.result.mode,revision:job.revision};
        renderScenes();
        update();
        note(job.result.mode==='mock'?'Clipe simulado vinculado ao plano.':'Clipe vinculado ao plano.');
      }));
    }
  }
}

function deliveryOutput(projectPath, revision, jobId, output) {
  const row=document.createElement('article');
  const heading=document.createElement('h3');
  heading.textContent=output.label+' · revisão '+revision;
  const player=document.createElement('video');
  player.controls=true;player.playsInline=true;player.preload='metadata';player.hidden=true;
  player.setAttribute('aria-label',output.label);
  const controls=document.createElement('div');
  controls.className='button-row';
  const report=document.createElement('p');
  report.className='small';report.setAttribute('role','status');
  let currentLink=output.link;
  const preview=action('Revisar vídeo',async()=>{
    preview.disabled=true;
    try {
      const url=currentLink?.expiresAt===null ? currentLink.url+'video.mp4' :
        (await api(projectPath+'/jobs/'+jobId+'/grant',{method:'POST',body:{file:output.id}})).url;
      if (!row.isConnected) return;
      player.src=url;player.hidden=false;
      player.focus();
    } catch (error) { report.textContent=error.message; }
    finally {preview.disabled=false;}
  });
  const linkControls=document.createElement('div');
  const linkActions=document.createElement('div');
  linkActions.className='button-row';
  const field=document.createElement('input');
  field.type='url';field.readOnly=true;field.setAttribute('aria-label','Link de entrega de '+output.label.toLowerCase());
  const open=document.createElement('a');
  open.textContent='Abrir página';open.target='_blank';open.rel='noopener noreferrer';
  const copy=action('Copiar link',async()=>{
    try { await navigator.clipboard.writeText(field.value);report.textContent='Link copiado.'; }
    catch { field.focus();field.select();report.textContent='Link selecionado para copiar.'; }
  });
  const validity=document.createElement('label');
  validity.textContent='Validade do link';
  const validityChoice=document.createElement('select');
  validityChoice.append(new Option('Temporário','temporary'),new Option('Sem validade','permanent'));
  validity.append(validityChoice);
  const expires=document.createElement('p');
  expires.className='small';
  const setLink=link=>{
    currentLink=link;
    generate.hidden=Boolean(link);linkControls.hidden=!link;
    validity.hidden=Boolean(link);
    makePermanent.hidden=!link || link.expiresAt===null;
    field.value=link?new URL(link.url,location.origin).href:'';
    if (link) open.href=field.value;
    else open.removeAttribute('href');
    expires.textContent=link?.expiresAt===null ? 'Link sem validade.' :
      'Disponível até '+new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'})
        .format((link?.expiresAt??output.expiresAt)*1000)+'.';
  };
  const createLink=async permanent=>{
    generate.disabled=makePermanent.disabled=revoke.disabled=true;
    report.textContent='';
    try {
      const link=await api(projectPath+'/deliveries',{method:'POST',body:{jobId,fileId:output.id,sha256:output.sha256,permanent}});
      if (!row.isConnected) return void refreshDeliveryLinks();
      setLink(link);field.focus();field.select();
      report.textContent=link.expiresAt===null?'Link sem validade pronto.':'Link de entrega criado.';
    } catch (error) {report.textContent=error.message;}
    finally {generate.disabled=makePermanent.disabled=revoke.disabled=false;}
  };
  const generate=action('Gerar link de entrega',()=>createLink(validityChoice.value==='permanent'));
  generate.className='primary';
  const makePermanent=action('Tornar link sem validade',()=>createLink(true));
  const revoke=action('Desativar link',async()=>{
    if (!currentLink || !window.confirm('Desativar este link de entrega? Quem já o recebeu perderá o acesso.')) return;
    revoke.disabled=makePermanent.disabled=true;
    try {
      const code=currentLink.url.split('/')[2];
      await api(projectPath+'/deliveries/'+code,{method:'DELETE'});
      if (!row.isConnected) return void refreshDeliveryLinks();
      if (output.expiresAt*1000<=Date.now()) return void refreshDeliveryLinks();
      setLink(null);generate.focus();report.textContent='Link desativado.';
    } catch (error) {report.textContent=error.message;}
    finally {revoke.disabled=makePermanent.disabled=false;}
  });
  controls.append(preview,generate);
  linkActions.append(copy,open,makePermanent,revoke);
  linkControls.append(field,linkActions);
  row.append(heading,expires,player,validity,controls,linkControls,report);
  setLink(currentLink);
  return row;
}

async function refreshDeliveryLinks() {
  const section=$('delivery-links-list');
  if (!draft || $('delivery-title').closest('[hidden]')) return;
  deliveryLookup?.abort();
  const status=$('delivery-links-status');
  const project=draft.id, projectPath='/projects/'+project;
  section.replaceChildren();
  if (!token) {
    status.textContent='Conecte o piloto para ver as entregas deste projeto.';
    return;
  }
  if (lastJob?.project!==project) {
    status.textContent='Após concluir o vídeo online, gere aqui o link para assistir e baixar.';
    return;
  }
  const controller=new AbortController();
  deliveryLookup=controller;
  status.textContent='Consultando vídeos concluídos…';
  try {
    const {deliveries}=await api(projectPath+'/deliveries',{signal:controller.signal});
    if (controller.signal.aborted || project!==draft.id) return;
    if (!deliveries.length) {
      status.textContent='Após concluir o vídeo online, gere aqui o link para assistir e baixar.';
      return;
    }
    status.textContent=(deliveries[0].revision!==draft.revision?'O último vídeo verificado é de uma revisão anterior. ':'')+
      'Gere o link após revisar a imagem e o áudio. Quem tiver o link poderá assistir e baixar.';
    section.append(...deliveries.flatMap(({jobId,revision,outputs})=>outputs.map(output=>
      deliveryOutput(projectPath,revision,jobId,output))));
  } catch (error) {
    if (!controller.signal.aborted && project===draft.id) status.textContent=error.message;
  }
}
function showAnalysis(state) {
  const list=$('analysis-result');
  list.replaceChildren(...state.result.analysis.map(source=>{
    const item=document.createElement('li');
    item.textContent=source.label+' · '+source.note;
    return item;
  }));
  note(state.revision===draft.revision ? 'Análise disponível. Revise as observações por fonte.' :
    'Análise da revisão anterior. Suas edições foram preservadas.');
}
$('analysis-url').oninput=()=>{draft.analysisUrl=$('analysis-url').value;draft.analysisPermit=false;update();};
$('analysis-permit').onchange=()=>{draft.analysisPermit=$('analysis-permit').checked;update();};
$('analyze').onclick=()=>runTask('analysis');
async function runTask(kind, resume=false, clipQuote=null) {
  if (task) return;
  if (!token) {
    $('pilot').open=true;$('token').focus();note('Informe seu código de acesso para usar o piloto.');return;
  }
  const controller=new AbortController(),signal=controller.signal;
  task=controller;
  creativeUI.refresh();
  $('stop').hidden=false;$('produce').disabled=$('suggest').disabled=$('analyze').disabled=true;
  $('read-product').disabled=true;
  try {
    const projectPath='/projects/'+draft.id;
    if (resume && lastJob?.id) job=lastJob;
    else {
      // User can keep editing while the immutable snapshot is sent.
      const form=draftPlan(),productUrl=kind==='brief'?clipQuote?.productUrl:undefined;
      const operation=kind==='brief'?clipQuote?.operation:undefined;
      if (productUrl && !form.intent.subject.trim()) form.intent.subject='Identificar produto pela página pública';
      const plan=structuredClone(validateProject(form));
      const agreedMicros=kind==='brief'?(productUrl?clipQuote.agreedMicros:capabilities.briefReservedMicros):undefined;
      if (!productUrl && agreedMicros>0) {
        const purpose=operation==='storyboard'?'enviar suas escolhas e preparar o storyboard':
          operation==='objectives'?'enviar o ponto de partida e sugerir objetivos':'pedir uma proposta';
        if (!window.confirm('Confirma a reserva de '+briefPrice(agreedMicros)+' para '+purpose+' com o Gemini?')) return;
      }
      if (kind==='edit' && !$('permit').checked) throw new Error('Autorize o envio dos arquivos para processar online.');
      let selected=kind==='edit'?requireSelected(plan):[];
      if (kind==='assembly') selected=clipQuote?.filesToSend || [];
      let publicAddress;
      if (kind==='analysis') {
        if (!$('analysis-permit').checked) throw new Error('Autorize o uso das fontes selecionadas.');
        publicAddress=$('analysis-url').value.trim();
        if (publicAddress && !$('analysis-url').checkValidity()) throw new Error('Informe um endereço público válido.');
        const sources=plan.materials.filter(item=>draft.analysisIds?.includes(item.id));
        if (sources.length>4 || (!sources.length && !publicAddress)) throw new Error('Selecione até quatro arquivos ou uma página pública.');
        if (sources.reduce((sum,item)=>sum+item.bytes,0)>capabilities.analysisBytes) throw new Error('A análise aceita 8 MiB de arquivos por pedido.');
        selected=requireSelected({materials:sources});
      }
      await api(projectPath,{method:'PUT',body:plan,signal});
      const inputs={};
      for (const attachment of selected) inputs[attachment.id]=await upload(projectPath,attachment,signal);
      let approvalId;
      if (kind==='assembly' && clipQuote?.phase==='full') {
        const review=clipQuote.review;
        const approval=await api(projectPath+'/assembly/approve',{method:'POST',signal,body:{
          revision:plan.revision,seen:true,message:review.message,sampleJob:review.sample.id,sampleSha256:review.sample.sha256,
          storyboard:await presentedObject(review.storyboard,inputs),animatic:await presentedObject(review.animatic,inputs),
        }});
        approvalId=approval.id;
      }
      const body=['clip','asset'].includes(kind)?{kind,revision:plan.revision,quoteId:clipQuote?.id,confirmed:clipQuote?.revision===plan.revision}:
        {kind,revision:plan.revision,inputs,url:publicAddress,phase:clipQuote?.phase,approvalId,agreedMicros,
          ...(productUrl?{productUrl,confirmed:true}:{}),...(operation?{operation,confirmed:true}:{}),
          key:(operation || (productUrl?'product':kind))+(kind==='assembly'?'-'+clipQuote.phase:'')+'-'+plan.revision};
      const started=await api(projectPath+'/jobs',{method:'POST',body,signal});
      job={id:started.id,project:plan.id,kind,revision:plan.revision,...(operation?{operation}:{})};
      lastJob=job;save();
    }
    const path=projectPath+'/jobs/'+job.id;
    note(kind==='assembly'?'Montando o vídeo…':kind==='asset'?'Preparando o material…':kind==='edit'?'Processando o vídeo…':kind==='analysis'?'Analisando as fontes…':
      kind==='clip'?'Processando o clipe…':'Preparando a proposta…');
    while (!signal.aborted) {
      const state=await api(path,{signal});
      if (state.state==='verified') {
        if (['edit','clip','asset','assembly'].includes(kind)) {
          await showResults(projectPath,state,signal);
          if (!resume && (kind==='edit' || (kind==='assembly' && state.result.phase==='full'))) void refreshDeliveryLinks();
        }
        else if (kind==='analysis') showAnalysis(state);
        else if (state.result.creative) {
          if (draft.creative && draft.revision===state.revision) creativeUI.applyObjectives(state.result);
          else note('Objetivos de uma revisão anterior. As escolhas atuais foram preservadas.');
        }
        else if (state.result.product) productView(state.result,state.revision);
        else if (draft.creative && (clipQuote?.operation==='storyboard' || lastJob?.operation==='storyboard'))
          await applyCreativeBoard(state.result,state.revision);
        else proposalView(state.result,state.revision);
        return;
      }
      if (!['queued','processing'].includes(state.state)) {
        note(state.error || (state.state==='cancelled'?'Processamento cancelado.':'Processamento indisponível.'));
        return;
      }
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
  } catch(error) {
    if (!signal.aborted) note(error.message);
  } finally {
    $('progress').hidden=$('stop').hidden=true;
    $('produce').disabled=$('analyze').disabled=false;$('suggest').disabled=capabilities.brief==='unavailable';
    job=null;task=null;
    if (draft.mode==='create') refreshGuided();
  }
}
$('produce').onclick=()=>runTask('edit');
$('suggest').onclick=()=>{if (confirmOrigin()) void runTask('brief');};
$('stop').onclick=async()=>{
  const pending=job;
  task?.abort();
  if (pending) {
    try {await api('/projects/'+pending.project+'/jobs/'+pending.id,{method:'DELETE'});note('Processamento cancelado.');}
    catch (error) {note(error.message);}
  } else note('Envio interrompido. Selecione o mesmo arquivo para retomar.');
};
$('send-handoff').onclick=withPlan(async plan=>{
  const selected=requireSelected(plan);
  const {body,key}=await encryptHandoff(plan,selected,limits.handoffBytes);
  const {id}=await api('/handoff',{method:'PUT',body,raw:true});
  const link=new URL(apiRoot+'/handoff',location.origin);
  link.searchParams.set('id',id);link.hash=key;
  $('handoff-instruction').value=`Use o Studio Kit Pro. Recupere a ficha e os originais com:\nnode scripts/retrieve-disteven-handoff.mjs '${link.href}' projects/zapvideo-recebido\nImporte projeto-video.json e siga os arquivos e os aceites da ficha.`;
  $('handoff-detail').hidden=false;$('handoff-instruction').focus();$('handoff-instruction').select();
  note('Pacote privado disponível por duas horas. Copie a instrução para o Codex ou Claude Code.');
});
const assemblyDialog=$('assembly-dialog');
let reviewUrls=[];
function choiceOptions(select,items,selected,placeholder) {
  select.replaceChildren(new Option(placeholder,''),...items.map(item=>new Option(item.name,item.id)));
  select.value=selected || '';
}
function refreshAssembly() {
  $('assembly-tools').hidden=draft.mode!=='create' || !['local','container'].includes(capabilities.assembly);
  $('assembly-unavailable').hidden=!$('assembly-tools').hidden;
  $('assembly-unavailable').textContent=capabilities.pilotAvailable && !token ?
    'Conecte seu código em Acesso ao piloto para montar neste site.' :
    'Montagem online indisponível. Você pode baixar a ficha e os materiais na etapa Entrega.';
  if ($('assembly-tools').hidden) return;
  $('assembly-aspect').value=draft.assemblyAspect || '9:16';
  choiceOptions($('assembly-music'),draft.materials.filter(item=>item.kind==='audio'),draft.musicMaterialId,'Sem trilha');
  const scenes=draft.scenes.map(scene=>({id:scene.id,name:scene.title||'Cena'}));
  choiceOptions($('assembly-scene'),scenes,draft.sampleSceneId,'Primeira cena');
  $('assembly-captions-note').textContent=displayFile('subtitle','Legendas opcionais.');
  $('assembly-full').disabled=!draft.assemblySample;
}
function setAssemblyValue(key,value) {
  draft[key]=value;
  update();
}
$('assembly-aspect').onchange=()=>setAssemblyValue('assemblyAspect',$('assembly-aspect').value);
$('assembly-scene').onchange=()=>setAssemblyValue('sampleSceneId',$('assembly-scene').value);
$('assembly-music').onchange=()=>setAssemblyValue('musicMaterialId',$('assembly-music').value);
for (const [id,kind,single] of [['assembly-audio','audio',false],['assembly-captions','subtitle',true]]) {
  $(id).onchange=()=>{
    try {
      if (kind==='audio' && [...$(id).files].some(file=>!/\.(?:mp3|wav|m4a|aac)$/i.test(file.name))) throw new Error('Escolha MP3, WAV, M4A ou AAC.');
      selectFiles(kind,$(id).files,single);
      note('');
    } catch (error) {note(error.message);$(id).value='';}
  };
}
function assemblyInputs(phase,evidence=[]) {
  const timeline=assemblyPlan(draftPlan());
  const ids=[...new Set([...timeline.materials.filter(item=>item.kind!=='generated').map(item=>item.id),...evidence])];
  if (JSON.stringify(ids)!==JSON.stringify(draft.assemblyIds)) {
    draft.assemblyIds=ids;
    update();
  }
  const materials=draftPlan().materials.filter(item=>timeline.materials.some(source=>source.id===item.id)||evidence.includes(item.id));
  const filesToSend=requireSelected({materials});
  return {phase,filesToSend};
}
$('assembly-sample').onclick=()=>{
  if (task) return note('Aguarde o trabalho em andamento.');
  if (!token) {
    $('pilot').open=true;$('token').focus();return note('Informe seu código de acesso para montar.');
  }
  if (!$('assembly-permit').checked) return note('Autorize o envio dos materiais selecionados para montar.');
  try {void runTask('assembly',false,assemblyInputs('sample'));}
  catch (error) {note(error.message);}
};
function clearAssemblyReview() {
  for (const url of reviewUrls) URL.revokeObjectURL(url);
  reviewUrls=[];
  for (const id of ['assembly-storyboard-preview','assembly-animatic-preview','assembly-sample-preview']) {
    const preview=$(id);
    if (preview instanceof HTMLVideoElement) preview.pause();
    preview.removeAttribute('src');
    preview.hidden=true;
  }
}
$('assembly-full').onclick=async()=>{
  if (task || !draft.assemblySample || !token) return;
  if (!$('assembly-permit').checked) return note('Autorize o envio dos materiais selecionados para montar.');
  clearAssemblyReview();
  const current=draft.id,sample=draft.assemblySample;
  const eligible=draft.materials.filter(item=>files.has(item.id));
  choiceOptions($('assembly-storyboard'),eligible.filter(item=>/\.(?:png|jpg|jpeg|webp)$/i.test(item.name)),null,'Escolha a prancha');
  choiceOptions($('assembly-animatic'),eligible.filter(item=>['take','source','broll'].includes(item.kind)),null,'Escolha o animatic');
  $('assembly-review-checkbox').checked=false;
  $('assembly-review-message').value='';
  $('assembly-review-status').textContent='Apresente a prancha e o animatic, depois reveja a amostra.';
  assemblyDialog.showModal();
  try {
    const result=await api('/projects/'+current+'/jobs/'+sample.id+'/grant',{method:'POST',body:{file:'montagem'}});
    if (!assemblyDialog.open || draft.id!==current) return;
    $('assembly-sample-preview').src=result.url;
    $('assembly-sample-preview').hidden=false;
  } catch(error) {$('assembly-review-status').textContent=error.message;}
};
for (const [id,element] of [['assembly-storyboard','assembly-storyboard-preview'],['assembly-animatic','assembly-animatic-preview']]) {
  $(id).onchange=()=>{
    $('assembly-review-checkbox').checked=false;
    const file=files.get($(id).value), preview=$(element);
    if (!file) {preview.hidden=true;return;}
    const url=URL.createObjectURL(file);
    reviewUrls.push(url);
    preview.src=url;
    preview.hidden=false;
  };
}
$('assembly-review-close').onclick=()=>assemblyDialog.close();
assemblyDialog.addEventListener('close',clearAssemblyReview);
$('assembly-review-confirm').onclick=async()=>{
  const message=$('assembly-review-message').value;
  const storyboard=$('assembly-storyboard').value,animatic=$('assembly-animatic').value;
  try {
    if (!$('assembly-review-checkbox').checked || !message.trim() || !storyboard || !animatic ||
      $('assembly-animatic-preview').readyState<1 || $('assembly-sample-preview').readyState<1) {
      throw new Error('Abra a prancha, o animatic e a amostra e registre seu aceite.');
    }
    await $('assembly-storyboard-preview').decode();
    if (!assemblyDialog.open || storyboard!==$('assembly-storyboard').value || animatic!==$('assembly-animatic').value ||
      !$('assembly-review-checkbox').checked || message!==$('assembly-review-message').value) throw new Error('A seleção mudou.');
    const command={...assemblyInputs('full',[storyboard,animatic]),review:{storyboard,animatic,message,sample:draft.assemblySample}};
    assemblyDialog.close();
    void runTask('assembly',false,command);
  } catch(error) {$('assembly-review-status').textContent=error.message;}
};
async function presentedObject(id,uploads) {
  const hashed=new Uint8Array(await crypto.subtle.digest('SHA-256',await files.get(id).arrayBuffer()));
  const presentedSha256=Array.from(hashed,byte=>byte.toString(16).padStart(2,'0')).join('');
  return {id,uploadId:uploads[id],presentedSha256};
}

const assetDialog=$('asset-dialog');
const assetLabels={frame:'Quadro conceitual',speech:'Narração da cena',music:'Trilha instrumental'};
let assetPanel=null;
let assetRequest=null;
function openAsset(kind,scene,shot) {
  if (task) return note('Aguarde o trabalho em andamento.');
  if (!token) {
    $('pilot').open=true;
    $('token').focus();
    return note('Informe seu código de acesso para usar o piloto.');
  }
  assetPanel={kind,scene,shot,quote:null};
  $('asset-title').textContent=assetLabels[kind];
  $('asset-input-preview').textContent=kind==='frame'?shotDirection(shot):kind==='speech'?scene.narration:'';
  $('asset-frame-options').hidden=kind!=='frame';
  $('asset-speech-options').hidden=kind!=='speech';
  $('asset-music-options').hidden=kind!=='music';
  $('asset-aspect').value=draft.assemblyAspect || '9:16';
  $('asset-voice').value='Kore';
  $('asset-prompt').value='';
  $('asset-estimate').hidden=true;
  $('asset-status').textContent=capabilities.assets[kind]==='mock'?'Simulação local com mídia sintética.':'Revise o material antes de confirmar.';
  assetDialog.showModal();
}
function resetAssetQuote() {
  if (assetPanel) assetPanel.quote=null;
  $('asset-estimate').hidden=true;
}
for (const key of ['asset-aspect','asset-voice','asset-prompt']) $(key).oninput=resetAssetQuote;
$('asset-close').onclick=()=>assetDialog.close();
assetDialog.addEventListener('close',()=>{
  assetRequest?.abort();
  assetPanel=null;
});
$('asset-quote').onclick=async()=>{
  const panel=assetPanel;
  if (!panel || assetRequest) return;
  const controller=new AbortController(),signal=controller.signal;
  assetRequest=controller;
  resetAssetQuote();
  $('asset-quote').disabled=true;
  try {
    const plan=structuredClone(validateProject(draftPlan()));
    const options=()=>({kind:panel.kind,sceneId:panel.scene?.id,shotId:panel.shot?.id,
      aspect:$('asset-aspect').value,voice:$('asset-voice').value,prompt:$('asset-prompt').value});
    const selection=options(),baseline=JSON.stringify(selection);
    const path='/projects/'+plan.id;
    await api(path,{method:'PUT',body:plan,signal});
    const quote=await api(path+'/assets/quote',{method:'POST',body:{revision:plan.revision,...selection},signal});
    if (assetPanel!==panel || signal.aborted || baseline!==JSON.stringify(options())) return;
    panel.quote=quote;
    const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:quote.currency,minimumFractionDigits:2,maximumFractionDigits:6});
    $('asset-value').textContent=[quote.model,quote.scope.aspect,quote.scope.voice,quote.scope.seconds && quote.scope.seconds+' s',
      (quote.mode==='mock'?'Simulação sem cobrança':'Reserva estimada')+' '+money.format(quote.reservedMicros/1e6)].filter(Boolean).join(' · ');
    $('asset-confirm-content').textContent=quote.scope.input;
    $('asset-estimate').hidden=false;
    $('asset-confirm').focus();
    $('asset-status').textContent='Confira o conteúdo e confirme o pedido.';
  } catch(error) {
    if (!signal.aborted) $('asset-status').textContent=error.message;
  } finally {
    if (assetRequest===controller) assetRequest=null;
    $('asset-quote').disabled=false;
  }
};
$('asset-confirm').onclick=()=>{
  const quote=assetPanel?.quote;
  if (!quote || quote.revision!==draft.revision || Date.now()/1000>=quote.expires) {
    $('asset-status').textContent='A estimativa mudou ou expirou. Solicite outra.';
    return;
  }
  assetDialog.close();
  void runTask('asset',false,quote);
};
$('asset-music').onclick=()=>openAsset('music');

async function useAsset(job,output,grant) {
  const revision=draft.revision,project=draft.id;
  if (job.revision!==revision) return note('Este material é de uma revisão anterior.');
  if (draft.materials.length>=24) return note('Limite de 24 materiais por ficha.');
  try {
    const response=await fetch(grant.url,{redirect:'error'});
    if (!response.ok || Number(response.headers.get('Content-Length'))!==output.bytes) throw new Error('O acesso ao material expirou.');
    const bytes=await response.arrayBuffer();
    const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    if (actual!==output.sha256 || bytes.byteLength!==output.bytes) throw new Error('O arquivo baixado diverge da prévia verificada.');
    if (draft.revision!==revision || draft.id!==project) throw new Error('A ficha mudou durante o download.');
    const name=output.name.replace('-previa',job.result.mode==='mock'?'-simulado-'+job.id.slice(0,8):'-'+job.id.slice(0,8));
    const file=new File([bytes],name,{type:output.type});
    const kind=job.result.mediaKind==='frame'?'frame':'audio';
    const record={id:unique(),name,kind,bytes:file.size,origin:{jobId:job.id,mode:job.result.mode,sha256:output.sha256}};
    files.set(record.id,file);
    draft.materials.push(record);
    if (job.result.mediaKind==='speech') {
      const scene=draft.scenes.find(item=>item.id===job.result.sceneId);
      if (scene) scene.narrationMaterialId=record.id;
    } else if(job.result.mediaKind==='music') draft.musicMaterialId=record.id;
    else {
      const shot=draft.scenes.find(scene=>scene.id===job.result.sceneId)?.shots.find(item=>item.id===job.result.shotId);
      if (shot?.example) shot.referenceFrameId=record.id;
    }
    renderScenes();
    renderAnalysisFiles();
    update();
    note(kind==='frame'?'Quadro adicionado aos materiais. Abra o plano para revisá-lo e aprová-lo.':'Áudio adicionado aos materiais.');
  } catch(error) {
    note(error.message);
  }
}

let clipPanel=null, clipRequest=null, frameUrl;
const clipDialog=$('clip-dialog');
function resetClipQuote() {
  if (clipPanel) clipPanel.quote=null;
  $('clip-quote-section').hidden=true;
}
function resetClipFrame() {
  if (frameUrl) URL.revokeObjectURL(frameUrl);
  frameUrl=null;
  if (clipPanel) clipPanel.visibleFrame=null;
  $('clip-frame-preview').removeAttribute('src');
  $('clip-frame-preview').hidden=true;
  $('clip-seen').checked=false;
  $('clip-approve').disabled=true;
  resetClipQuote();
}
function openClip(scene,shot) {
  if (task) return note('Aguarde o trabalho em andamento.');
  if (!token) {
    $('pilot').open=true;
    $('token').focus();
    return note('Informe seu código de acesso para usar o piloto.');
  }
  const key=scene.id+':'+shot.id;
  const previous=draft.clipApprovals?.[key];
  clipPanel={scene,shot,key};
  resetClipFrame();
  $('clip-scope').textContent=[scene.title,shotDirection(shot)].filter(Boolean).join(' · ');
  $('clip-mode').textContent=capabilities.clip==='mock'?'Simulação local com vídeo de teste.':
    'O Google recebe somente o quadro selecionado e a descrição deste plano.';
  $('clip-aspect').value=shot.example?(draft.assemblyAspect || '9:16'):(previous?.aspect || '9:16');
  $('clip-message').value='';
  $('clip-status').textContent='';
  const choices=draft.materials.filter(item=>['reference','frame'].includes(item.kind) && files.has(item.id) &&
    /\.(?:png|jpeg|jpg|webp)$/i.test(item.name) && item.bytes<=capabilities.clipFrameMaxBytes);
  $('clip-frame').replaceChildren(new Option('Escolha o quadro',''),...choices.map(item=>new Option(item.name,item.id)));
  $('clip-reuse').hidden=!previous;
  $('clip-reuse').disabled=false;
  if (!choices.length) $('clip-status').textContent='Adicione uma imagem de referência de até 2 MiB no projeto.';
  clipDialog.showModal();
  if (choices.some(item=>item.id===shot.referenceFrameId)) {
    $('clip-frame').value=shot.referenceFrameId;
    void $('clip-frame').onchange();
  }
}
$('clip-frame').onchange=async()=>{
  resetClipFrame();
  const id=$('clip-frame').value, file=files.get(id);
  if (!file || !clipPanel) return;
  const panel=clipPanel,url=URL.createObjectURL(file), preview=$('clip-frame-preview');
  frameUrl=url;
  preview.src=url;
  preview.hidden=false;
  try {
    await preview.decode();
    if (frameUrl!==url || panel!==clipPanel) return;
    panel.visibleFrame={id,file,url};
    $('clip-status').textContent='Confira o enquadramento mostrado antes de aprovar.';
    $('clip-approve').disabled=false;
  } catch {
    if (frameUrl!==url || panel!==clipPanel) return;
    resetClipFrame();
    $('clip-status').textContent='Não foi possível abrir o quadro escolhido.';
  }
};
$('clip-aspect').onchange=()=>{
  $('clip-seen').checked=false;
  resetClipQuote();
};
$('clip-close').onclick=()=>clipDialog.close();
clipDialog.addEventListener('close',()=>{
  clipRequest?.abort();
  resetClipFrame();
  clipPanel=null;
});
async function showQuote(projectPath,revision,approvalId,signal) {
  const panel=clipPanel;
  const choice=$('clip-frame').value,aspect=$('clip-aspect').value;
  const quote=await api(projectPath+'/clips/quote',{method:'POST',body:{revision,approvalId},signal});
  if (!panel || panel!==clipPanel || $('clip-frame').value!==choice || $('clip-aspect').value!==aspect || quote.aspect!==aspect) return;
  clipPanel.quote={...quote,revision};
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:quote.currency,minimumFractionDigits:2,maximumFractionDigits:6});
  const cost=money.format(quote.reservedMicros/1e6);
  $('clip-quote').textContent=`${quote.scene} · ${quote.direction} · Quadro ${quote.frameName} · ${quote.seconds} s · ${quote.aspect} · ${quote.resolution} · ${quote.model} · ${quote.mode==='mock'?'Simulação, sem cobrança':'Reserva estimada'} ${cost}`;
  $('clip-quote-section').hidden=false;
  $('clip-status').textContent='Confira o escopo e o valor. A confirmação da geração é separada.';
  $('clip-confirm').focus();
}
async function clipAction(reuse) {
  if (!clipPanel || clipRequest) return;
  const panel=clipPanel, controller=new AbortController(), signal=controller.signal;
  clipRequest=controller;
  $('clip-approve').disabled=$('clip-reuse').disabled=true;
  resetClipQuote();
  try {
    const path='/projects/'+draft.id;
    let approvalId;
    if (reuse) {
      const prior=draft.clipApprovals?.[panel.key];
      if (!prior || prior.aspect!==$('clip-aspect').value) throw new Error('A proporção mudou. Apresente e aprove o novo quadro.');
      const current=$('clip-frame').value || panel.shot.referenceFrameId;
      if (current && current!==prior.frameId) throw new Error('O quadro mudou. Apresente e aprove a nova imagem.');
      approvalId=prior.id;
    } else {
      const present=panel.visibleFrame, message=$('clip-message').value;
      if (!present || !$('clip-seen').checked || !message.trim()) throw new Error('Veja o quadro, marque a conferência e registre seu aceite.');
      const aspect=$('clip-aspect').value, projectId=draft.id, originalRevision=draft.revision;
      const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await present.file.arrayBuffer())),
        byte=>byte.toString(16).padStart(2,'0')).join('');
      if (signal.aborted || present!==panel.visibleFrame || aspect!==$('clip-aspect').value ||
        message!==$('clip-message').value || !$('clip-seen').checked || draft.id!==projectId || draft.revision!==originalRevision) {
        throw new Error('A seleção mudou. Revise e confirme o quadro novamente.');
      }
      if (!draft.clipFrameIds?.includes(present.id)) {
        draft.clipFrameIds=[...draft.clipFrameIds || [],present.id];
        update();
      }
      const plan=structuredClone(validateProject(draftPlan()));
      await api(path,{method:'PUT',body:plan,signal});
      $('clip-status').textContent='Enviando e conferindo o quadro aprovado…';
      const uploadId=await upload(path,{id:present.id,file:present.file},signal);
      if (present!==panel.visibleFrame || aspect!==$('clip-aspect').value || message!==$('clip-message').value ||
        !$('clip-seen').checked || plan.revision!==draft.revision) throw new Error('O quadro ou o plano mudou. Confirme novamente.');
      const approval=await api(path+'/clips/approve',{method:'POST',signal,body:{
        revision:plan.revision,sceneId:panel.scene.id,shotId:panel.shot.id,frameId:present.id,aspect,uploadId,
        seen:true,presentedSha256:sha256,message,
      }});
      draft.clipApprovals={...draft.clipApprovals,[panel.key]:{...approval,aspect,frameId:present.id}};
      $('clip-reuse').hidden=false;
      save();
      approvalId=approval.id;
    }
    const plan=structuredClone(validateProject(draftPlan()));
    await api(path,{method:'PUT',body:plan,signal});
    await showQuote(path,plan.revision,approvalId,signal);
  } catch(error) {
    if (!signal.aborted) $('clip-status').textContent=error.message;
  } finally {
    if (clipRequest===controller) clipRequest=null;
    $('clip-approve').disabled=!clipPanel?.visibleFrame;
    $('clip-reuse').disabled=false;
    $('progress').hidden=true;
  }
}
$('clip-approve').onclick=()=>clipAction(false);
$('clip-reuse').onclick=()=>clipAction(true);
$('clip-confirm').onclick=()=>{
  const quote=clipPanel?.quote;
  if (!quote || quote.revision!==draft.revision || Date.now()/1000>=quote.expires) {
    return $('clip-status').textContent='A estimativa mudou ou expirou. Solicite outra.';
  }
  clipDialog.close();
  void runTask('clip',false,quote);
};

async function refreshCapabilities() {
  capabilities=await api('/capabilities');
  if (draft?.mode==='create') renderScenes();
  renderAnalysisFiles();
  refresh();
}
void refreshCapabilities().catch(()=>{});
