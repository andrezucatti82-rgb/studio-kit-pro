/* Fólio adapts the real atlas: goals/niches are discovery, never project edits. */
(()=>{
 const $=id=>document.getElementById(id),model=globalThis.FolioCollections;
 if(!model||!$('folioCollections'))return;
 const esc=value=>AtlasViews.esc(value),base=()=>window.ATLAS_ASSET_BASE||'';
 const icons={heart:'<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C0 9 6 15 12 21c6-6 12-12 8-16Z"/>',bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>'};
 const icon=id=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${icons[id]||icons.arrow}</svg>`;
 let ready=false,niches=[],catalog,latest,homeKey='',menuGroup='',menuTrigger,menuDestination,choiceTrigger,gridScroll=0,homeScroll=0;
 const state={goal:'explain',mode:'home',collection:'',niche:''};
 const selected=id=>latest?.selected.includes(id),favorite=id=>latest?.favorites.includes(id);
 function picture(s,small=true){
  if(s.sequence)return AtlasViews.picture(s,s.sequence.heroIndex??1,base(),'folio-photo',small);
  // Full standalone sources can be fitted without manufacturing a portrait crop.
  if(s.image.columns===1)return `<img class="folio-photo" src="${esc((window.ATLAS_IMAGE_ASSET_BASE||base())+s.image.atlas)}" alt="${esc(s.name)}" loading="lazy" decoding="async">`;
  return `<span class="folio-missing">O estudo completo está na ficha do estilo</span>`;
 }
 function card(s,large=false){
  return `<article class="folio-card${large?' folio-card-expanded':''}${selected(s.id)?' is-selected':''}" data-style-id="${esc(s.id)}"><button type="button" class="folio-cover" data-detail="${esc(s.id)}" aria-label="Ver ${esc(s.name)}"><span class="folio-portrait">${picture(s)}<span class="folio-reference">Referência visual</span></span></button><div class="folio-card-footer"><div class="folio-card-title"><h3><button type="button" data-detail="${esc(s.id)}">${esc(s.name)}</button></h3><button type="button" class="folio-save" data-fav="${esc(s.id)}" aria-pressed="${!!favorite(s.id)}" aria-label="${favorite(s.id)?'Remover dos':'Adicionar aos'} favoritos: ${esc(s.name)}">${icon(large?'bookmark':'heart')}</button></div>${large?`<div class="folio-card-actions"><span>${s.sequence?'4 quadros':'Estudo visual'}</span><button type="button" data-choose="${esc(s.id)}" class="folio-add" aria-pressed="${!!selected(s.id)}" aria-label="${selected(s.id)?'Remover':'Adicionar'} ${esc(s.name)} ${selected(s.id)?'da':'à'} minha escolha">${selected(s.id)?'Adicionado ✓':'Adicionar +'}</button></div>`:''}</div>${!large&&state.mode==='catalogue'?`<label class="folio-compare"><input type="checkbox" data-compare="${esc(s.id)}" ${latest?.compared.includes(s.id)?'checked':''}>Comparar</label>`:''}${large?`<button type="button" class="folio-story-link" data-detail="${esc(s.id)}">Ver os momentos ${icon('arrow')}</button>`:''}</article>`;
 }
 function filter(items){
  const c=model.collection(state.collection);
  const result=items.filter(s=>model.matchesNiche(s,state.niche,niches)&&(state.mode!=='collection'||model.matchesCollection(s,c)));
  return state.mode==='collection'?model.diversify(result,c?.preferred):result;
 }
 function beforeRender(){gridScroll=$('grid').scrollLeft;}
 function update(data){
  latest=data;if(!ready)return;
  // A URL category, legacy category control or filter is still a real catalogue.
  if(state.mode==='home'&&(data.family||data.group||data.query||data.onlyFav||data.onlyVideo||data.kind))state.mode='catalogue';
  document.body.dataset.folioMode=state.mode;
  $('folioDiscovery').hidden=state.mode!=='home';$('folioCollectionHeading').hidden=state.mode==='home';
  $('folioChangeGoal').hidden=state.mode!=='collection';$('folioBrowseAll').hidden=state.mode!=='home';
  $('folioCollections').hidden=state.mode!=='home';$('grid').hidden=state.mode==='home';
  $('folioNiche').value=state.niche;
  document.querySelectorAll('[data-folio-goal]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.folioGoal===state.goal)));
  if(state.mode==='home')renderHome(data.items);
  else{
   const c=model.collection(state.collection);
   $('folioCollectionTitle').textContent=state.mode==='collection'?c.title:data.onlyFav?'Seus favoritos':data.query?'Resultados da busca':data.family?catalog.families.find(f=>f.id===data.family)?.name:data.group?window.AtlasNavigation.groups.find(g=>g.id===data.group)?.name:'Todos os estilos';
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
   $('folioCollections').innerHTML=model.definitions.filter(c=>c.goal===state.goal).map(c=>{
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
 function catalogue(){state.niche='';state.mode='catalogue';state.collection='';gridScroll=0;closeMenu($('folioCollectionTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();}
 function home({restore=false}={}){
  state.mode='home';state.collection='';gridScroll=0;closeMenu($('folioDiscoveryTitle'));window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  requestAnimationFrame(()=>{window.scrollTo({top:restore?homeScroll:0,behavior:'auto'});if(!restore)$('folioDiscoveryTitle').focus({preventScroll:true});});
 }
 function openCollection(id){
  const c=model.collection(id);if(!c)return;
  homeScroll=window.scrollY;state.mode='collection';state.collection=id;gridScroll=0;refresh();
  window.scrollTo({top:0,behavior:'auto'});$('folioCollectionTitle').focus({preventScroll:true});
 }
 function syncNavigation(view){
  if(view!=='library'){closeMenu();if($('folioChoice').open){choiceTrigger=view==='brief'?$('briefTitle'):choiceTrigger;$('folioChoice').close();}}
  document.querySelectorAll('[data-folio-home]').forEach(b=>b.setAttribute('aria-current',view==='library'?'page':'false'));
  document.querySelectorAll('[data-folio-choice]').forEach(b=>b.setAttribute('aria-current',['brief','project'].includes(view)?'page':'false'));
 }
 function menuRows(){
  const q=String($('folioMenuSearch').value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const groups=window.AtlasNavigation.groups;let rows=0;
  $('folioMenuGroups').innerHTML=groups.map(g=>{
   const families=g.families.map(id=>catalog.families.find(f=>f.id===id));
   const matched=families.filter(f=>!q||norm(f.name+' '+g.name).includes(q));
   if(!matched.length)return '';rows++;
   const direct=!!g.directFamily,expanded=!!q||menuGroup===g.id;
   return `<section class="folio-menu-group"><button type="button" data-folio-group="${g.id}" ${direct?'':`aria-expanded="${expanded}" aria-controls="folio-menu-${g.id}"`}><span>${esc(g.name)}</span><small>${families.reduce((n,f)=>n+f.count,0)}</small><span aria-hidden="true">${direct?'→':expanded?'−':'+'}</span></button>${direct?'':`<div id="folio-menu-${g.id}" ${expanded?'':'hidden'}><button type="button" data-folio-category-group="${g.id}">Ver todos deste grupo ${icon('arrow')}</button>${matched.map(f=>`<button type="button" data-folio-family="${f.id}">${esc(f.name)} <small>${f.count}</small></button>`).join('')}</div>`}</section>`;
  }).join('');
  const segments=q?niches.filter(n=>norm(n.name).includes(q)):[];
  if(segments.length){rows+=segments.length;$('folioMenuGroups').insertAdjacentHTML('beforeend',`<section class="folio-menu-segments"><h3>Segmentos</h3>${segments.map(n=>`<button type="button" data-folio-niche="${esc(n.id)}">${esc(n.name)} ${icon('arrow')}</button>`).join('')}</section>`);}
  $('folioMenuEmpty').hidden=rows>0;
 }
 function closeMenu(destination){if(destination)menuDestination=destination;if($('folioMenu').open){menuDestination=menuDestination||menuTrigger;$('folioMenu').close();}}
 function showMenu(trigger){menuTrigger=trigger;menuDestination=null;menuRows();$('folioMenu').showModal();$('folioOpenMenu').setAttribute('aria-expanded','true');$('folioMenuSearch').focus();}
 function selectCategory({family='',group=''}={}){
  state.mode='catalogue';state.collection='';state.niche='';gridScroll=0;closeMenu($('folioCollectionTitle'));
  window.AtlasShell.view('library');window.AtlasApp.resetBrowse();
  if(group)window.AtlasApp.setCategoryGroup(group);
  else if(family){$('familySelect').value=family;$('familySelect').dispatchEvent(new Event('change',{bubbles:true}));}
  $('folioCollectionTitle').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
 }
 function renderChoice(){
  const ids=latest.selected;$('folioChoiceHelp').textContent=ids.length?`${ids.length} de 10 estilos. O primeiro orienta o vídeo; os demais podem contribuir com detalhes.`:'Sua escolha começa com uma referência. Explore uma coleção e toque em Adicionar.';
  $('folioChoiceItems').innerHTML=ids.map((id,i)=>{const s=window.AtlasApp.getStyle(id);return `<article class="folio-chosen"><button type="button" data-detail="${esc(id)}" aria-label="Examinar ${esc(s.name)}">${picture(s)}</button><div><small>${i===0?'Estilo principal':'Referência complementar'}</small><h3>${esc(s.name)}</h3><button type="button" class="text-button" data-contributions="${esc(id)}">Escolher características →</button></div><button type="button" data-remove="${esc(id)}" class="folio-icon-button" aria-label="Remover ${esc(s.name)} da minha escolha">×</button></article>`;}).join('');
  $('folioChoiceContinue').disabled=!ids.length;
 }
 function showChoice(trigger){choiceTrigger=trigger;renderChoice();$('folioChoice').showModal();}
 window.AtlasFolio={filter,beforeRender,update,onView:syncNavigation,getState:()=>({...state})};
 // Listeners are installed before app.js: a free-text search starts across all styles.
 $('search').addEventListener('input',()=>{state.mode=$('search').value.trim()?'catalogue':'home';state.collection='';state.niche='';gridScroll=0;});
 $('reset').addEventListener('click',()=>{state.mode='home';state.collection='';state.niche='';});
 $('searchEverywhere').addEventListener('click',()=>{state.mode='catalogue';state.collection='';state.niche='';});
 $('familySelect').addEventListener('change',()=>{state.mode='catalogue';state.collection='';state.niche='';gridScroll=0;});
 $('folioNiche').addEventListener('change',()=>{state.niche=$('folioNiche').value;gridScroll=0;refresh();});
 $('folioOpenMenu').addEventListener('click',e=>showMenu(e.currentTarget));
 $('folioMenuSearch').addEventListener('input',menuRows);
 $('folioMenu').addEventListener('close',()=>{$('folioOpenMenu').setAttribute('aria-expanded','false');(menuDestination||menuTrigger)?.focus({preventScroll:true});menuDestination=null;});
 $('folioChoice').addEventListener('close',()=>choiceTrigger?.focus({preventScroll:true}));
 for(const id of ['folioMenu','folioChoice'])$(id).addEventListener('click',e=>{if(e.target===$(id)){const r=$(id).getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$(id).close();}});
 $('folioChoiceContinue').addEventListener('click',()=>{choiceTrigger=$('briefTitle');$('folioChoice').close();window.AtlasShell.openBrief();});
 $('folioBack').addEventListener('click',()=>home({restore:true}));$('folioChangeGoal').addEventListener('click',()=>home());
 $('folioBrowseAll').addEventListener('click',catalogue);
 document.addEventListener('click',e=>{
  const t=e.target;
  const goal=t.closest('[data-folio-goal]');if(goal){state.goal=goal.dataset.folioGoal;state.mode='home';state.collection='';homeKey='';refresh();}
  const rail=t.closest('[data-folio-rail]');if(rail){const region=$('folio-shelf-'+rail.dataset.folioRail).closest('section').querySelector('.folio-shelf-rail');region.scrollBy({left:Number(rail.dataset.railDirection)*region.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  const collection=t.closest('[data-folio-collection]');if(collection)openCollection(collection.dataset.folioCollection);
  if(t.closest('[data-folio-back]'))home({restore:true});
  if(t.closest('[data-folio-home]')){e.preventDefault();home();}
  const choice=t.closest('[data-folio-choice]');if(choice)showChoice(choice);
  const closer=t.closest('[data-folio-close]');if(closer)closer.closest('dialog')?.close();
  if(t.closest('#folioMenu [data-install-open]'))closeMenu($('installTitle'));
  const group=t.closest('[data-folio-group]');if(group){const g=window.AtlasNavigation.groups.find(g=>g.id===group.dataset.folioGroup);if(g.directFamily)selectCategory({family:g.directFamily});else{menuGroup=menuGroup===g.id?'':g.id;menuRows();$('folioMenuGroups').querySelector(`[data-folio-group="${g.id}"]`).focus();}}
  const niche=t.closest('[data-folio-niche]');if(niche){state.niche=niche.dataset.folioNiche;home();}
  const family=t.closest('[data-folio-family]');if(family)selectCategory({family:family.dataset.folioFamily});
  const allGroup=t.closest('[data-folio-category-group]');if(allGroup)selectCategory({group:allGroup.dataset.folioCategoryGroup});
  if(t.closest('[data-folio-all]')){state.niche='';catalogue();}
  if(t.closest('[data-folio-favorites]')){state.niche='';catalogue();$('favoriteFilter').click();}
 });
 window.addEventListener('atlas:ready',()=>{
  catalog=window.AtlasApp.getCatalog();niches=model.niches(catalog.styles);
  $('folioNiche').innerHTML='<option value="">Todos os nichos</option>'+niches.map(n=>`<option value="${esc(n.id)}">${esc(n.name)}</option>`).join('');
  ready=true;document.body.dataset.folio='true';refresh();
  if(!window.ATLAS_PAGE_MODE&&window.location.hash==='#briefSection')window.AtlasShell.openBrief();
 });
})();
