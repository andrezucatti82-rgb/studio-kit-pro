export const projectFormat = 'zapvideo-project';
export const projectVersion = 1;
export const limits = Object.freeze({
  videoBytes: 512 * 1024 ** 2, subtitleBytes: 2 * 1024 ** 2,
  seconds: 900, uploadPartBytes: 8 * 1024 ** 2, handoffBytes: 32 * 1024 ** 2,
});
export const captionsFormats = ['mp4', 'mp4+srt'];
export const clipOutput = Object.freeze({id:'clipe',name:'clipe-previa.mp4',type:'video/mp4'});
export const clipAspects = ['9:16','16:9'];
export const validClipSettings = ({aspect,seconds}) => clipAspects.includes(aspect) &&
  Number.isSafeInteger(seconds) && seconds>=3 && seconds<=15;
export const supportedVideo = /\.(?:mp4|mov|m4v|webm|mkv)$/i;
export const isId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const require = (condition, message) => { if (!condition) throw new Error(message); };
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const nameOK = name => typeof name === 'string' && name.trim() && name.length <= 200 &&
  !/[\\/<>:"|?*\x00-\x1f]/.test(name) && name !== '.' && name !== '..';
const materialKinds = ['source', 'subtitle', 'reference', 'take', 'broll', 'frame', 'audio'];

export function parseTime(value) {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d+(?::[0-5]\d){0,2}(?:\.\d{1,3})?$/.test(text)) return NaN;
  return text.split(':').reduce((seconds, part) => seconds * 60 + Number(part), 0);
}

export function validateProject(input) {
  require(input?.format === projectFormat && input.version === projectVersion, 'Ficha ZapVideo incompatível.');
  const {id, revision, intent, materials, actions, scenes} = input;
  require(isId(id) && Number.isSafeInteger(revision) && revision > 0, 'Identificação da revisão inválida.');
  require(intent && ['edit', 'create'].includes(intent.mode) && typeof intent.subject === 'string' &&
    intent.subject.length <= 1220, 'Informe o objetivo do vídeo.');
  require(Array.isArray(materials) && materials.length <= 24, 'Lista de materiais inválida.');
  const ids = new Set();
  for (const material of materials) {
    const {id: key, kind, name, bytes, permission} = material ?? {};
    require(isId(key) && !ids.has(key) && materialKinds.includes(kind) && nameOK(name) &&
      Number.isSafeInteger(bytes) && bytes > 0 && bytes <= (kind === 'subtitle' ? limits.subtitleBytes : limits.videoBytes) &&
      ['local', 'process'].includes(permission), 'Material inválido. Confira tipo, tamanho e nome.');
    if (kind === 'source' || kind === 'take' || kind === 'broll') require(supportedVideo.test(name), 'Escolha MP4, MOV, MKV ou WebM.');
    if (kind === 'subtitle') require(/\.srt$/i.test(name), 'Envie um SRT.');
    ids.add(key);
  }
  require(actions && typeof actions === 'object', 'Escolha as ações do projeto.');
  const {captions = null, cuts = [], treatment = null} = actions;
  require(captions === null || captionsFormats.includes(captions), 'Formato de legenda inválido.');
  require(Array.isArray(cuts) && [0, 3].includes(cuts.length), 'Marque três cortes.');
  for (const {start, end, x, y} of cuts) {
    require(finite(start, 0, limits.seconds) && finite(end, start + 0.25, limits.seconds) &&
      finite(x, 0, 1) && finite(y, 0, 1), 'Confira início, fim e enquadramento de cada corte.');
  }
  require(treatment === null || (typeof treatment.balance === 'boolean' && typeof treatment.denoise === 'boolean' &&
    finite(treatment.brightness, -0.15, 0.15) && finite(treatment.contrast, 0.8, 1.2) &&
    finite(treatment.saturation, 0.7, 1.3)), 'Ajustes de imagem ou áudio inválidos.');
  require(Array.isArray(scenes) && scenes.length <= 16, 'Lista de cenas inválida.');
  const sceneIds = new Set();
  for (const scene of scenes) {
    require(scene && isId(scene.id) && !sceneIds.has(scene.id) && typeof scene.title === 'string' && scene.title.trim() &&
      scene.title.length <= 120 && typeof scene.narration === 'string' && scene.narration.length <= 1200 &&
      Array.isArray(scene.shots) && scene.shots.length > 0 && scene.shots.length <= 8, 'Cena inválida.');
    sceneIds.add(scene.id);
    const shotIds = new Set();
    for (const shot of scene.shots) {
      require(shot && isId(shot.id) && !shotIds.has(shot.id) && typeof shot.direction === 'string' &&
        shot.direction.trim() && shot.direction.length <= 500 && finite(shot.seconds, 0.25, 120) &&
        typeof shot.generateSupport === 'boolean' && Array.isArray(shot.layers) && shot.layers.length <= 8 &&
        shot.layers.every(layer => layer && ['video','broll','image','title','narration','music','subtitle','motion'].includes(layer.kind) &&
          (layer.materialId === null || ids.has(layer.materialId))), 'Plano ou camada inválida.');
      shotIds.add(shot.id);
      const clip=shot.selectedClip;
      require(clip===undefined || (clip && /^[a-f0-9]{64}$/.test(clip.jobId || '') &&
        /^[a-f0-9]{64}$/.test(clip.sha256 || '') && ['mock','gemini'].includes(clip.mode) &&
        Number.isSafeInteger(clip.revision) && clip.revision>0 && clip.revision<=revision), 'Referência de clipe inválida.');
    }
  }
  if (intent.mode === 'edit') {
    require(materials.filter(item => item.kind === 'source').length === 1, 'Envie um vídeo original.');
    require(!captions || materials.filter(item => item.kind === 'subtitle').length === 1, 'Envie um SRT.');
    require(captions || cuts.length || treatment, 'Escolha pelo menos um ajuste.');
  } else {
    require(intent.subject.trim(), 'Descreva o vídeo que você quer criar.');
  }
  return input;
}

export function editOutputs(project) {
  const {cuts, captions, treatment} = project.actions;
  const outputs = cuts.map((_, i) => ({id: 'corte-' + (i + 1), suffix: 'previa.mp4', type: 'video/mp4'}));
  if (captions || (treatment && !cuts.length)) outputs.unshift({id: 'video', suffix: 'previa.mp4', type: 'video/mp4'});
  if (captions === 'mp4+srt') outputs.push({id: 'legendas', suffix: 'srt', type: 'application/x-subrip'});
  return outputs.map(file => ({id: file.id, name: file.id + (file.suffix === 'srt' ? '.' : '-') + file.suffix, type: file.type}));
}

export function describeProject(project) {
  const lines = [project.intent.mode === 'edit' ? 'Editar um vídeo que já tenho' : 'Criar um vídeo com IA', project.intent.subject];
  const {cuts, captions, treatment} = project.actions;
  if (captions) lines.push(captions === 'mp4+srt' ? 'Aplicar SRT ao MP4 e entregar o SRT separado.' : 'Aplicar SRT ao MP4.');
  cuts.forEach(({start, end, x, y}, i) => lines.push(`Corte ${i + 1} · ${start}–${end} s · 9:16 · enquadramento ${Math.round(x * 100)}% / ${Math.round(y * 100)}%`));
  if (treatment) lines.push(`Ajustar imagem (brilho ${treatment.brightness}, contraste ${treatment.contrast}, saturação ${treatment.saturation}).`,
    ...(treatment.balance ? ['Equilibrar áudio.'] : []), ...(treatment.denoise ? ['Reduzir ruído moderado.'] : []));
  for (const scene of project.scenes) lines.push(scene.title, scene.narration, ...scene.shots.map(shot =>
    `${shot.seconds} s · ${shot.direction}${shot.generateSupport ? ' · apoio IA solicitado' : ''}${shot.selectedClip ?
      (shot.selectedClip.mode==='mock'?' · clipe simulado vinculado':' · clipe vinculado') : ''}`));
  return lines.filter(Boolean).join('\n');
}
