/* Keep the browser's form control and provide the same picker theme where CSS cannot. */
(()=>{
 if(CSS.supports('(appearance:base-select) and selector(::picker(select))'))return;
 document.documentElement.dataset.folioSelectFallback='';
 const selector='body[data-folio=true] select:not([multiple],[size],.sr,:disabled)';
 const menu=document.createElement('div');
 menu.id='folio-select-menu';menu.className='folio-select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Opções');
 let select=null,entries=[],active=-1,typed='',lastTyped=0;

 function position(){
  if(!select)return;
  const rect=select.getBoundingClientRect(),view=window.visualViewport;
  const left=view?.offsetLeft||0,top=view?.offsetTop||0,width=view?.width||innerWidth,height=view?.height||innerHeight;
  if(!rect.width||rect.bottom<top||rect.top>top+height){close();return;}
  const below=top+height-rect.bottom-8,above=rect.top-top-8,up=below<Math.min(menu.scrollHeight,240)&&above>below;
  const menuWidth=Math.min(Math.max(rect.width,160),width-16);
  menu.style.width=menuWidth+'px';menu.style.left=Math.max(left+8,Math.min(rect.left,left+width-menuWidth-8))+'px';
  menu.style.maxHeight=Math.max(0,Math.min(320,up?above:below))+'px';
  menu.style.top=(up?rect.top-menu.offsetHeight-4:rect.bottom+4)+'px';
 }
 function close(){
  if(!select)return;
  select.setAttribute('aria-expanded','false');select.removeAttribute('aria-controls');select.removeAttribute('aria-activedescendant');
  menu.remove();select=null;entries=[];active=-1;typed='';
 }
 function activate(index){
  if(index===-1)return;
  entries[active]?.removeAttribute('data-active');active=index;
  const item=entries[active];item.setAttribute('data-active','');select.setAttribute('aria-activedescendant',item.id);
  const rect=item.getBoundingClientRect(),panel=menu.getBoundingClientRect();
  if(rect.top<panel.top)menu.scrollTop-=panel.top-rect.top;
  if(rect.bottom>panel.bottom)menu.scrollTop+=rect.bottom-panel.bottom;
 }
 function open(control){
  close();select=control;
  const groups=new Map();
  menu.replaceChildren();
  for(const option of control.options){
   const group=option.parentElement;
   if(option.hidden||group.hidden)continue;
   let host=menu;
   if(group.tagName==='OPTGROUP'){
    if(!groups.has(group)){
     const container=document.createElement('div'),label=document.createElement('div');
     container.setAttribute('role','group');container.setAttribute('aria-label',group.label);
     label.textContent=group.label;label.setAttribute('aria-hidden','true');container.append(label);menu.append(container);groups.set(group,container);
    }
    host=groups.get(group);
   }
   const item=document.createElement('div');item.id=`${menu.id}-${option.index}`;item.dataset.index=option.index;
   item.textContent=option.label;item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.selected));
   if(option.disabled||group.disabled&&group.tagName==='OPTGROUP')item.setAttribute('aria-disabled','true');
   entries.push(item);host.append(item);
  }
  if(!entries.length){close();return;}
  (control.closest('dialog[open]')||document.body).append(menu);
  menu.scrollTop=0;select.setAttribute('aria-expanded','true');select.setAttribute('aria-controls',menu.id);
  position();
  if(select)activate(entries.findIndex(item=>item.getAttribute('aria-selected')==='true'&&!item.hasAttribute('aria-disabled')));
 }
 function choose(item){
  if(!select||!item||item.hasAttribute('aria-disabled'))return;
  const control=select,index=Number(item.dataset.index),changed=control.selectedIndex!==index;
  control.selectedIndex=index;close();
  if(changed){control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));}
 }

 document.addEventListener('pointerdown',event=>{
  if(event.target.closest(selector))event.preventDefault();
  else if(!menu.contains(event.target))close();
  else event.preventDefault();
 },true);
 document.addEventListener('click',event=>{
  const control=event.target.closest(selector);
  if(!control)return;
  event.preventDefault();control.focus({preventScroll:true});
  if(select===control)close();else open(control);
 },true);
 menu.addEventListener('click',event=>choose(event.target.closest('[role=option]')));
 document.addEventListener('focusin',event=>{if(event.target!==select)close();});
 document.addEventListener('keydown',event=>{
  const control=event.target.closest(selector);
  if(!control)return;
  const key=event.key,moves=['ArrowDown','ArrowUp','Home','End'];
  if(key==='Tab'){close();return;}
  if(event.ctrlKey||event.metaKey||event.altKey&&!moves.includes(key))return;
  const printable=key.length===1&&key!==' ';
  if(!moves.includes(key)&&key!==' '&&key!=='Enter'&&!(key==='Escape'&&select)&&!printable)return;
  event.preventDefault();event.stopPropagation();
  if(key==='Escape'){close();return;}
  const wasOpen=select===control;
  if(!wasOpen)open(control);
  if(!select)return;
  if(key==='Enter'||key===' '){if(wasOpen)choose(entries[active]);return;}
  const enabled=entries.map((entry,index)=>entry.hasAttribute('aria-disabled')?-1:index).filter(index=>index>=0);
  if(!enabled.length)return;
  if(printable){
   const now=Date.now(),letter=key.toLocaleLowerCase('pt-BR');
   typed=now-lastTyped>700||typed===letter?letter:typed+letter;lastTyped=now;
   const start=typed.length===1?enabled.indexOf(active)+1:Math.max(0,enabled.indexOf(active));
   const ordered=[...enabled.slice(start),...enabled.slice(0,start)];
   activate(ordered.find(index=>entries[index].textContent.trim().toLocaleLowerCase('pt-BR').startsWith(typed))??-1);
   return;
  }
  const current=enabled.indexOf(active);
  if(key==='Home')activate(enabled[0]);
  else if(key==='End')activate(enabled.at(-1));
  else if(key==='ArrowDown')activate(enabled[Math.min(enabled.length-1,current+1)]);
  else activate(enabled[current<0?enabled.length-1:Math.max(0,current-1)]);
 },true);
 window.addEventListener('resize',position);
 window.visualViewport?.addEventListener('resize',position);
 document.addEventListener('scroll',event=>{if(!menu.contains(event.target))position();},true);
})();
