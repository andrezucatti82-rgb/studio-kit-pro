/* One download, explicit local execution, then a tutorial. No remote installation. */
(()=>{
 const base=new URL(window.ATLAS_ASSET_BASE||'.',document.baseURI),button=document.getElementById('downloadStudioKit'),status=document.getElementById('installationStatus'),tutorial=document.getElementById('installationTutorial');
 if(!button||!status)return;
 button.removeAttribute('href');button.setAttribute('aria-disabled','true');status.textContent='Conferindo o pacote disponível…';
 fetch(new URL('installation.json',base)).then(response=>{if(!response.ok)throw Error();return response.json()}).then(data=>{
  if(data.version!==1||data.download!=='downloads/studio-kit-pro-installer.zip'||data.tutorial!=='como-instalar.html'||!Number.isFinite(data.bytes))throw Error();
  tutorial.href=new URL(data.tutorial,base).href;
  if(!data.sourceReady){status.textContent='O candidato está sendo preparado para revisão. O download será liberado quando corresponder à revisão fixada.';return;}
  button.href=new URL(data.download,base).href;button.removeAttribute('aria-disabled');button.textContent='Baixar instalador completo · '+(data.bytes/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
  status.textContent='Versão '+data.kitVersion+' · '+data.skills+' skills · '+data.presenterStyles+' explicadores. O instalador baixa o projeto completo e as dependências; reserve 3 GB livres.';
 }).catch(()=>{status.textContent='Não foi possível verificar o pacote. Tente novamente ou consulte o tutorial.';});
 function open(){window.AtlasShell?.view('help');document.getElementById('installTitle').focus({preventScroll:true});document.getElementById('instalar').scrollIntoView({behavior:'auto',block:'start'});}
 document.addEventListener('click',event=>{if(event.target.closest('[data-install-open]')){event.preventDefault();open();}if(event.target.closest('#downloadStudioKit[aria-disabled=true]'))event.preventDefault();});
 window.addEventListener('atlas:ready',()=>{if(window.location.hash==='#instalar')open();},{once:true});
})();
