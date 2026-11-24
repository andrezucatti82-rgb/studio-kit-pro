const byId = id => document.getElementById(id);
const assets = '/assets/zapvideo-editor/';
const verticalAspect = 9 / 16;
export const softImage = Object.freeze({brightness:0.06,contrast:1.12,saturation:1.18});

export function setupEditPreviews(video) {
  const tabs = [...document.querySelectorAll('.editor-tabs [role="tab"]')];
  const original = byId('editor-audio-original'), treated = byId('editor-audio-treated');
  function selectTab(selected, focus) {
    for (const tab of tabs) {
      const active = tab===selected;
      tab.tabIndex = active ? 0 : -1;
      tab.setAttribute('aria-selected', String(active));
      byId(tab.getAttribute('aria-controls')).hidden = !active;
    }
    video.pause();
    original.pause();
    treated.pause();
    if (selected.id==='editor-tab-image') captureEditFrame(video);
    if (focus) selected.focus();
  }
  for (const [index,tab] of tabs.entries()) {
    tab.onclick = () => selectTab(tab,false);
    tab.onkeydown = event => {
      const options = {ArrowLeft:(index+tabs.length-1)%tabs.length,ArrowRight:(index+1)%tabs.length,Home:0,End:tabs.length-1};
      if (!Object.hasOwn(options,event.key)) return;
      event.preventDefault();
      selectTab(tabs[options[event.key]],true);
    };
  }
  original.onplay = () => {treated.pause();video.pause();};
  treated.onplay = () => {original.pause();video.pause();};
  video.addEventListener('play',()=>{original.pause();treated.pause();});
  return () => { original.pause(); treated.pause(); };
}

export function showEditSource(available) {
  byId('preview-wrap').hidden = !available;
  byId('editor-crop-demo').hidden = available;
  byId('editor-crop-source').textContent = available ? 'Seu vídeo' : 'Exemplo';
}

export function positionCropGuide(video, cut) {
  const frame = byId('editor-video-frame'), outline = byId('editor-video-outline');
  const demo = byId('editor-crop-demo').lastElementChild;
  demo.style.setProperty('--crop-left',100*(1-verticalAspect/1.5)*(cut?.x??0.5)+'%');
  const aspect = video.videoWidth / video.videoHeight;
  outline.hidden = !cut || !Number.isFinite(aspect) || aspect<=0;
  byId('editor-crop-info').textContent = outline.hidden ?
    'Selecione uma prévia de corte para ver a área mantida.' :
    'A moldura mostra a área que ficará no corte vertical.';
  if (!Number.isFinite(aspect) || aspect<=0) {
    frame.style.removeProperty('--editor-media-aspect');
    return;
  }
  frame.style.setProperty('--editor-media-aspect',aspect);
  if (outline.hidden) return;
  const width = Math.min(1,verticalAspect/aspect), height = Math.min(1,aspect/verticalAspect);
  outline.style.setProperty('--crop-width',100*width+'%');
  outline.style.setProperty('--crop-height',100*height+'%');
  outline.style.setProperty('--crop-left',100*(1-width)*cut.x+'%');
  outline.style.setProperty('--crop-top',100*(1-height)*cut.y+'%');
}

export function captureEditFrame(video, available = video.readyState>=2) {
  const originals = [byId('editor-image-original'),byId('editor-image-treated')];
  const scale = Math.min(1,850/video.videoWidth,560/video.videoHeight);
  for (const canvas of originals) {
    canvas.hidden = !available;
    canvas.previousElementSibling.hidden = available;
    if (!available) continue;
    canvas.width = Math.max(1,Math.round(video.videoWidth*scale));
    canvas.height = Math.max(1,Math.round(video.videoHeight*scale));
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  }
  byId('editor-image-source').textContent = available ? 'Quadro do seu vídeo' : 'Exemplo';
  return available;
}

export function refreshEditTreatment(finish, enabled, demo) {
  const neutral = finish.brightness===0 && finish.contrast===1 && finish.saturation===1;
  const sample = demo && !enabled && neutral;
  const {brightness,contrast,saturation} = sample ? softImage : finish;
  byId('editor-treated-frame').style.setProperty('--editor-filter',
    `brightness(${1+brightness*2}) contrast(${contrast}) saturate(${saturation})`);
  byId('editor-treated-label').textContent = sample ? 'Melhoria suave' : 'Com ajustes';
  const name = finish.balance && finish.denoise ? 'treated' : finish.balance ? 'balanced' : finish.denoise ? 'clean' : 'original';
  const comparison = byId('editor-audio-treated'), source = assets+'audio-'+name+'.mp3';
  if (comparison.getAttribute('src')!==source) comparison.setAttribute('src',source);
}
