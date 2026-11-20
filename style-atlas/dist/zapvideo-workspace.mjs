import {describeProject, editOutputs, isId, limits, parseTime, projectFormat, projectVersion,
  supportedVideo, validateProject} from './zapvideo-contract.mjs';
import {encryptHandoff} from './zapvideo-transfer.mjs';
import {readSrt, suggestCuts} from './zapvideo-captions.mjs';
import {assemblyPlan} from './zapvideo-assembly.mjs';

const $ = id => document.getElementById(id);
const storage = 'zapvideo-workspace-v1';
const apiRoot = '/api/zapvideo';
const files = new Map();
const savedDrafts = {};
const savedJobs = {};
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

try {
  const restored = JSON.parse(localStorage.getItem(storage));
  for (const [mode,record] of Object.entries(restored?.drafts || {})) {
    if (['edit','create'].includes(mode) && record?.mode===mode && isId(record.id) && record.version===projectVersion) savedDrafts[mode]=record;
  }
  Object.assign(savedJobs,restored?.jobs || {});
  if (isId(restored?.draft?.id) && restored.draft.version === projectVersion) {
    draft = savedDrafts[restored.draft.mode] ?? restored.draft;
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
  savedDrafts[draft.mode]=draft;
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
function draftPlan() {
  const analysisIds=new Set(draft.analysisIds || []);
  const assemblyIds=new Set(draft.assemblyIds || []);
  return {format:projectFormat,version:projectVersion,id:draft.id,revision:draft.revision,
    intent:{mode:draft.mode,subject:draft.mode === 'create' ? draft.subject : ''},
    materials:draft.materials.filter(item => draft.mode === 'create' || item.kind !== 'subtitle' || draft.captions)
      .map(item => ({...item,permission:(draft.mode==='edit' && draft.permission) ||
        (draft.mode==='create' && ((draft.analysisPermit && analysisIds.has(item.id)) || draft.clipFrameIds?.includes(item.id) ||
          assemblyIds.has(item.id))) ? 'process' : 'local'})),
    actions:{captions:draft.captions ? (draft.separate ? 'mp4+srt' : 'mp4') : null,
      cuts:draft.cuts ? draft.ranges.map(cut => ({...cut,start:parseTime(cut.start),end:parseTime(cut.end)})) : [],
      treatment:draft.treatment ? draft.finish : null},
    scenes:draft.scenes,reviewStatus:'pending',...(draft.mode==='create'?{assembly:{aspect:draft.assemblyAspect || '9:16',
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
      draft.materials = draft.materials.filter(value => value.id !== item.id);
      if (draft.musicMaterialId===item.id) delete draft.musicMaterialId;
      for (const scene of draft.scenes) if (scene.narrationMaterialId===item.id) delete scene.narrationMaterialId;
      draft.analysisIds=(draft.analysisIds || []).filter(id=>id!==item.id);
      draft.analysisPermit=false;
      for (const scene of draft.scenes) for (const shot of scene.shots) {
        shot.layers = shot.layers.filter(layer => layer.materialId !== item.id);
      }
      files.delete(item.id);
      renderScenes();
      renderAnalysisFiles();
      update();
    };
    row.append(button);
    container.append(row);
  }
}
function refresh() {
  if (!draft) return;
  $('permit').checked = Boolean(draft.permission);
  $('analysis-permit').checked = Boolean(draft.analysisPermit);
  $('captions-fields').hidden = !draft.captions;
  $('cut-fields').hidden = !draft.cuts;
  $('treatment-fields').hidden = !draft.treatment;
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
  $('render-note').textContent = online ? 'Se o envio cair, selecione o mesmo arquivo para retomar.' : 'Edição online indisponível. Use a ficha no Studio Kit Pro.';
  $('suggest').disabled = Boolean(task) || capabilities.brief === 'unavailable';
  $('suggest-note').textContent = capabilities.brief === 'mock' ? 'Proposta simulada para testes.' :
    capabilities.brief === 'unavailable' ? 'Gemini indisponível. Você pode montar o briefing aqui.' :
      capabilities.briefReservedMicros>0 ? 'Reserva por proposta de '+briefPrice(capabilities.briefReservedMicros)+'. Envia apenas o assunto ao Gemini.' :
        'Apenas seu assunto será enviado ao Gemini.';
  $('analysis-controls').hidden=capabilities.analysis==='unavailable';
  $('analysis-note').textContent=capabilities.analysis==='unavailable'?'Análise online indisponível. Suas referências podem acompanhar a ficha.' :
    (capabilities.analysis==='mock'?'Análise simulada para testes. ':'O Gemini recebe somente o assunto e as fontes selecionadas. ')+
    'Até 4 arquivos, com 8 MiB somados. Capturas, fotos, PDF, áudio, vídeo e uma página pública.';
  $('produce').hidden = !online;
  $('send-handoff').hidden = !token || !capabilities.limits;
  $('local-help').hidden = draft.mode !== 'edit';
  $('asset-music').hidden=!availableAsset('music');
  refreshAssembly();
  $('generation-note').textContent=capabilities.clip==='mock'?'Clipe em simulação local. Aprovações e arquivos de teste ficam neste ambiente.':
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
  const wrap = $('preview-wrap'), video = $('preview');
  wrap.classList.toggle('vertical',index >= 0);
  video.style.objectPosition = index < 0 ? 'center' :
    `${draft.ranges[index].x*100}% ${draft.ranges[index].y*100}%`;
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
      if (!previewUrl) return note('Envie um vídeo original para ver o enquadramento.');
      setPreview(index);
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
function renderScenes() {
  const container = $('scenes');
  container.replaceChildren();
  draft.scenes.forEach((scene,i) => {
    const box = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Cena '+(i+1);
    box.append(legend,field('Título da cena',scene.title,value => scene.title=value,{max:120}),
      field('O que será falado',scene.narration,value => scene.narration=value,{textarea:true,max:1200}));
    if (availableAsset('speech')) box.append(action('Preparar narração',()=>openAsset('speech',scene)));
    if (['local','container'].includes(capabilities.assembly)) {
      const label=document.createElement('label'), audio=document.createElement('select');
      choiceOptions(audio,draft.materials.filter(item=>item.kind==='audio'),scene.narrationMaterialId,'Sem narração');
      audio.onchange=()=>{scene.narrationMaterialId=audio.value || null;update();};
      label.append('Faixa de narração',audio);
      box.append(label);
    }
    scene.shots.forEach((shot,j) => {
      const row = document.createElement('div');
      row.className='details';
      const title = document.createElement('h3');
      title.textContent='Plano '+(j+1);
      const support = document.createElement('label');
      support.className='toggle';
      const check = document.createElement('input');
      check.type='checkbox';check.checked=shot.generateSupport;
      const clipButton=action('Revisar clipe deste plano',()=>openClip(scene,shot));
      clipButton.hidden=!shot.generateSupport || capabilities.clip==='unavailable';
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
      row.append(title,field('O que aparece',shot.direction,value=>shot.direction=value,{textarea:true,max:500}),
        field('Segundos',shot.seconds,value=>shot.seconds=value,{type:'number'}),label,support,clipButton);
      if (availableAsset('frame')) row.append(action('Preparar quadro conceitual',()=>openAsset('frame',scene,shot)));
      if (['local','container'].includes(capabilities.assembly)) {
        const motion=document.createElement('label'), zoom=document.createElement('input');
        motion.className='toggle';zoom.type='checkbox';zoom.checked=shot.motion==='push';
        zoom.onchange=()=>{shot.motion=zoom.checked?'push':'still';update();};
        motion.append(zoom,'Aproximação suave se o material for uma imagem');
        const sound=document.createElement('label'), keep=document.createElement('input');
        sound.className='toggle';keep.type='checkbox';keep.checked=shot.keepAudio!==false;
        keep.onchange=()=>{shot.keepAudio=keep.checked;update();};
        sound.append(keep,'Manter o som da tomada');
        row.append(field('Título sobre a imagem',shot.overlay || '',value=>shot.overlay=value,{max:100}),motion,sound);
      }
      if (shot.selectedClip) {
        const selected=document.createElement('p');
        selected.className='muted';
        selected.textContent=shot.selectedClip.mode==='mock'?'Clipe simulado vinculado.':'Clipe vinculado ao plano.';
        row.append(selected,action('Desvincular clipe',()=>{
          delete shot.selectedClip;
          renderScenes();
          update();
          note('Clipe desvinculado do plano.');
        }));
      }
      if (scene.shots.length>1) row.append(action('Remover plano',()=>{scene.shots.splice(j,1);renderScenes();update();box.focus();}));
      box.append(row);
    });
    if (scene.shots.length<8) box.append(action('+ Adicionar plano',()=>{scene.shots.push(newShot());renderScenes();update();container.querySelectorAll('fieldset')[i].querySelectorAll('textarea')[scene.shots.length].focus();}));
    box.append(action('Remover cena',()=>{draft.scenes.splice(i,1);renderScenes();update();$('add-scene').focus();}));
    container.append(box);
  });
}

function showWorkspace() {
  $('workspace-title').textContent = draft.mode === 'edit' ? editTitle : createTitle;
  $('choose').hidden=true;$('workspace').hidden=false;
  $('edit-section').hidden=$('edit-actions').hidden=draft.mode !== 'edit';
  $('create-section').hidden=draft.mode !== 'create';
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
  $('preview').removeAttribute('src');
  $('preview').load();
  $('preview-wrap').hidden = true;
  $('source').value = '';
  $('srt').value = '';
  $('transcript').value = '';
  $('cut-suggestions').replaceChildren();
}
for (const button of document.querySelectorAll('[data-mode]')) button.onclick = () => {
  if (draft?.mode !== button.dataset.mode) {
    clearPreview();
    draft = savedDrafts[button.dataset.mode] ?? newDraft(button.dataset.mode);
    lastJob = savedJobs[draft.id] ?? null;
    proposal = null;
    $('analysis-url').value='';
    $('analysis-result').replaceChildren();
    $('analysis-permit').checked=false;
    $('proposal').hidden = $('results').hidden = true;
    $('resume-draft').hidden = false;
    save();
  }
  showWorkspace();
};
document.querySelector('[data-back]').onclick = () => {
  if (task) return note('Cancele a operação antes de trocar de projeto.');
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
  update();
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
  $('preview').src=previewUrl;
  $('preview-wrap').hidden=false;
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
    sessionStorage.setItem(accessKey,token);
    $('token').value='';note('Acesso confirmado.');
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
  draft.scenes=proposal.proposal.scenes.map(scene=>({...scene,id:unique(),
    shots:scene.shots.map(shot=>({...shot,...{id:unique(),generateSupport:false,layers:[]}}))}));
  $('proposal').hidden=true;
  proposal=null;
  renderScenes();
  update();
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
  $('stop').hidden=false;$('produce').disabled=$('suggest').disabled=$('analyze').disabled=true;
  try {
    const projectPath='/projects/'+draft.id;
    if (resume && lastJob?.id) job=lastJob;
    else {
      // User can keep editing while the immutable snapshot is sent.
      const plan=structuredClone(validateProject(draftPlan()));
      const agreedMicros=kind==='brief'?capabilities.briefReservedMicros:undefined;
      if (agreedMicros>0 && !window.confirm('Confirma a reserva de '+briefPrice(agreedMicros)+' para pedir uma proposta ao Gemini?')) return;
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
          key:kind+(kind==='assembly'?'-'+clipQuote.phase:'')+'-'+plan.revision};
      const started=await api(projectPath+'/jobs',{method:'POST',body,signal});
      job={id:started.id,project:plan.id,kind,revision:plan.revision};
      lastJob=job;save();
    }
    const path=projectPath+'/jobs/'+job.id;
    note(kind==='assembly'?'Montando o vídeo…':kind==='asset'?'Preparando o material…':kind==='edit'?'Processando o vídeo…':kind==='analysis'?'Analisando as fontes…':
      kind==='clip'?'Processando o clipe…':'Preparando a proposta…');
    while (!signal.aborted) {
      const state=await api(path,{signal});
      if (state.state==='verified') {
        if (['edit','clip','asset','assembly'].includes(kind)) await showResults(projectPath,state,signal);
        else if (kind==='analysis') showAnalysis(state);
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
  }
}
$('produce').onclick=()=>runTask('edit');
$('suggest').onclick=()=>runTask('brief');
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
  $('asset-input-preview').textContent=kind==='frame'?shot.direction:kind==='speech'?scene.narration:'';
  $('asset-frame-options').hidden=kind!=='frame';
  $('asset-speech-options').hidden=kind!=='speech';
  $('asset-music-options').hidden=kind!=='music';
  $('asset-aspect').value='9:16';
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
  $('clip-scope').textContent=[scene.title,shot.direction].filter(Boolean).join(' · ');
  $('clip-mode').textContent=capabilities.clip==='mock'?'Simulação local com vídeo de teste.':
    'O Google recebe somente o quadro selecionado e a descrição deste plano.';
  $('clip-aspect').value=previous?.aspect || '9:16';
  $('clip-message').value='';
  $('clip-status').textContent='';
  const choices=draft.materials.filter(item=>['reference','frame'].includes(item.kind) && files.has(item.id) &&
    /\.(?:png|jpeg|jpg|webp)$/i.test(item.name) && item.bytes<=capabilities.clipFrameMaxBytes);
  $('clip-frame').replaceChildren(new Option('Escolha o quadro',''),...choices.map(item=>new Option(item.name,item.id)));
  $('clip-reuse').hidden=!previous;
  $('clip-reuse').disabled=false;
  if (!choices.length) $('clip-status').textContent='Adicione uma imagem de referência de até 2 MiB no projeto.';
  clipDialog.showModal();
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

void api('/capabilities').then(result=>{capabilities=result;if(draft?.mode==='create')renderScenes();renderAnalysisFiles();refresh();}).catch(()=>{});
