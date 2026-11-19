/* Open the selected production workspace and share an expiring, encrypted packet. */
(()=>{
 const $=id=>document.getElementById(id);
 const limit=64*1024*1024,repository='andrezucatti82-rgb/studio-kit-pro';
 const encoder=new TextEncoder();
 const launchURL=platform=>platform==='claude'?'https://claude.ai/code':'https://chatgpt.com/codex';
 const endpoint=()=>new URL(globalThis.ATLAS_HANDOFF_ENDPOINT||'cloud-handoff.php',location.href);
 const bytesHex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
 function startText(link){
  return `Produza o vídeo final com IA a partir do pacote privado gerado pelo DiSteven. Trabalhe em projects/ sem publicar os dados ou a mídia. Use o Studio Kit Pro (${repository}). No checkout atualizado, recupere o projeto e os originais com:
node scripts/retrieve-disteven-handoff.mjs '${link}' projects/disteven-recebido
Abra projeto-video.json e arquivos-recebidos.json. Importe a ficha com npm run video -- import e siga pedido, materiais, escopos, referências e aprovações. O link expira em até 2 horas e deve permanecer nesta conversa. Se o ambiente bloquear o acesso ou o link expirar, peça a ficha e os originais pelo anexo do chat.
${AtlasWorkflow.wizardInstruction}`;
 }
 async function send(bundle,attachments){
  const project=new Blob([JSON.stringify(bundle)],{type:'application/json'});
  const parts=[{id:'project',file:project,name:'projeto-video.json'},...attachments.map(({id,file})=>({id,file,name:file.name.slice(0,200)}))];
  const header=encoder.encode(JSON.stringify({version:1,files:parts.map(({id,name,file})=>({id,name,size:file.size}))}));
  const prefix=new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0,header.byteLength);
  const message=new Blob([prefix,header,...parts.map(part=>part.file)]);
  if(parts.some(part=>!part.file.size))throw new Error('Há um arquivo vazio. Remova-o ou selecione outra versão.');
  if(header.byteLength>32768||message.size+28>limit)throw new Error('O pacote excede 64 MB. Envie os arquivos maiores pelo anexo da conversa.');
  const key=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
  const aes=await crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},aes,await message.arrayBuffer());
  const url=endpoint();
  if(url.origin!==location.origin)throw new Error('Endereço de envio inválido.');
  const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:new Blob([iv,ciphertext]),signal:AbortSignal.timeout(120000),redirect:'error'});
  const result=await response.json().catch(()=>null);
  if(!response.ok||!/^[0-9a-f]{48}$/.test(result?.id||''))throw new Error(result?.error||'O envio temporário está indisponível.');
  url.searchParams.set('id',result.id);url.hash=bytesHex(key);
  return url.href;
 }
 function init(){
  const button=$('chatLink'),progress=$('cloudHandoffProgress'),status=$('cloudHandoffStatus'),copy=$('copyCloudPrompt'),destination=$('cloudHandoffDestination');
  if(!button||!progress)return;
  let pending=false,currentText='';
  copy.onclick=async()=>{
   try{await navigator.clipboard.writeText(currentText);status.textContent='Instrução copiada. Cole no chat da produção.';}
   catch{const output=$('promptOutput');$('promptDetails').open=true;output.value=currentText;output.focus();output.select();status.textContent='Selecione e copie a instrução no campo Pedido completo.';}
  };
  button.addEventListener('click',async event=>{
   event.preventDefault();
   if(pending)return;
   let bundle;
   try{bundle=AtlasApp.exportBundle();}
   catch(error){progress.hidden=false;status.textContent=error.message;return;}
   const platform=bundle.project.conversationPlatform;
   const attachments=globalThis.AtlasMaterialFiles?.current()||[];
   const target=new URL(launchURL(platform));
   let popup=window.open('','_blank');
   if(popup){popup.opener=null;popup.document.title='Preparando sua produção';popup.document.body.textContent='Preparando o pedido e os arquivos selecionados no DiSteven…';}
   pending=true;
   progress.hidden=false;copy.hidden=true;destination.hidden=true;
   button.setAttribute('aria-busy','true');
   status.textContent=attachments.length?`Preparando ${attachments.length} arquivo(s) e o pedido…`:'Preparando o pedido e as referências…';
   const prepared=send(bundle,attachments).then(startText);
   const nativeCopy=typeof ClipboardItem==='function'&&navigator.clipboard?.write;
   const copying=nativeCopy?navigator.clipboard.write([new ClipboardItem({'text/plain':prepared.then(value=>new Blob([value],{type:'text/plain'}))})]).then(()=>true,()=>false):Promise.resolve(false);
   try{
    currentText=await prepared;
    if(platform==='claude'){
     target.searchParams.set('repositories',repository);
     target.searchParams.set('prompt',currentText);
    }
    destination.href=target.href;destination.hidden=false;
    if(popup&&!popup.closed)popup.location.replace(target.href);
    copy.hidden=false;
    const copied=await copying;
    status.textContent=platform==='claude'
     ?'Pedido preparado no Claude Code. Revise a instrução e inicie a conversa para carregar o pacote.'
     :(copied?'Instrução copiada. Selecione o ambiente Studio Kit Pro no Codex, cole e inicie a conversa.':'Selecione o ambiente Studio Kit Pro no Codex. Use o botão para copiar e colar a instrução.');
   }catch(error){
    popup?.close();
    currentText=bundle.request;copy.hidden=false;
    destination.href=target.href;destination.hidden=false;
    $('starterKit').open=true;
    status.textContent=(error.name==='TimeoutError'?'O envio demorou mais que o esperado.':error.message)+' Use o pedido e o JSON abaixo e anexe os originais na conversa.';
   }finally{
    pending=false;button.removeAttribute('aria-busy');
   }
  });
 }
 if(window.ATLAS_READY)init();else window.addEventListener('atlas:ready',init,{once:true});
})();
