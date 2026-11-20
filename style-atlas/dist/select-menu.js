/* The fallback button owns interaction. The select retains the form value. */
(()=>{
 if(CSS.supports('(appearance:base-select) and selector(::picker(select))'))return;
 document.documentElement.dataset.distevenSelectFallback='';
 const selector='select:not([multiple],[size],.sr)';
 const fields=new WeakMap(),controls=new WeakMap();
 const menu=document.createElement('div');
 menu.id='disteven-select-menu';menu.className='disteven-select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Opções');
 let select=null,trigger=null,entries=[],active=-1,typed='',lastTyped=0,touchOption=null;

 function sync(control){
  const field=fields.get(control);
  if(!field)return;
  field.button.disabled=control.disabled;
  const value=control.selectedOptions[0]?.label;
  field.button.setAttribute('aria-label',[field.label,value].filter(Boolean).join(': '));
 }
 function enhance(control){
  if(fields.has(control))return;
  const label=control.labels?.[0]?.cloneNode(true);
  label?.querySelectorAll('select,input,textarea,button').forEach(node=>node.remove());
  const name=control.getAttribute('aria-label')||label?.textContent.trim()||'Opções';
  const wrapper=document.createElement('span'),button=document.createElement('button');
  wrapper.className='disteven-select-field';
  button.type='button';button.className='disteven-select-trigger';
  button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  fields.set(control,{button,label:name});controls.set(button,control);
  control.tabIndex=-1;control.setAttribute('aria-hidden','true');
  control.before(wrapper);wrapper.append(control,button);sync(control);
 }
 function scan(node){
  if(node.matches?.(selector))enhance(node);
  node.querySelectorAll?.(selector).forEach(enhance);
 }
 // Briefing rows can be added or replaced after the page is ready.
 if(document.body.matches('[data-disteven-startup],[data-disteven=true]')){
  scan(document.body);
  new MutationObserver(records=>{
   for(const record of records){
    const control=record.target.closest?.('select');
    if(control)sync(control);
    if(record.type==='childList')record.addedNodes.forEach(scan);
   }
   if(select&&(!select.isConnected||select.disabled))close();
  }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
 }

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
  trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');trigger.removeAttribute('aria-activedescendant');
  menu.remove();select=null;trigger=null;entries=[];active=-1;typed='';touchOption=null;
 }
 function activate(index){
  if(index===-1)return;
  entries[active]?.removeAttribute('data-active');active=index;
  const item=entries[active];item.setAttribute('data-active','');trigger.setAttribute('aria-activedescendant',item.id);
  const rect=item.getBoundingClientRect(),panel=menu.getBoundingClientRect();
  if(rect.top<panel.top)menu.scrollTop-=panel.top-rect.top;
  if(rect.bottom>panel.bottom)menu.scrollTop+=rect.bottom-panel.bottom;
 }
 function open(control){
  close();select=control;trigger=fields.get(control).button;
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
  menu.scrollTop=0;trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-controls',menu.id);
  position();
  if(select)activate(entries.findIndex(item=>item.getAttribute('aria-selected')==='true'&&!item.hasAttribute('aria-disabled')));
 }
 function choose(item){
  if(!select||!item||item.hasAttribute('aria-disabled'))return;
  const control=select,index=Number(item.dataset.index),changed=control.selectedIndex!==index;
  control.selectedIndex=index;sync(control);close();
  if(changed){control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));}
 }
 function toggle(control){
  if(control.disabled)return;
  fields.get(control).button.focus({preventScroll:true});
  if(select===control)close();else open(control);
 }

 document.addEventListener('pointerdown',event=>{
  if(!menu.contains(event.target)&&!event.target.closest('.disteven-select-field'))close();
 },true);
 document.addEventListener('click',event=>{
  const target=event.target;
  const buttonControl=controls.get(target);
  if(!buttonControl&&target.closest('button,input,textarea,a'))return;
  const control=buttonControl||target.closest('label')?.control;
  if(!fields.has(control))return;
  event.preventDefault();
  toggle(control);
 },true);
 // Preserve focus on the trigger until the option is committed, including
 // WebKit's focus change before a synthesized click on a tapped option.
 menu.addEventListener('mousedown',event=>event.preventDefault());
 menu.addEventListener('click',event=>choose(event.target.closest('[role=option]')));
 menu.addEventListener('touchstart',event=>{
  const item=event.target.closest('[role=option]'),touch=event.changedTouches[0];
  touchOption=item&&event.touches.length===1?{item,id:touch.identifier,x:touch.clientX,y:touch.clientY}:null;
 },{passive:true});
 menu.addEventListener('touchend',event=>{
  const start=touchOption;touchOption=null;
  if(!start)return;
  const touch=[...event.changedTouches].find(candidate=>candidate.identifier===start.id);
  if(!touch||Math.hypot(touch.clientX-start.x,touch.clientY-start.y)>10)return;
  event.preventDefault();
  choose(start.item);
 },{passive:false});
 menu.addEventListener('touchcancel',()=>{touchOption=null;});

 document.addEventListener('change',event=>sync(event.target),true);
 document.addEventListener('focusin',event=>{
  const button=fields.get(event.target)?.button;
  if(button){button.focus({preventScroll:true});return;}
  const control=controls.get(event.target);
  if(control)sync(control);
  if(event.target!==trigger)close();
 });
 document.addEventListener('keydown',event=>{
  const control=controls.get(event.target);
  if(!control||control.disabled)return;
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
