/* Files stay in memory until the visitor explicitly sends the production package. */
(()=>{
 const files=new Map();
 const $=id=>document.getElementById(id);
 function init(){
  const workflow=AtlasWorkflow,esc=AtlasViews.esc,panels=[$('briefMaterialAssignments'),$('guidedMaterialAssignments')].filter(Boolean);
  const options=(labels,current)=>Object.entries(labels).map(([id,label])=>`<option value="${id}"${id===current?' selected':''}>${esc(label)}</option>`).join('');
  const record=(label,kind,source)=>({id:crypto.randomUUID(),label,kind,source,roles:[],rights:{image:'pending',voice:'pending'}});
  let previous='';
  function render(){
   const rows=AtlasCurrentChoice().materialAssignments;
   const key=JSON.stringify(rows.map(row=>[row,files.has(row.id)]));
   if(previous===key)return;
   previous=key;
   for(const id of files.keys())if(!rows.some(row=>row.id===id))files.delete(id);
   for(const panel of panels){
    const list=panel.querySelector('[data-material-list]');
    const active=document.activeElement?.dataset.materialFocus;
    list.innerHTML=rows.map(row=>{
     const kind=workflow.materialKinds[row.kind],id=row.id;
     return `<fieldset class="material-assignment" data-material-id="${id}"><legend>${esc(row.label)}</legend>
      <div class="material-assignment-meta"><span class="small">${esc(kind)} · ${files.has(id)?'Selecionado para enviar':'Anotado · arquivo ainda necessário'}</span><button type="button" class="text-button" data-material-remove data-material-focus="${id}-remove" aria-label="Remover ${esc(row.label)}">Remover</button></div>
      <p>Como você quer usar este material?</p>
      <div class="material-roles">${Object.entries(workflow.materialRoles).map(([role,label])=>`<label><input type="checkbox" data-material-role="${role}" data-material-focus="${id}-${role}"${row.roles.includes(role)?' checked':''}> ${esc(label)}</label>`).join('')}</div>
      <details class="material-rights" ${row.rights.image!=='pending'||row.rights.voice!=='pending'?'open':''}><summary>Autorizações de imagem e voz</summary>
       <div class="material-rights-fields"><label>Imagem<select data-material-right="image" data-material-focus="${id}-image">${options(workflow.materialRights,row.rights.image)}</select></label><label>Voz<select data-material-right="voice" data-material-focus="${id}-voice">${options(workflow.materialRights,row.rights.voice)}</select></label></div>
      </details></fieldset>`;
    }).join('');
    if(active)Array.from(list.querySelectorAll('[data-material-focus]')).find(input=>input.dataset.materialFocus===active)?.focus({preventScroll:true});
   }
  }
  for(const panel of panels){
   panel.innerHTML=`<h3>Como usar seus materiais</h3><p class="small">Selecione vídeos e imagens para enviar ao abrir a produção. Você também pode anotar arquivos que vai entregar depois.</p>
    <label class="material-file-picker">Escolher arquivos<input type="file" data-material-files accept="video/*,image/*,audio/*,.txt,.pdf,.csv,.docx" multiple></label>
    <details class="material-manual"><summary>Anotar outro material</summary><div class="material-manual-fields"><label>Nome ou descrição<input data-material-label maxlength="200" placeholder="Ex.: roteiro aprovado"></label><label>Tipo<select data-material-kind>${options(workflow.materialKinds,'other')}</select></label><button type="button" class="outline" data-material-add>Adicionar</button></div></details>
    <p class="small" aria-live="polite" data-material-message></p><div data-material-list></div>`;
   const message=text=>{panel.querySelector('[data-material-message]').textContent=text;};
   function add(rows){
    const existing=AtlasCurrentChoice().materialAssignments;
    if(existing.length+rows.length>workflow.maxMaterialAssignments){message('Você pode registrar até '+workflow.maxMaterialAssignments+' materiais.');return false}
    AtlasApp.setMaterialAssignments([...existing,...rows]);
    const first=panel.querySelector('[data-material-id="'+rows[0].id+'"] input');
    first?.focus({preventScroll:true});
    return true;
   }
   panel.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-material-label]')){event.preventDefault();panel.querySelector('[data-material-add]').click();}});
   panel.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-material-add')){
     const name=panel.querySelector('[data-material-label]'),label=name.value.trim();
     if(!label){message('Informe o nome ou a descrição do material.');name.focus();return}
     if(add([record(label,panel.querySelector('[data-material-kind]').value,'declared')])){name.value='';message('Material anotado. Escolha como ele deve ser usado.')}
    }
    if(button.hasAttribute('data-material-remove')){
     const row=button.closest('[data-material-id]'),id=row.dataset.materialId,focus=row.nextElementSibling?.dataset.materialId||row.previousElementSibling?.dataset.materialId;
     AtlasApp.setMaterialAssignments(AtlasCurrentChoice().materialAssignments.filter(item=>item.id!==id));
     (focus?panel.querySelector('[data-material-id="'+focus+'"] [data-material-remove]'):panel.querySelector('[data-material-files]'))?.focus({preventScroll:true});
     message('Material removido.');
    }
   });
   panel.addEventListener('change',event=>{
    const input=event.target,rows=AtlasCurrentChoice().materialAssignments;
    if(input.matches('[data-material-files]')){
     const chosen=Array.from(input.files||[]),claimed=new Set(),entries=chosen.map(file=>{
      const label=file.name.slice(0,200),kind=file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':file.type.startsWith('image/')?'image':/\.(txt|pdf|docx)$/i.test(file.name)?'script':/\.csv$/i.test(file.name)?'data':'other';
      const matches=rows.filter(row=>row.label===label&&row.kind===kind&&!files.has(row.id)&&!claimed.has(row.id));
      const prior=matches.length===1?matches[0]:null;
      if(prior)claimed.add(prior.id);
      return {row:prior?{...prior,source:'picked_locally'}:record(label,kind,'picked_locally'),file};
     });
     input.value='';
     if(!entries.length)return;
     if(rows.length+entries.length-claimed.size>workflow.maxMaterialAssignments){message('Você pode registrar até '+workflow.maxMaterialAssignments+' materiais.');return;}
     entries.forEach(({row,file})=>files.set(row.id,file));
     AtlasApp.setMaterialAssignments([...rows.map(row=>claimed.has(row.id)?{...row,source:'picked_locally'}:row),...entries.filter(({row})=>!claimed.has(row.id)).map(({row})=>row)]);
     const first=panel.querySelector('[data-material-id="'+entries[0].row.id+'"] input');
     first?.focus({preventScroll:true});
     message('Arquivos selecionados. Confira o uso de cada um.');
     return;
    }
    const id=input.closest('[data-material-id]')?.dataset.materialId,role=input.dataset.materialRole,right=input.dataset.materialRight;
    if(id&&role)AtlasApp.setMaterialAssignments(rows.map(row=>row.id===id?{...row,roles:input.checked?[...row.roles,role]:row.roles.filter(value=>value!==role)}:row));
    if(id&&right)AtlasApp.setMaterialAssignments(rows.map(row=>row.id===id?{...row,rights:{...row.rights,[right]:input.value}}:row));
   });
  }
  globalThis.AtlasMaterialFiles={current:()=>AtlasCurrentChoice().materialAssignments.flatMap(row=>files.has(row.id)?[{id:row.id,file:files.get(row.id)}]:[])};
  render();window.addEventListener('atlas:state',render);
 }
 if(window.ATLAS_READY)init();else window.addEventListener('atlas:ready',init,{once:true});
})();
