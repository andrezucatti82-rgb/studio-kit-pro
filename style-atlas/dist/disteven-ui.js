/* DiSteven adapts the real atlas: goals/niches are discovery, never project edits. */
(()=>{
 const $=id=>document.getElementById(id),model=globalThis.DiStevenCollections;
 if(!model||!$('distevenCollections'))return;
 const esc=value=>AtlasViews.esc(value),base=()=>window.ATLAS_ASSET_BASE||'';
 // Keep the existing feature APIs, but render each workspace in document flow.
 // Nested inspection (style -> frame) replaces the current page and returns to
 // it, rather than stacking modal layers or blocking the rest of the interface.
 const panelHost=document.createElement('div');panelHost.id='distevenPanelHost';panelHost.hidden=true;
 document.body.insertBefore(panelHost,document.querySelector('.app-main'));
 document.body.insertBefore($('distevenMenu'),panelHost);
 const panelStack=[];let panelView=document.body.dataset.view,resettingPanels=false;
 function syncPanels(){
  const current=panelStack.at(-1)?.panel;panelHost.hidden=!current;
  if(current)document.body.dataset.distevenPanel=current.id;else delete document.body.dataset.distevenPanel;
  panelHost.querySelectorAll('dialog').forEach(p=>p.classList.toggle('is-current',p===current));window.AtlasDiSteven?.syncHeader();
 }
 function registerPanel(panel){
  if(panel.dataset.inlinePage)return;
  panel.dataset.inlinePage='true';panel.classList.add('disteven-page-panel');panel.tabIndex=-1;
  const show=panel.show.bind(panel),close=panel.close.bind(panel);
  panelHost.append(panel);
  const back=panel.querySelector('[data-close], [data-disteven-close], #pickerClose');
  const backLabels={detailDialog:'Voltar aos estilos',sequenceDialog:'Voltar ao estilo',fontDialog:'Voltar ao briefing',materialsDialog:'Voltar ao pedido',guidedDialog:'Fechar guia',stylePicker:'Voltar ao briefing'};
  if(back){const label=backLabels[panel.id]||'Voltar';back.textContent='← '+label;back.setAttribute('aria-label',label);back.classList.add('disteven-panel-back');}
  panel.showModal=()=>{
   const trigger=document.activeElement;
   closeMenu();
   if(panel.open)return;
   panelStack.push({panel,trigger,scroll:window.scrollY,view:document.body.dataset.view});
   show();syncPanels();panel.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});window.AtlasHistory?.changed();
  };
  panel.close=value=>{
   if(!panel.open)return;
   const index=panelStack.findIndex(p=>p.panel===panel),entry=panelStack[index],wasCurrent=index===panelStack.length-1;
   close(value);if(index>=0)panelStack.splice(index,1);syncPanels();window.AtlasHistory?.changed();
   if(!resettingPanels&&entry&&wasCurrent&&entry.view===document.body.dataset.view){
    window.scrollTo({top:entry.scroll,behavior:'auto'});
    if(entry.trigger?.isConnected&&entry.trigger.getClientRects().length)entry.trigger.focus({preventScroll:true});
    else document.querySelector(panelStack.length?'#distevenPanelHost .is-current':document.body.dataset.view==='brief'?'#briefTitle':state.mode==='home'?'#distevenDiscoveryTitle':'#distevenCollectionTitle')?.focus({preventScroll:true});
   }
  };
 }
 window.AtlasInlinePanels={register:registerPanel,
  snapshot:()=>panelStack.map(({panel})=>({id:panel.id,styleId:panel.dataset.styleId,frame:panel.dataset.historyFrame,step:panel.dataset.step})),
 reset(){resettingPanels=true;for(const {panel} of [...panelStack].reverse())panel.close();resettingPanels=false;},onView(view){if(view!==panelView){panelView=view;this.reset();}}};
 document.querySelectorAll('dialog:not(#briefDialog):not(#categoryDrawer)').forEach(registerPanel);
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented||!panelStack.length)return;
  e.preventDefault();const panel=panelStack.at(-1).panel;
  if(panel.dispatchEvent(new Event('cancel',{cancelable:true})))panel.close();
 });
 const icons={heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C0 9 6 15 12 21c6-6 12-12 8-16Z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'};
 const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[id]||icons.arrow}</svg>`;
 let ready=false,niches=[],catalog,latest,homeKey='',menuGroup='',menuTrigger,menuScroll=0,gridScroll=0,homeScroll=0;
 const state={goal:'mixed',mode:'home',collection:'',niche:'',similar:'',browseGroup:'',browseTopic:'',browseDetail:''};
 const featuredCollections=['inside-products','product-value','people-and-business','explanations'];
 const nicheVisible=new Map();
 const gridBreakpoints=[matchMedia('(min-width:1200px)'),matchMedia('(min-width:900px)'),matchMedia('(min-width:701px)')];
 const gridColumns=()=>[6,4,3,2][gridBreakpoints.filter(query=>!query.matches).length];
 gridBreakpoints.forEach(query=>query.addEventListener?.('change',()=>{
  if(state.browseTopic&&$('grid').dataset.grouped)refresh();
 }));

 const selected=id=>latest?.selected.includes(id),favorite=id=>latest?.favorites.includes(id);
 function picture(s,small=true){
  if(s.sequence)return AtlasViews.picture(s,s.sequence.heroIndex??1,base(),'disteven-photo',small);
  // Full standalone sources can be fitted without manufacturing a portrait crop.
  if(s.image.columns===1)return `<img class="disteven-photo" src="${esc((window.ATLAS_IMAGE_ASSET_BASE||base())+s.image.atlas)}" alt="${esc(s.name)}" loading="lazy" decoding="async">`;
  return `<span class="disteven-missing">O estudo completo está na ficha do estilo</span>`;
 }
 function preview(s){
  // Fill the preview with the actual logical panel, never a blurred duplicate.
  // The untouched source remains available in the detail viewer and downloads.
  return `<span class="disteven-portrait" style="--disteven-source-ratio:${model.previewRatio(s)};--disteven-focus-y:${s.presenterEditing?'100%':'35%'}"><span class="disteven-artwork">${picture(s)}</span><span class="disteven-cover-hint" aria-hidden="true">Explorar ${icon('arrow')}</span></span>`;
 }
 function card(s,large=false){
  return `<article class="disteven-card${large?' disteven-card-expanded':''}${selected(s.id)?' is-selected':''}" data-style-id="${esc(s.id)}"><button type="button" class="disteven-cover" data-detail="${esc(s.id)}" aria-label="Ver ${esc(s.name)}">${preview(s)}</button><div class="disteven-card-footer"><span class="disteven-reference">Referência visual</span><div class="disteven-card-title"><h3><button type="button" data-detail="${esc(s.id)}">${esc(s.name)}</button></h3><button type="button" class="disteven-save" data-fav="${esc(s.id)}" aria-pressed="${!!favorite(s.id)}" aria-label="${favorite(s.id)?'Remover dos':'Adicionar aos'} favoritos: ${esc(s.name)}">${icon(large?'bookmark':'heart')}</button></div>${large?`<div class="disteven-card-actions"><span>${s.sequence?'4 quadros':'Estudo visual'}</span><button type="button" data-choose="${esc(s.id)}" class="disteven-add" aria-pressed="${!!selected(s.id)}" aria-label="${selected(s.id)?'Selecionado:':'Escolher'} ${esc(s.name)}">${selected(s.id)?'Selecionado ✓':'Escolher estilo'}</button></div>`:''}</div>${large?`<button type="button" class="disteven-story-link" data-detail="${esc(s.id)}">Ver os momentos ${icon('arrow')}</button>`:''}</article>`;
 }
 function filter(items){
  const c=model.collection(state.collection);
  const result=items.filter(s=>model.matchesNiche(s,state.niche,niches)&&
   model.matchesBrowse(s,state.browseGroup,state.browseTopic,state.browseDetail,catalog?.search?.styleColors?.[s.id])&&
   (state.mode!=='collection'||model.matchesCollection(s,c)));
  if(state.similar){const ranked=AtlasSearch.similar(catalog.styles,window.AtlasApp.getStyle(state.similar),24,catalog.search),allowed=new Set(result.map(s=>s.id));return ranked.filter(s=>allowed.has(s.id));}
  return state.mode==='collection'||state.browseGroup?model.diversify(result,c?.preferred):result;
 }
 function beforeRender(){gridScroll=$('grid').scrollLeft;}
 function update(data){
  latest=data;if(!ready)return;
  // A URL category, legacy category control or filter is still a real catalogue.
  if(state.mode==='home'&&(data.family||data.group||data.query||data.onlyFav||data.onlyVideo||data.kind))state.mode='catalogue';
  document.body.dataset.distevenMode=state.mode;
  document.body.dataset.distevenBrowse=state.mode==='catalogue'&&!data.query?'category':'';
  document.body.dataset.distevenDensity='compact';
  categoryBar.querySelectorAll('[data-disteven-open-group]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.distevenOpenGroup===state.browseGroup)));
  $('distevenMenuGroups').querySelectorAll('[data-disteven-topic]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.distevenTopic===state.browseTopic)));
  $('distevenMenuGroups').querySelectorAll('[data-disteven-detail]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.distevenDetail===state.browseDetail)));
  $('distevenDiscovery').hidden=state.mode!=='home';$('distevenCollectionHeading').hidden=state.mode==='home';
  $('distevenChangeGoal').hidden=state.mode!=='collection';$('distevenBrowseAll').hidden=state.mode!=='home';
  $('distevenCollections').hidden=state.mode!=='home';$('grid').hidden=state.mode==='home';
  $('distevenNiche').value=state.niche;
  document.querySelectorAll('[data-disteven-goal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.distevenGoal===state.goal)));
  if(state.mode==='home'){delete $('grid').dataset.grouped;renderHome(data.items);}
  else{
   const c=model.collection(state.collection),group=model.browseGroup(state.browseGroup);
   const topic=group?.topics.find(t=>t.id===state.browseTopic);
   const detail=topic?.children.find(t=>t.id===state.browseDetail);
   $('distevenCollectionTitle').textContent=state.similar?'Estilos parecidos com '+window.AtlasApp.getStyle(state.similar).name:state.mode==='collection'?c.title:data.onlyFav?'Seus favoritos':data.query?'Resultados da busca':detail?.label||topic?.label||group?.label||(data.family?catalog.families.find(f=>f.id===data.family)?.name:data.group?window.AtlasNavigation.groups.find(g=>g.id===data.group)?.name:'Todos os estilos');
    $('distevenCollectionDescription').textContent=state.mode==='collection'?c.description:'';
   $('distevenResultCount').textContent=data.items.length===1?'1 estilo':data.items.length+' estilos';
   const emptyFavorites=data.onlyFav&&!data.items.length;
   $('emptyTitle').textContent=emptyFavorites?'Nenhum favorito encontrado':'Nenhum resultado';
   $('emptyHint').textContent=emptyFavorites?'Use o coração nas fichas para guardar seus estilos favoritos.':'Tente outro termo, como o nome do seu negócio, um produto ou o código do estilo.';
   $('distevenEditSearch').hidden=emptyFavorites;
   const grouped=topic&&!data.onlyFav&&!data.query&&renderNiches(data,detail||topic);
   if(!grouped){delete $('grid').dataset.grouped;$('grid').innerHTML=data.shown.map(s=>card(s,state.mode==='collection')).join('');}
   $('grid').scrollLeft=gridScroll;
  }
  $('distevenEmpty').hidden=state.mode!=='home'||data.items.length>0;
  $('distevenHomeFavorites').hidden=state.mode!=='home';
  $('distevenSearchClear').hidden=!$('search').value;
  $('distevenCategoryToggle').classList.toggle('is-filtered',!!state.browseGroup);
  document.querySelectorAll('.disteven-choice-icon small').forEach(el=>el.hidden=!data.selected.length);
  if($('distevenChoice').open)renderChoice();
  syncNavigation(document.body.dataset.view);
 }
 function renderNiches(data,topic){
  const groups=model.groupByNiche(data.items,topic.sectors);
  if(groups.length<2)return false;
  const grid=$('grid');grid.dataset.grouped='true';$('loadMore').hidden=true;
  grid.innerHTML=groups.map(({id,label,styles})=>{
   const count=Math.max(gridColumns(),nicheVisible.get(id)||0);
   const more=styles.length>count?`<button type="button" class="text-button disteven-niche-more" data-niche-more="${id}" aria-label="Ver mais estilos em ${esc(label)}">Ver mais ${icon('arrow')}</button>`:'';
   return `<section class="disteven-niche-section" aria-labelledby="niche-${id}"><header><h2 id="niche-${id}">${esc(label)}</h2>${more}</header>${styles.slice(0,count).map(s=>card(s)).join('')}</section>`;
  }).join('');
  return true;
 }
 function renderHome(items){
  const key=state.goal+'|'+state.niche+'|'+items.map(s=>s.id).join(',');
  if(key!==homeKey){
   homeKey=key;
   const collections=state.goal==='mixed'?featuredCollections.map(model.collection):model.definitions.filter(c=>c.goal===state.goal);
   $('distevenCollections').innerHTML=collections.map(c=>{
    const styles=model.diversify(items.filter(s=>model.matchesCollection(s,c)),c.preferred);if(!styles.length)return '';
    return `<section class="disteven-shelf" aria-labelledby="disteven-shelf-${c.id}"><header><h2 id="disteven-shelf-${c.id}">${esc(c.title)}</h2><div class="disteven-shelf-tools"><button type="button" class="disteven-rail-arrow" data-disteven-rail="${c.id}" data-rail-direction="-1" aria-label="Estilos anteriores de ${esc(c.title)}">←</button><button type="button" class="disteven-rail-arrow" data-disteven-rail="${c.id}" data-rail-direction="1" aria-label="Mais estilos de ${esc(c.title)}">→</button><button type="button" data-disteven-collection="${c.id}" aria-label="Ver coleção: ${esc(c.title)}">Ver coleção ${icon('arrow')}</button></div></header><div class="disteven-shelf-rail" tabindex="0" role="region" aria-label="${esc(c.title)} — deslize para explorar">${styles.slice(0,8).map(s=>card(s)).join('')}<button type="button" class="disteven-more-card" data-disteven-collection="${c.id}"><span>${icon('arrow')}</span><strong>Explorar a coleção</strong><small>${styles.length} estilos</small></button></div></section>`;
   }).join('');
  }
  // Preserve scroll, keyboard focus and each shelf position when saving a favorite.
  for(const b of $('distevenCollections').querySelectorAll('[data-fav]')){
   const active=favorite(b.dataset.fav);b.setAttribute('aria-pressed',String(!!active));b.setAttribute('aria-label',`${active?'Remover dos':'Adicionar aos'} favoritos: ${window.AtlasApp.getStyle(b.dataset.fav).name}`);
  }
  for(const c of $('distevenCollections').querySelectorAll('[data-style-id]'))c.classList.toggle('is-selected',selected(c.dataset.styleId));
 }
 function refresh(){window.AtlasApp.refresh();}
 $('distevenBrowseAll').textContent='Ver todos →';
 function clearBrowse(){state.browseGroup='';state.browseTopic='';state.browseDetail='';}
 function catalogue({preserveFilter=false}={}){window.AtlasInlinePanels.reset();clearBrowse();state.niche='';state.mode='catalogue';state.collection='';state.similar='';gridScroll=0;closeMenu($('distevenCollectionTitle'));window.AtlasShell.view('library');if(preserveFilter)refresh();else window.AtlasApp.resetBrowse();}
 function home({restore=false}={}){
  window.AtlasInlinePanels.reset();
  setCategoryBar(false);clearBrowse();state.mode='home';state.collection='';state.similar='';gridScroll=0;closeMenu($('distevenDiscoveryTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  requestAnimationFrame(()=>{window.scrollTo({top:restore?homeScroll:0,behavior:'auto'});if(!restore)$('distevenDiscoveryTitle').focus({preventScroll:true});});
 }
 function openCollection(id){
  const c=model.collection(id);if(!c)return;
  clearBrowse();homeScroll=window.scrollY;state.mode='collection';state.collection=id;gridScroll=0;refresh();
  window.scrollTo({top:0,behavior:'auto'});$('distevenCollectionTitle').focus({preventScroll:true});
 }
 function syncNavigation(view){
  syncHeader(view);
  const skip=document.querySelector('.skip-link');let content=view==='help'?$('installTitle'):view==='brief'?$('briefTitle'):view==='library'?(state.mode==='home'?$('distevenDiscoveryTitle'):$('distevenCollectionTitle')):$('projectTitle');
  if(skip&&content){if(!content.id)content.id='distevenContentTitle';content.tabIndex=-1;skip.href='#'+content.id;skip.textContent='Pular para o conteúdo';}
  window.AtlasInlinePanels.onView(view);
  if(view!=='library'){setCategoryBar(false);closeMenu();if($('distevenChoice').open){$('distevenChoice').close();}}
  document.querySelectorAll('[data-disteven-home]').forEach(b=>b.setAttribute('aria-current',view==='library'?'page':'false'));
  document.querySelectorAll('[data-disteven-choice]').forEach(b=>b.setAttribute('aria-current',['brief','project'].includes(view)?'page':'false'));
 }
 const categoryBar=document.createElement('nav');categoryBar.id='distevenCategoryBar';categoryBar.className='disteven-category-bar';categoryBar.setAttribute('aria-label','Categorias de estilos');$('distevenHeader').insertBefore(categoryBar,$('distevenHeader').lastElementChild);
 const header=$('distevenHeader'),headerProgress=document.createElement('div');headerProgress.className='disteven-header-progress';
 const headerNext=document.createElement('button');headerNext.type='button';headerNext.id='distevenContinue';headerNext.className='primary';headerProgress.append(headerNext);header.insertBefore(headerProgress,header.lastElementChild);
 header.querySelector('[data-disteven-choice]').hidden=true;
 function syncHeader(view=document.body.dataset.view){
  const count=latest?.selected.length||0,inGuide=document.body.dataset.distevenPanel==='guidedDialog';
  const text=inGuide?$('guidedNext').textContent:view==='brief'?($('briefDialog').dataset.stage==='review'?'Abrir produção':'Revisar pedido'):count?'Meu vídeo':'Criar vídeo';
  const markup='<span>'+esc(text)+'</span>'+(count&&view!=='brief'&&!inGuide?'<small aria-label="'+count+' estilos escolhidos">'+count+'</small>':'');
  if(headerNext.innerHTML!==markup)headerNext.innerHTML=markup;
  headerNext.disabled=inGuide&&$('guidedNext').disabled;
 }
 headerNext.addEventListener('click',()=>{
  if(document.body.dataset.distevenPanel==='guidedDialog'){$('guidedNext').click();return;}
  if(document.body.dataset.view==='brief'){
   window.AtlasInlinePanels.reset();
   if($('briefDialog').dataset.stage==='review')$('chatLink').click();else $('prepare').click();return;
  }
  if(!latest?.selected.length||window.AtlasGuidedFlow?.hasDraft())$('startGuided').click();else window.AtlasShell.openBrief();
 });
 const stickySubcategories=matchMedia('(min-width: 1024px)');
 const mobileNavigation=matchMedia('(max-width: 700px)');
 const categoryToggle=$('distevenCategoryToggle');
 function setCategoryBar(open){
  if(open){document.body.dataset.distevenCategories='true';}
  else delete document.body.dataset.distevenCategories;
  categoryToggle.setAttribute('aria-expanded',String(open));
 }
 categoryToggle.addEventListener('click',()=>{
  const open=categoryToggle.getAttribute('aria-expanded')!=='true';
  setCategoryBar(open);
  if(open){window.scrollTo({top:0,behavior:'auto'});(categoryBar.querySelector('[aria-current=true]')||categoryBar.querySelector('button'))?.focus({preventScroll:true});}
  else{closeMenu(categoryToggle);categoryToggle.focus({preventScroll:true});}
  measureNavigation();
 });
 mobileNavigation.addEventListener?.('change',()=>{if(!mobileNavigation.matches)setCategoryBar(false);measureNavigation();});
 function measureNavigation(){
  const height=header.getBoundingClientRect().height;
  const total=height+(stickySubcategories.matches?$('distevenMenu').getBoundingClientRect().height:0);
  document.documentElement.style.setProperty('--disteven-header-height',height+'px');
  document.documentElement.style.setProperty('--disteven-navigation-height',total+'px');
  alignMenu();
 }
 if(globalThis.ResizeObserver){const observer=new ResizeObserver(measureNavigation);observer.observe(header);observer.observe(categoryBar);observer.observe($('distevenMenu'));}
 window.addEventListener('resize',measureNavigation);document.fonts?.ready?.then(measureNavigation);
 // iOS keeps the layout viewport behind the keyboard. Follow the visual
 // viewport instead, leaving room for its input accessory bar as well.
 const viewport=window.visualViewport;
 if(viewport){
  let viewportFrame=0,editingHeight=0,lastEdit=0;
  const editable=()=>{const e=document.activeElement;return e?.matches('textarea,input:not([type=checkbox],[type=radio],[type=file],[type=button],[type=submit],[type=reset],[type=range],[type=color],[type=hidden])')&&!e.disabled&&!e.readOnly?e:null;};
  function keepEditorVisible(){
   viewportFrame=0;const field=editable(),mobile=window.innerWidth<=700,height=viewport.height,normalHeight=height*(viewport.scale||1);
   if(!mobile||!field){delete document.body.dataset.distevenKeyboard;editingHeight=0;return;}
   if(!editingHeight)editingHeight=Math.max(window.innerHeight,document.documentElement.clientHeight,normalHeight);
   const keyboard=editingHeight-normalHeight>100;
   document.documentElement.style.setProperty('--disteven-viewport-height',height+'px');
   document.documentElement.style.setProperty('--disteven-keyboard-inset',Math.max(0,editingHeight-normalHeight)+'px');
   if(keyboard)document.body.dataset.distevenKeyboard='true';else delete document.body.dataset.distevenKeyboard;
   if(!keyboard)return;
   const top=Math.max(viewport.offsetTop,header.getBoundingClientRect().bottom)+12,bottom=viewport.offsetTop+height-48,rect=field.getBoundingClientRect();
   const delta=rect.height>bottom-top?rect.top-top:rect.bottom>bottom?rect.bottom-bottom:rect.top<top?rect.top-top:0;
   const desired=Math.max(0,window.scrollY+delta);
   if(field.id==='search'){
    const fieldBottom=rect.bottom-(desired-window.scrollY);
    document.documentElement.style.setProperty('--disteven-suggestions-room',Math.max(44,bottom-fieldBottom-8)+'px');
   }
   if(Math.abs(delta)>1)window.scrollTo({top:desired,behavior:'auto'});
  }
  const scheduleEditor=()=>{if(!viewportFrame)viewportFrame=requestAnimationFrame(keepEditorVisible);};
  document.addEventListener('focusin',()=>{lastEdit=Date.now();if(!document.body.dataset.distevenKeyboard)editingHeight=Math.max(window.innerHeight,document.documentElement.clientHeight,viewport.height*(viewport.scale||1));scheduleEditor();});
  document.addEventListener('focusout',scheduleEditor);document.addEventListener('input',()=>{lastEdit=Date.now();scheduleEditor();});
  viewport.addEventListener('resize',scheduleEditor);viewport.addEventListener('scroll',()=>{if(Date.now()-lastEdit<700)scheduleEditor();});window.addEventListener('resize',scheduleEditor);
 }
 function renderCategoryBar(){
  categoryBar.innerHTML=model.browseGroups.map(g=>`<button type="button" data-disteven-open-group="${esc(g.id)}" aria-controls="distevenMenu" aria-expanded="false"><span>${esc(g.label)}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg></button>`).join('');
 }
 function menuRows(){
  const group=model.browseGroup(menuGroup);
  $('distevenMenu').setAttribute('aria-label',group.label);
  $('distevenMenuLabel').textContent=group.label;
  const topics=group.topics.map(topic=>{
   const active=state.browseTopic===topic.id;
   const disclosure=topic.children.length?` aria-controls="distevenMenuDetail" aria-expanded="${active}"`:'';
   return `<button type="button" data-disteven-topic="${esc(topic.id)}" aria-current="${active}"${disclosure}><span>${esc(topic.label)}</span></button>`;
  }).join('');
  const active=group.topics.find(topic=>topic.id===state.browseTopic);
  const details=active?.children.map(detail=>
   `<button type="button" data-disteven-detail="${esc(detail.id)}" aria-current="${state.browseDetail===detail.id}"><span>${esc(detail.label)}</span></button>`
  ).join('')||'';
  $('distevenMenuGroups').innerHTML=`<div class="disteven-text-links">${topics}</div><div id="distevenMenuDetail" class="disteven-menu-refinements"${details?'':' hidden'} role="group" aria-label="${esc(active?.label||'Mais opções')}"><div class="disteven-text-links">${details}</div></div>`;
 }
 function alignMenu(){
  const menu=$('distevenMenu'),first=categoryBar.querySelector('button');if(menu.hidden||!first||!first.getClientRects().length)return;
  const firstBox=first.getBoundingClientRect(),barBox=categoryBar.getBoundingClientRect(),menuBox=menu.getBoundingClientRect(),padding=parseFloat(getComputedStyle(first).paddingLeft)||0;
  const start=Math.max(0,Math.max(barBox.left,firstBox.left+categoryBar.scrollLeft+padding)-menuBox.left);
  const available=Math.max(0,menuBox.width-start-(parseFloat(getComputedStyle(menu).paddingRight)||0));
  const columns=available>=800?4:available>=560?3:available>=310?2:1;
  menu.style.setProperty('--disteven-menu-start',start+'px');menu.style.setProperty('--disteven-menu-columns',String(columns));
 }
 function focusMenu(){$('distevenMenuGroups').querySelector('button')?.focus({preventScroll:true});}
 function closeMenu(destination){
  if($('distevenMenu').hidden)return;
  $('distevenMenu').hidden=true;measureNavigation();if(!destination&&!stickySubcategories.matches)window.scrollTo({top:menuScroll,behavior:'auto'});categoryBar.querySelectorAll('[aria-expanded]').forEach(b=>b.setAttribute('aria-expanded','false'));
  const target=destination||menuTrigger,focusTarget=target?.isConnected&&target.getClientRects().length?target:categoryBar.querySelector('button');
  if(focusTarget?.parentElement===categoryBar){const box=focusTarget.getBoundingClientRect(),bar=categoryBar.getBoundingClientRect();if(box.left<bar.left)categoryBar.scrollLeft-=bar.left-box.left;else if(box.right>bar.right)categoryBar.scrollLeft+=box.right-bar.right;}
  focusTarget?.focus({preventScroll:true});
 }
 function showMenu(trigger,group='',keyboard=false){
  if(!$('distevenMenu').hidden&&menuTrigger===trigger){closeMenu();return;}
  if($('distevenMenu').hidden)menuScroll=window.scrollY;window.AtlasInlinePanels.reset();menuTrigger=trigger;menuGroup=group;menuRows();$('distevenMenu').hidden=false;
  window.scrollTo({top:0,behavior:'auto'});categoryBar.querySelectorAll('[data-disteven-open-group][aria-expanded]').forEach(b=>b.setAttribute('aria-expanded',String(b===trigger)));measureNavigation();if(keyboard)focusMenu();
 }
 function selectCategory(group,topic='',detail='',keepMenu=false){
  window.AtlasInlinePanels.reset();
  nicheVisible.clear();

  state.browseGroup=group;state.browseTopic=topic;state.browseDetail=detail;
  state.mode='catalogue';state.collection='';state.similar='';state.niche='';gridScroll=0;
  if(!keepMenu){closeMenu($('distevenCollectionTitle'));if(mobileNavigation.matches)setCategoryBar(false);}
  window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  $('distevenCollectionTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
 }
 function renderChoice(){
  const ids=latest.selected;$('distevenChoiceHelp').textContent=ids.length?'Um estilo orienta seu vídeo. Você pode trocar a referência a qualquer momento.':'Explore uma coleção e escolha um estilo.';
  $('distevenChoiceItems').innerHTML=ids.map((id,i)=>{const s=window.AtlasApp.getStyle(id);return `<article class="disteven-chosen"><button type="button" data-detail="${esc(id)}" aria-label="Examinar ${esc(s.name)}">${picture(s)}</button><div><small>${i===0?'Estilo principal':'Referência complementar'}</small><h3>${esc(s.name)}</h3><button type="button" class="text-button" data-similar="${esc(id)}">Procurar estilos parecidos</button></div><button type="button" data-remove="${esc(id)}" class="disteven-icon-button" aria-label="Remover ${esc(s.name)} da minha escolha">${AtlasViews.closeIcon}</button></article>`;}).join('');
  $('distevenChoiceContinue').disabled=!ids.length;
 }
 function showChoice(trigger){window.AtlasInlinePanels.reset();renderChoice();$('distevenChoice').showModal();}
 function similar(id){if(!window.AtlasApp.getStyle(id))return;window.AtlasInlinePanels.reset();clearBrowse();state.mode='catalogue';state.collection='';state.niche='';state.similar=id;gridScroll=0;closeMenu($('distevenCollectionTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();$('distevenCollectionTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
 window.AtlasDiSteven={filter,beforeRender,update,onView:syncNavigation,getState:()=>({...state}),syncHeader,similar,showChoice,showCatalogue:catalogue,
  getNavigationState:()=>({...state,nicheVisible:[...nicheVisible],menuGroup:$('distevenMenu').hidden?'':menuGroup}),
  restoreNavigation({nicheVisible:counts,menuGroup:group,...saved}){
   Object.assign(state,saved);nicheVisible.clear();counts.forEach(([id,count])=>nicheVisible.set(id,count));
   gridScroll=0;setCategoryBar(false);closeMenu($('distevenCollectionTitle'));
   if(group&&document.body.dataset.view==='library'&&stickySubcategories.matches){
    const trigger=categoryBar.querySelector('[data-disteven-open-group="'+CSS.escape(group)+'"]');
    if(trigger){menuGroup=group;menuTrigger=trigger;menuRows();$('distevenMenu').hidden=false;trigger.setAttribute('aria-expanded','true');measureNavigation();}
   }
  },
  openLinkedCollection([id,topic='',detail='']){
   if(model.browseGroup(id))selectCategory(id,topic,detail);
   else if(model.collection(id))openCollection(id);
   else if(window.AtlasApp.getStyle(id))similar(id);
  },
 };
 // Listeners are installed before app.js: a free-text search starts across all styles.
 $('search').addEventListener('input',()=>{clearBrowse();if(!$('distevenMenu').hidden){closeMenu($('search'));}setCategoryBar(false);state.mode=$('search').value.trim()?'catalogue':'home';state.collection='';state.similar='';state.niche='';gridScroll=0;});
 $('reset').addEventListener('click',()=>{clearBrowse();state.mode='catalogue';state.collection='';state.similar='';state.niche='';requestAnimationFrame(()=>$('distevenCollectionTitle').focus({preventScroll:true}));});
 $('distevenHomeFavorites').addEventListener('click',()=>{$('favoriteFilter').click();$('distevenCollectionTitle').focus({preventScroll:true});});
 $('distevenEditSearch').addEventListener('click',()=>{$('search').focus();$('search').select();});
 $('distevenSearchClear').addEventListener('click',()=>{const input=$('search');input.value='';input.focus({preventScroll:true});input.dispatchEvent(new Event('input',{bubbles:true}));});
 $('searchEverywhere').addEventListener('click',()=>{state.mode='catalogue';state.collection='';state.similar='';state.niche='';});
 $('familySelect').addEventListener('change',()=>{state.mode='catalogue';state.collection='';state.similar='';state.niche='';gridScroll=0;});
 $('distevenNiche').addEventListener('change',()=>{state.niche=$('distevenNiche').value;gridScroll=0;refresh();});
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.defaultPrevented)return;
  if(!$('distevenMenu').hidden){e.preventDefault();closeMenu();}
  else if(categoryToggle.getAttribute('aria-expanded')==='true'){e.preventDefault();setCategoryBar(false);categoryToggle.focus({preventScroll:true});}
 });
 $('distevenChoiceContinue').addEventListener('click',()=>{$('distevenChoice').close();window.AtlasShell.openBrief();});
 $('distevenBack').addEventListener('click',()=>home({restore:true}));$('distevenChangeGoal').addEventListener('click',()=>home());
 $('distevenBrowseAll').addEventListener('click',catalogue);
 document.addEventListener('click',e=>{
  const t=e.target;
  const more=t.closest('[data-niche-more]');
  if(more){
   const section=more.closest('.disteven-niche-section'),count=section.querySelectorAll('.disteven-card').length;
   nicheVisible.set(more.dataset.nicheMore,count+gridColumns()*2);
   refresh();
   document.getElementById(section.getAttribute('aria-labelledby'))?.closest('section').querySelectorAll('.disteven-cover')[count]?.focus();
   return;
  }
  const goal=t.closest('[data-disteven-goal]');if(goal){state.goal=goal.dataset.distevenGoal;state.mode='home';state.collection='';state.similar='';homeKey='';refresh();}
  const rail=t.closest('[data-disteven-rail]');if(rail){const region=$('disteven-shelf-'+rail.dataset.distevenRail).closest('section').querySelector('.disteven-shelf-rail');region.scrollBy({left:Number(rail.dataset.railDirection)*region.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  const collection=t.closest('[data-disteven-collection]');if(collection)openCollection(collection.dataset.distevenCollection);
  if(t.closest('[data-disteven-back]'))home({restore:true});
  if(t.closest('[data-disteven-close-categories]')){closeMenu(categoryToggle);setCategoryBar(false);categoryToggle.focus({preventScroll:true});}
  if(t.closest('[data-disteven-home]')){e.preventDefault();home();}
  const choice=t.closest('[data-disteven-choice]');if(choice)showChoice(choice);
  const closer=t.closest('[data-disteven-close]');if(closer){if(closer.closest('#distevenMenu'))closeMenu();else closer.closest('dialog')?.close();}
  const openGroup=t.closest('[data-disteven-open-group]');
  if(openGroup){
   const group=openGroup.dataset.distevenOpenGroup;
   const wasOpen=!$('distevenMenu').hidden&&menuGroup===group;
   if(wasOpen){closeMenu(openGroup);return;}
   selectCategory(group);
   if(mobileNavigation.matches)setCategoryBar(true);
   showMenu(openGroup,group,e.detail===0);
  }
  const topic=t.closest('[data-disteven-topic]');
  if(topic){
   const item=model.browseGroup(menuGroup).topics.find(value=>value.id===topic.dataset.distevenTopic);
   const hasDetails=!!item.children.length;
   selectCategory(menuGroup,item.id,'',hasDetails||stickySubcategories.matches);
   if(!$('distevenMenu').hidden){menuRows();measureNavigation();}
   if(hasDetails&&e.detail===0)$('distevenMenuDetail')?.querySelector('button')?.focus({preventScroll:true});
  }
  const detail=t.closest('[data-disteven-detail]');
  if(detail)selectCategory(menuGroup,state.browseTopic,detail.dataset.distevenDetail,stickySubcategories.matches);
 });
 window.addEventListener('atlas:ready',()=>{
  catalog=window.AtlasApp.getCatalog();niches=model.niches(catalog.styles);
  $('distevenNiche').innerHTML='<option value="">Todos os nichos</option>'+niches.map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
  renderCategoryBar();ready=true;refresh();document.body.dataset.disteven='true';
 });
})();
