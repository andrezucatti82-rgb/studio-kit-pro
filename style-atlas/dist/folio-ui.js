/* Fólio adapts the real atlas: goals/niches are discovery, never project edits. */
(()=>{
 const $=id=>document.getElementById(id),model=globalThis.FolioCollections;
 if(!model||!$('folioCollections'))return;
 const esc=value=>AtlasViews.esc(value),base=()=>window.ATLAS_ASSET_BASE||'';
 // Keep the existing feature APIs, but render each workspace in document flow.
 // Nested inspection (style -> frame) replaces the current page and returns to
 // it, rather than stacking modal layers or blocking the rest of the interface.
 const panelHost=document.createElement('div');panelHost.id='folioPanelHost';panelHost.hidden=true;
 document.body.insertBefore(panelHost,document.querySelector('.app-main'));
 document.body.insertBefore($('folioMenu'),panelHost);
 const panelStack=[];let panelView=document.body.dataset.view,resettingPanels=false;
 function syncPanels(){
  const current=panelStack.at(-1)?.panel;panelHost.hidden=!current;
  if(current)document.body.dataset.folioPanel=current.id;else delete document.body.dataset.folioPanel;
  panelHost.querySelectorAll('dialog').forEach(p=>p.classList.toggle('is-current',p===current));window.AtlasFolio?.syncHeader();
 }
 function registerPanel(panel){
  if(panel.dataset.inlinePage)return;
  panel.dataset.inlinePage='true';panel.classList.add('folio-page-panel');panel.tabIndex=-1;
  const show=panel.show.bind(panel),close=panel.close.bind(panel);
  panelHost.append(panel);
  const back=panel.querySelector('[data-close], [data-folio-close], #pickerClose');
  if(back){back.textContent='← Voltar';back.classList.add('folio-panel-back');}
  panel.showModal=()=>{
   const trigger=document.activeElement;
   closeMenu();
   if(panel.open)return;
   panelStack.push({panel,trigger,scroll:window.scrollY,view:document.body.dataset.view});
   show();syncPanels();panel.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
  };
  panel.close=value=>{
   if(!panel.open)return;
   const index=panelStack.findIndex(p=>p.panel===panel),entry=panelStack[index],wasCurrent=index===panelStack.length-1;
   close(value);if(index>=0)panelStack.splice(index,1);syncPanels();
   if(!resettingPanels&&entry&&wasCurrent&&entry.view===document.body.dataset.view){
    window.scrollTo({top:entry.scroll,behavior:'auto'});
    if(entry.trigger?.isConnected&&entry.trigger.getClientRects().length)entry.trigger.focus({preventScroll:true});
   }
  };
 }
 window.AtlasInlinePanels={register:registerPanel,reset(){resettingPanels=true;for(const {panel} of [...panelStack].reverse())panel.close();resettingPanels=false;},onView(view){if(view!==panelView){panelView=view;this.reset();}}};
 document.querySelectorAll('dialog:not(#briefDialog):not(#categoryDrawer)').forEach(registerPanel);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!panelStack.length)return;
  e.preventDefault();const panel=panelStack.at(-1).panel;
  if(panel.dispatchEvent(new Event('cancel',{cancelable:true})))panel.close();
 });
 const icons={heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C0 9 6 15 12 21c6-6 12-12 8-16Z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'};
 const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[id]||icons.arrow}</svg>`;
 let ready=false,niches=[],catalog,latest,homeKey='',menuGroup='',menuTrigger,menuScroll=0,gridScroll=0,homeScroll=0;
 const state={goal:'mixed',mode:'home',collection:'',niche:'',similar:'',browseGroup:'',browseTopic:''};
 const featuredCollections=['inside-products','product-value','people-and-business','explanations'];

 const selected=id=>latest?.selected.includes(id),favorite=id=>latest?.favorites.includes(id);
 function picture(s,small=true){
  if(s.sequence)return AtlasViews.picture(s,s.sequence.heroIndex??1,base(),'folio-photo',small);
  // Full standalone sources can be fitted without manufacturing a portrait crop.
  if(s.image.columns===1)return `<img class="folio-photo" src="${esc((window.ATLAS_IMAGE_ASSET_BASE||base())+s.image.atlas)}" alt="${esc(s.name)}" loading="lazy" decoding="async">`;
  return `<span class="folio-missing">O estudo completo está na ficha do estilo</span>`;
 }
 function preview(s){
  // Fill the preview with the actual logical panel, never a blurred duplicate.
  // The untouched source remains available in the detail viewer and downloads.
  return `<span class="folio-portrait" style="--folio-source-ratio:${model.previewRatio(s)};--folio-focus-y:${s.presenterEditing?'100%':'35%'}"><span class="folio-artwork">${picture(s)}</span><span class="folio-cover-hint" aria-hidden="true">Explorar ${icon('arrow')}</span></span>`;
 }
 function card(s,large=false){
  return `<article class="folio-card${large?' folio-card-expanded':''}${selected(s.id)?' is-selected':''}" data-style-id="${esc(s.id)}"><button type="button" class="folio-cover" data-detail="${esc(s.id)}" aria-label="Ver ${esc(s.name)}">${preview(s)}</button><div class="folio-card-footer"><span class="folio-reference">Referência visual</span><div class="folio-card-title"><h3><button type="button" data-detail="${esc(s.id)}">${esc(s.name)}</button></h3><button type="button" class="folio-save" data-fav="${esc(s.id)}" aria-pressed="${!!favorite(s.id)}" aria-label="${favorite(s.id)?'Remover dos':'Adicionar aos'} favoritos: ${esc(s.name)}">${icon(large?'bookmark':'heart')}</button></div>${large?`<div class="folio-card-actions"><span>${s.sequence?'4 quadros':'Estudo visual'}</span><button type="button" data-choose="${esc(s.id)}" class="folio-add" aria-pressed="${!!selected(s.id)}" aria-label="${selected(s.id)?'Selecionado:':'Escolher'} ${esc(s.name)}">${selected(s.id)?'Selecionado ✓':'Escolher estilo'}</button></div>`:''}</div>${!large&&state.mode==='catalogue'?`<label class="folio-compare"><input type="checkbox" data-compare="${esc(s.id)}" ${latest?.compared.includes(s.id)?'checked':''}>Comparar</label>`:''}${large?`<button type="button" class="folio-story-link" data-detail="${esc(s.id)}">Ver os momentos ${icon('arrow')}</button>`:''}</article>`;
 }
 function filter(items){
  const c=model.collection(state.collection);
  const result=items.filter(s=>model.matchesNiche(s,state.niche,niches)&&
   model.matchesBrowse(s,state.browseGroup,state.browseTopic)&&
   (state.mode!=='collection'||model.matchesCollection(s,c)));
  if(state.similar){const ranked=AtlasSearch.similar(catalog.styles,window.AtlasApp.getStyle(state.similar),24,catalog.search),allowed=new Set(result.map(s=>s.id));return ranked.filter(s=>allowed.has(s.id));}
  return state.mode==='collection'||state.browseGroup?model.diversify(result,c?.preferred):result;
 }
 function beforeRender(){gridScroll=$('grid').scrollLeft;}
 function update(data){
  latest=data;if(!ready)return;
  // A URL category, legacy category control or filter is still a real catalogue.
  if(state.mode==='home'&&(data.family||data.group||data.query||data.onlyFav||data.onlyVideo||data.kind))state.mode='catalogue';
  document.body.dataset.folioMode=state.mode;
  document.body.dataset.folioBrowse=state.mode==='catalogue'&&!data.query?'category':'';
  document.body.dataset.folioDensity='compact';
  categoryBar.querySelectorAll('[data-folio-open-group]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.folioOpenGroup===state.browseGroup)));
  $('folioMenuGroups').querySelectorAll('[data-folio-topic]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.folioTopic===state.browseTopic)));
  $('folioDiscovery').hidden=state.mode!=='home';$('folioCollectionHeading').hidden=state.mode==='home';
  $('folioChangeGoal').hidden=state.mode!=='collection';$('folioBrowseAll').hidden=state.mode!=='home';
  $('folioCollections').hidden=state.mode!=='home';$('grid').hidden=state.mode==='home';
  $('folioNiche').value=state.niche;
  document.querySelectorAll('[data-folio-goal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.folioGoal===state.goal)));
  if(state.mode==='home')renderHome(data.items);
  else{
   const c=model.collection(state.collection),group=model.browseGroup(state.browseGroup);
   const topic=group?.topics.find(t=>t.id===state.browseTopic);
   $('folioCollectionTitle').textContent=state.similar?'Estilos parecidos com '+window.AtlasApp.getStyle(state.similar).name:state.mode==='collection'?c.title:data.onlyFav?'Seus favoritos':data.query?'Resultados da busca':topic?.label||group?.label||(data.family?catalog.families.find(f=>f.id===data.family)?.name:data.group?window.AtlasNavigation.groups.find(g=>g.id===data.group)?.name:'Todos os estilos');
   $('folioCollectionDescription').textContent=state.mode==='collection'?c.description:data.query?'Referências encontradas no catálogo completo.':'Explore as referências e encontre o ponto de partida do seu vídeo.';
   $('grid').innerHTML=data.shown.map(s=>card(s,state.mode==='collection')).join('');
   $('grid').scrollLeft=gridScroll;
  }
  $('folioEmpty').hidden=state.mode!=='home'||data.items.length>0;
  document.querySelectorAll('.folio-choice-icon small').forEach(el=>el.hidden=!data.selected.length);
  if($('folioChoice').open)renderChoice();
  syncNavigation(document.body.dataset.view);
 }
 function renderHome(items){
  const key=state.goal+'|'+state.niche+'|'+items.map(s=>s.id).join(',');
  if(key!==homeKey){
   homeKey=key;
   const collections=state.goal==='mixed'?featuredCollections.map(model.collection):model.definitions.filter(c=>c.goal===state.goal);
   $('folioCollections').innerHTML=collections.map(c=>{
    const styles=model.diversify(items.filter(s=>model.matchesCollection(s,c)),c.preferred);if(!styles.length)return '';
    return `<section class="folio-shelf" aria-labelledby="folio-shelf-${c.id}"><header><h2 id="folio-shelf-${c.id}">${esc(c.title)}</h2><div class="folio-shelf-tools"><button type="button" class="folio-rail-arrow" data-folio-rail="${c.id}" data-rail-direction="-1" aria-label="Estilos anteriores de ${esc(c.title)}">←</button><button type="button" class="folio-rail-arrow" data-folio-rail="${c.id}" data-rail-direction="1" aria-label="Mais estilos de ${esc(c.title)}">→</button><button type="button" data-folio-collection="${c.id}" aria-label="Ver coleção: ${esc(c.title)}">Ver coleção ${icon('arrow')}</button></div></header><div class="folio-shelf-rail" tabindex="0" role="region" aria-label="${esc(c.title)} — deslize para explorar">${styles.slice(0,8).map(s=>card(s)).join('')}<button type="button" class="folio-more-card" data-folio-collection="${c.id}"><span>${icon('arrow')}</span><strong>Explorar a coleção</strong><small>${styles.length} estilos</small></button></div></section>`;
   }).join('');
  }
  // Preserve scroll, keyboard focus and each shelf position when saving a favorite.
  for(const b of $('folioCollections').querySelectorAll('[data-fav]')){
   const active=favorite(b.dataset.fav);b.setAttribute('aria-pressed',String(!!active));b.setAttribute('aria-label',`${active?'Remover dos':'Adicionar aos'} favoritos: ${window.AtlasApp.getStyle(b.dataset.fav).name}`);
  }
  for(const c of $('folioCollections').querySelectorAll('[data-style-id]'))c.classList.toggle('is-selected',selected(c.dataset.styleId));
 }
 function refresh(){window.AtlasApp.refresh();}
 $('folioBrowseAll').textContent='Ver todos →';
 function clearBrowse(){state.browseGroup='';state.browseTopic='';}
 function catalogue(){window.AtlasInlinePanels.reset();clearBrowse();state.niche='';state.mode='catalogue';state.collection='';state.similar='';gridScroll=0;closeMenu($('folioCollectionTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();}
 function home({restore=false}={}){
  window.AtlasInlinePanels.reset();
  clearBrowse();state.mode='home';state.collection='';state.similar='';gridScroll=0;closeMenu($('folioDiscoveryTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  requestAnimationFrame(()=>{window.scrollTo({top:restore?homeScroll:0,behavior:'auto'});if(!restore)$('folioDiscoveryTitle').focus({preventScroll:true});});
 }
 function openCollection(id){
  const c=model.collection(id);if(!c)return;
  clearBrowse();homeScroll=window.scrollY;state.mode='collection';state.collection=id;gridScroll=0;refresh();
  window.scrollTo({top:0,behavior:'auto'});$('folioCollectionTitle').focus({preventScroll:true});
 }
 function syncNavigation(view){
  syncHeader(view);
  const skip=document.querySelector('.skip-link');let content=view==='help'?$('installTitle'):view==='brief'?$('briefTitle'):view==='library'?(state.mode==='home'?$('folioDiscoveryTitle'):$('folioCollectionTitle')):$('projectTitle');
  if(skip&&content){if(!content.id)content.id='folioContentTitle';content.tabIndex=-1;skip.href='#'+content.id;skip.textContent='Pular para o conteúdo';}
  window.AtlasInlinePanels.onView(view);
  if(view!=='library'){closeMenu();if($('folioChoice').open){$('folioChoice').close();}}
  document.querySelectorAll('[data-folio-home]').forEach(b=>b.setAttribute('aria-current',view==='library'?'page':'false'));
  document.querySelectorAll('[data-folio-choice]').forEach(b=>b.setAttribute('aria-current',['brief','project'].includes(view)?'page':'false'));
 }
 const categoryBar=document.createElement('nav');categoryBar.className='folio-category-bar';categoryBar.setAttribute('aria-label','Categorias de estilos');$('folioHeader').insertBefore(categoryBar,$('folioHeader').lastElementChild);
 const header=$('folioHeader'),headerProgress=document.createElement('div');headerProgress.className='folio-header-progress';
 const headerNext=document.createElement('button');headerNext.type='button';headerNext.id='folioContinue';headerNext.className='primary';headerProgress.append(headerNext);header.insertBefore(headerProgress,header.lastElementChild);
 header.querySelector('[data-folio-choice]').hidden=true;header.append($('compareBar'));
 function syncHeader(view=document.body.dataset.view){
  const count=latest?.selected.length||0,inGuide=document.body.dataset.folioPanel==='guidedDialog';
  const text=inGuide?$('guidedNext').textContent:view==='brief'?($('briefDialog').dataset.stage==='review'?'Copiar pedido':'Revisar pedido'):count?'Meu vídeo':'Criar vídeo';
  const markup='<span>'+esc(text)+'</span>'+(count&&view!=='brief'&&!inGuide?'<small aria-label="'+count+' estilos escolhidos">'+count+'</small>':'');
  if(headerNext.innerHTML!==markup)headerNext.innerHTML=markup;
  headerNext.disabled=inGuide&&$('guidedNext').disabled;
 }
 headerNext.addEventListener('click',()=>{
  if(document.body.dataset.folioPanel==='guidedDialog'){$('guidedNext').click();return;}
  if(document.body.dataset.view==='brief'){
   window.AtlasInlinePanels.reset();
   if($('briefDialog').dataset.stage==='review')$('copyPrompt').click();else $('prepare').click();return;
  }
  if(!latest?.selected.length||window.AtlasGuidedFlow?.hasDraft())$('startGuided').click();else window.AtlasShell.openBrief();
 });
 const stickySubcategories=matchMedia('(min-width: 1024px)');
 function measureNavigation(){
  const height=header.getBoundingClientRect().height;
  const total=height+(stickySubcategories.matches?$('folioMenu').getBoundingClientRect().height:0);
  document.documentElement.style.setProperty('--folio-header-height',height+'px');
  document.documentElement.style.setProperty('--folio-navigation-height',total+'px');
  alignMenu();
 }
 if(globalThis.ResizeObserver){const observer=new ResizeObserver(measureNavigation);observer.observe(header);observer.observe(categoryBar);observer.observe($('folioMenu'));}
 window.addEventListener('resize',measureNavigation);document.fonts?.ready?.then(measureNavigation);
 // iOS keeps the layout viewport behind the keyboard. Follow the visual
 // viewport instead, leaving room for its input accessory bar as well.
 const viewport=window.visualViewport;
 if(viewport){
  let viewportFrame=0,editingHeight=0,lastEdit=0;
  const editable=()=>{const e=document.activeElement;return e?.matches('textarea,input:not([type=checkbox],[type=radio],[type=file],[type=button],[type=submit],[type=reset],[type=range],[type=color],[type=hidden])')&&!e.disabled&&!e.readOnly?e:null;};
  function keepEditorVisible(){
   viewportFrame=0;const field=editable(),mobile=window.innerWidth<=700,height=viewport.height,normalHeight=height*(viewport.scale||1);
   if(!mobile||!field){delete document.body.dataset.folioKeyboard;editingHeight=0;return;}
   if(!editingHeight)editingHeight=Math.max(window.innerHeight,document.documentElement.clientHeight,normalHeight);
   const keyboard=editingHeight-normalHeight>100;
   document.documentElement.style.setProperty('--folio-viewport-height',height+'px');
   document.documentElement.style.setProperty('--folio-keyboard-inset',Math.max(0,editingHeight-normalHeight)+'px');
   if(keyboard)document.body.dataset.folioKeyboard='true';else delete document.body.dataset.folioKeyboard;
   if(!keyboard)return;
   const top=Math.max(viewport.offsetTop,header.getBoundingClientRect().bottom)+12,bottom=viewport.offsetTop+height-48,rect=field.getBoundingClientRect();
   const delta=rect.height>bottom-top?rect.top-top:rect.bottom>bottom?rect.bottom-bottom:rect.top<top?rect.top-top:0;
   if(Math.abs(delta)>1)window.scrollTo({top:Math.max(0,window.scrollY+delta),behavior:'auto'});
  }
  const scheduleEditor=()=>{if(!viewportFrame)viewportFrame=requestAnimationFrame(keepEditorVisible);};
  document.addEventListener('focusin',()=>{lastEdit=Date.now();if(!document.body.dataset.folioKeyboard)editingHeight=Math.max(window.innerHeight,document.documentElement.clientHeight,viewport.height*(viewport.scale||1));scheduleEditor();});
  document.addEventListener('focusout',scheduleEditor);document.addEventListener('input',()=>{lastEdit=Date.now();scheduleEditor();});
  viewport.addEventListener('resize',scheduleEditor);viewport.addEventListener('scroll',()=>{if(Date.now()-lastEdit<700)scheduleEditor();});window.addEventListener('resize',scheduleEditor);
 }
 function renderCategoryBar(){
  categoryBar.innerHTML=model.browseGroups.map(g=>`<button type="button" data-folio-open-group="${esc(g.id)}" aria-controls="folioMenu" aria-expanded="false"><span>${esc(g.label)}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>`).join('');
 }
 function menuRows(){
  const group=model.browseGroup(menuGroup);
  $('folioMenu').setAttribute('aria-label',group.label);
  $('folioMenuGroups').innerHTML='<div class="folio-text-links">'+group.topics.map(topic=>
   `<button type="button" data-folio-topic="${esc(topic.id)}" aria-current="${state.browseTopic===topic.id}"><span>${esc(topic.label)}</span></button>`
  ).join('')+'</div>';
 }
 function alignMenu(){
  const menu=$('folioMenu'),first=categoryBar.querySelector('button');if(menu.hidden||!first||!first.getClientRects().length)return;
  const firstBox=first.getBoundingClientRect(),barBox=categoryBar.getBoundingClientRect(),menuBox=menu.getBoundingClientRect(),padding=parseFloat(getComputedStyle(first).paddingLeft)||0;
  const start=Math.max(0,Math.max(barBox.left,firstBox.left+categoryBar.scrollLeft+padding)-menuBox.left);
  const available=Math.max(0,menuBox.width-start-(parseFloat(getComputedStyle(menu).paddingRight)||0));
  const columns=available>=800?4:available>=560?3:available>=310?2:1;
  menu.style.setProperty('--folio-menu-start',start+'px');menu.style.setProperty('--folio-menu-columns',String(columns));
 }
 function focusMenu(){$('folioMenuGroups').querySelector('button')?.focus({preventScroll:true});}
 function closeMenu(destination){
  if($('folioMenu').hidden)return;
  $('folioMenu').hidden=true;measureNavigation();if(!destination&&!stickySubcategories.matches)window.scrollTo({top:menuScroll,behavior:'auto'});categoryBar.querySelectorAll('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
  const target=destination||menuTrigger,focusTarget=target?.isConnected&&target.getClientRects().length?target:categoryBar.querySelector('button');
  if(focusTarget?.parentElement===categoryBar){const box=focusTarget.getBoundingClientRect(),bar=categoryBar.getBoundingClientRect();if(box.left<bar.left)categoryBar.scrollLeft-=bar.left-box.left;else if(box.right>bar.right)categoryBar.scrollLeft+=box.right-bar.right;}
  focusTarget?.focus({preventScroll:true});
 }
 function showMenu(trigger,group='',keyboard=false){
  if(!$('folioMenu').hidden&&menuTrigger===trigger){closeMenu();return;}
  if($('folioMenu').hidden)menuScroll=window.scrollY;window.AtlasInlinePanels.reset();menuTrigger=trigger;menuGroup=group;menuRows();$('folioMenu').hidden=false;
  window.scrollTo({top:0,behavior:'auto'});categoryBar.querySelectorAll('[data-folio-open-group][aria-expanded]').forEach(b=>b.setAttribute('aria-expanded',String(b===trigger)));measureNavigation();if(keyboard)focusMenu();
 }
 function selectCategory(group,topic='',keepMenu=false){
  window.AtlasInlinePanels.reset();

  state.browseGroup=group;state.browseTopic=topic;
  state.mode='catalogue';state.collection='';state.similar='';state.niche='';gridScroll=0;
  if(!keepMenu)closeMenu($('folioCollectionTitle'));
  window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  $('folioCollectionTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
 }
 function renderChoice(){
  const ids=latest.selected;$('folioChoiceHelp').textContent=ids.length?'Um estilo orienta seu vídeo. Você pode trocar a referência a qualquer momento.':'Explore uma coleção e escolha um estilo.';
  $('folioChoiceItems').innerHTML=ids.map((id,i)=>{const s=window.AtlasApp.getStyle(id);return `<article class="folio-chosen"><button type="button" data-detail="${esc(id)}" aria-label="Examinar ${esc(s.name)}">${picture(s)}</button><div><small>${i===0?'Estilo principal':'Referência complementar'}</small><h3>${esc(s.name)}</h3><button type="button" class="text-button" data-similar="${esc(id)}">Procurar estilos parecidos</button></div><button type="button" data-remove="${esc(id)}" class="folio-icon-button" aria-label="Remover ${esc(s.name)} da minha escolha">×</button></article>`;}).join('');
  $('folioChoiceContinue').disabled=!ids.length;
 }
 function showChoice(trigger){window.AtlasInlinePanels.reset();renderChoice();$('folioChoice').showModal();}
 function similar(id){if(!window.AtlasApp.getStyle(id))return;window.AtlasInlinePanels.reset();clearBrowse();state.mode='catalogue';state.collection='';state.niche='';state.similar=id;gridScroll=0;closeMenu($('folioCollectionTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();$('folioCollectionTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
 window.AtlasFolio={filter,beforeRender,update,onView:syncNavigation,getState:()=>({...state}),syncHeader,similar};
 // Listeners are installed before app.js: a free-text search starts across all styles.
 $('search').addEventListener('input',()=>{clearBrowse();if(!$('folioMenu').hidden){closeMenu($('search'));}state.mode=$('search').value.trim()?'catalogue':'home';state.collection='';state.similar='';state.niche='';gridScroll=0;});
 $('reset').addEventListener('click',()=>{clearBrowse();state.mode='home';state.collection='';state.similar='';state.niche='';});
 $('searchEverywhere').addEventListener('click',()=>{state.mode='catalogue';state.collection='';state.similar='';state.niche='';});
 $('familySelect').addEventListener('change',()=>{state.mode='catalogue';state.collection='';state.similar='';state.niche='';gridScroll=0;});
 $('folioNiche').addEventListener('change',()=>{state.niche=$('folioNiche').value;gridScroll=0;refresh();});
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented)return;
  if(!$('folioMenu').hidden){e.preventDefault();closeMenu();}
 });
 $('folioChoiceContinue').addEventListener('click',()=>{$('folioChoice').close();window.AtlasShell.openBrief();});
 $('folioBack').addEventListener('click',()=>home({restore:true}));$('folioChangeGoal').addEventListener('click',()=>home());
 $('folioBrowseAll').addEventListener('click',catalogue);
 document.addEventListener('click',e=>{
  const t=e.target;
  const goal=t.closest('[data-folio-goal]');if(goal){state.goal=goal.dataset.folioGoal;state.mode='home';state.collection='';state.similar='';homeKey='';refresh();}
  const rail=t.closest('[data-folio-rail]');if(rail){const region=$('folio-shelf-'+rail.dataset.folioRail).closest('section').querySelector('.folio-shelf-rail');region.scrollBy({left:Number(rail.dataset.railDirection)*region.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  const collection=t.closest('[data-folio-collection]');if(collection)openCollection(collection.dataset.folioCollection);
  if(t.closest('[data-folio-back]'))home({restore:true});
  if(t.closest('[data-folio-home]')){e.preventDefault();home();}
  const choice=t.closest('[data-folio-choice]');if(choice)showChoice(choice);
  const closer=t.closest('[data-folio-close]');if(closer){if(closer.closest('#folioMenu'))closeMenu();else closer.closest('dialog')?.close();}
  const openGroup=t.closest('[data-folio-open-group]');
  if(openGroup){
   const group=openGroup.dataset.folioOpenGroup;
   const wasOpen=!$('folioMenu').hidden&&menuGroup===group;
   selectCategory(group);
   if(!wasOpen)showMenu(openGroup,group,e.detail===0);
  }
  const topic=t.closest('[data-folio-topic]');
  if(topic)selectCategory(menuGroup,topic.dataset.folioTopic,stickySubcategories.matches);
 });
 window.addEventListener('atlas:ready',()=>{
  catalog=window.AtlasApp.getCatalog();niches=model.niches(catalog.styles);
  $('folioNiche').innerHTML='<option value="">Todos os nichos</option>'+niches.map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
  renderCategoryBar();ready=true;document.body.dataset.folio='true';refresh();
  if(!window.ATLAS_PAGE_MODE&&window.location.hash==='#briefSection')window.AtlasShell.openBrief();
 });
})();
