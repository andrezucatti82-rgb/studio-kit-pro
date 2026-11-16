/* Enabled only by the local production server. The public static atlas keeps its guided flow. */
(()=>{
 if(!window.GDAProduction?.enabled)return;
 let active,requestKey,prepared;
 const $=id=>document.getElementById(id);
 const headers=()=>({'X-GDA-Token':window.GDAProduction.token});
 async function api(url,options={}){const response=await fetch(url,{...options,headers:{...headers(),...options.headers}});const data=await response.json();if(!response.ok)throw Error(data.error||'Falha na produção');return data;}
 function mount(){
  const host=$('myProject');if(!host)return;
  const section=document.createElement('section');section.id='localProduction';section.className='production-local';
  section.innerHTML='<h3>Produzir neste computador</h3><p>Envie sua mídia, escreva o pedido e acompanhe o vídeo. O resultado será uma prévia para revisão.</p><p id="productionStyle" class="small"></p><form id="productionForm"><label>Mídia (vídeo ou imagem)<input id="productionMedia" type="file" accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/webp" required></label><label>Trilha autorizada (opcional)<input id="productionMusic" type="file" accept="audio/*"></label><label>Direitos de uso<input id="productionRights" type="text" maxlength="1000" placeholder="Material próprio ou licença e origem" required></label><label>O que o vídeo deve comunicar?<textarea id="productionPrompt" rows="3" maxlength="4000" required></textarea></label><label>Formato<select id="productionFormat"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select></label><label>Duração em segundos<input id="productionDuration" type="number" min="10" max="60" value="30" required></label><button id="productionStart" class="primary" type="submit">Criar meu vídeo</button></form><div id="productionPreparation" hidden><p>Plano preparado para a pré-produção visual. Use o fluxo guiado para revisar e aprovar a direção.</p><button id="productionDraft" class="outline" type="button">Baixar plano editável</button> <button id="productionRequest" class="outline" type="button">Baixar pedido</button></div><p id="productionStatus" role="status" aria-live="polite"></p><progress id="productionProgress" max="100" value="0" hidden aria-label="Progresso da produção"></progress><button id="productionCancel" class="outline" type="button" hidden>Cancelar produção</button><details><summary>Detalhes da produção</summary><pre id="productionLogs" class="small"></pre></details><div id="productionResult" hidden><video id="productionVideo" controls playsinline preload="metadata"></video><p>Prévia técnica · revisão visual e sonora pendente.</p><a id="productionDownload">Baixar MP4</a> · <a id="productionPlan">Plano de edição</a> · <a id="productionCaptions">Legendas</a> · <a id="productionReport">Verificação técnica</a></div>';
  host.append(section);
  const css=document.createElement('style');css.textContent='.production-local{margin-top:2rem;border-top:1px solid #cad0d5;padding-top:1.5rem}.production-local label{display:grid;gap:.4rem;margin:.8rem 0}.production-local input,.production-local select,.production-local textarea{max-width:100%;padding:.6rem}.production-local video,.production-local progress{width:100%;max-width:900px}.production-local pre{white-space:pre-wrap;overflow-wrap:anywhere}.production-local [hidden]{display:none}';document.head.append(css);
  function sync(){const c=window.AtlasCurrentChoice?.();const style=c?.selectedStyles?.[0];$('productionStyle').textContent=style?`Estilo: ${style.name}`:'Selecione um estilo na biblioteca.';if(!$('productionPrompt').value&&c?.topic)$('productionPrompt').value=c.topic;}
  sync();window.addEventListener('atlas:state',sync);
  $('productionForm').onsubmit=async event=>{
   event.preventDefault();$('productionStart').disabled=true;$('productionResult').hidden=true;
   try{
    const choice=window.AtlasCurrentChoice?.(),styleId=choice?.selectedStyles?.[0]?.id;
    if(choice?.selectedStyles?.length!==1)throw Error('O executor inicial aceita um estilo por produção. Preserve suas combinações no fluxo guiado.');
    if(styleId!=='campanha-frase-que-reorganiza-o-quadro')throw Error('O executor inicial está disponível para “Frase que reorganiza o quadro”. Selecione esse estilo na biblioteca.');
    $('productionStatus').textContent='Enviando os materiais…';
    const upload=async input=>{const file=input.files[0];if(!file)return null;return api('/api/assets',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name),'X-Media-Rights':encodeURIComponent($('productionRights').value)},body:file});};
    const asset=await upload($('productionMedia')),music=await upload($('productionMusic'));
    if(!asset)throw Error('Envie uma mídia.');
    requestKey=crypto.randomUUID();
    const request={prompt:$('productionPrompt').value,styleId,assetIds:[asset.id],durationSeconds:Number($('productionDuration').value),format:$('productionFormat').value,fps:30,captions:[]};if(music)request.musicAssetId=music.id;
    prepared=await api('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});$('productionPreparation').hidden=false;
    active=await api('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':requestKey},body:JSON.stringify(request)});
    try{localStorage.setItem('gda-local-production-job',active.id);}catch{}await watch();
   }catch(error){$('productionStatus').textContent=/approval|workflow|approved|bound/i.test(error.message)?'O plano está preparado. Conclua as aprovações visuais no fluxo guiado e vincule os arquivos ao serviço local antes de renderizar.':error.message;$('productionStart').disabled=false;}
  };
  function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('productionDraft').onclick=()=>prepared&&download(prepared.plan,'edit-plan.json');$('productionRequest').onclick=()=>prepared&&download(prepared.request,'request.json');
  $('productionCancel').onclick=async()=>{if(!active)return;try{await api(`/api/jobs/${active.id}/cancel`,{method:'POST'});}catch(error){$('productionStatus').textContent=error.message;}};
  async function watch(){
   const names={queued:'Na fila',analyzing:'Analisando mídia',planning:'Preparando o plano',editing:'Editando',rendering:'Renderizando',validating:'Conferindo o MP4',completed:'Prévia disponível para revisão',failed:'A produção falhou',cancelled:'Produção cancelada'};
   active=await api(`/api/jobs/${active.id}`);$('productionStatus').textContent=names[active.state]+(active.error?`: ${active.error}`:'');$('productionProgress').hidden=false;$('productionProgress').value=active.progress;$('productionLogs').textContent=active.logs.map(l=>l.message).join('\n');
   const done=['completed','failed','cancelled'].includes(active.state);$('productionCancel').hidden=done;$('productionStart').disabled=!done;
   if(active.state==='completed'){const base=`/api/jobs/${active.id}/`;$('productionVideo').src=base+'candidate.mp4';for(const [id,file]of [['productionDownload','candidate.mp4'],['productionPlan','edit-plan.json'],['productionCaptions','captions.srt'],['productionReport','technical-report.json']]){$(id).href=base+file+'?download=1';$(id).setAttribute('download',file);}$('productionResult').hidden=false;}
   if(!done)setTimeout(()=>watch().catch(error=>{$('productionStatus').textContent=error.message;$('productionStart').disabled=false;}),1200);
  }
  try{const saved=localStorage.getItem('gda-local-production-job');if(saved){active={id:saved};watch().catch(()=>{});}}catch{}
 }
 window.addEventListener('atlas:ready',mount,{once:true});
})();
