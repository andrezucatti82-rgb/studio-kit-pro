/* One download, explicit local execution, then a tutorial. No remote installation. */
(()=>{
 const base=new URL(window.ATLAS_INSTALL_ASSET_BASE||window.ATLAS_ASSET_BASE||'.',document.baseURI),button=document.getElementById('downloadStudioKit'),status=document.getElementById('installationStatus'),tutorial=document.getElementById('installationTutorial');
 if(!button||!status)return;
 if(window.ATLAS_PAGE_MODE){
  button.href=new URL('/#instalar',base).href;button.removeAttribute('download');
  button.target='_blank';button.rel='noopener';button.textContent='Abrir instalador no site ↗';
  tutorial.href=new URL('como-instalar.html',base).href;
  status.textContent='O site da zapvideo verifica o pacote disponível para download.';
 }else{
 button.removeAttribute('href');button.setAttribute('aria-disabled','true');status.textContent='Conferindo o pacote disponível…';
 const manifest=window.ATLAS_INSTALL_MANIFEST?Promise.resolve(window.ATLAS_INSTALL_MANIFEST):fetch(new URL('installation.json',base)).then(response=>{if(!response.ok)throw Error();return response.json()});
 manifest.then(data=>{
  if(data.version!==1||data.download!=='downloads/studio-kit-pro-installer.zip'||data.tutorial!=='como-instalar.html'||!Number.isFinite(data.bytes))throw Error();
  tutorial.href=new URL(data.tutorial,base).href;
  if(!data.sourceReady){status.textContent='Estamos atualizando o pacote. Aguarde um pouco e tente baixar novamente.';return;}
  button.href=new URL(data.download,base).href;button.removeAttribute('aria-disabled');button.textContent='Baixar instalador completo · '+(data.bytes/1024/1024).toLocaleString('pt-BR',{maximumFractionDigits:1})+' MB';
  status.textContent='Versão '+data.kitVersion+'. Você vai precisar de internet e 3 GB livres no computador. Siga o tutorial para começar.';
 }).catch(()=>{status.textContent='Não foi possível verificar o pacote. Tente novamente ou consulte o tutorial.';});
 }
 function open(){window.AtlasShell?.view('help');document.getElementById('installTitle').focus({preventScroll:true});document.getElementById('instalar').scrollIntoView({behavior:'auto',block:'start'});}
 document.addEventListener('click',event=>{if(event.target.closest('[data-install-open]')){event.preventDefault();open();}if(event.target.closest('#downloadStudioKit[aria-disabled=true]'))event.preventDefault();});
 window.addEventListener('atlas:ready',()=>{if(!window.AtlasHistory&&window.location.hash==='#instalar')open();},{once:true});
})();
