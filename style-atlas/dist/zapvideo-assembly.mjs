import {clipAspects,validateProject} from './zapvideo-contract.mjs';
import './workflow.js';

export const assemblySampleFrames = AtlasWorkflow.sampleSeconds * 30;

export const assemblyOutput=Object.freeze({id:'montagem',name:'montagem-previa.mp4',type:'video/mp4'});
const supportedImages=/\.(?:jpe?g|png|webp)$/i;
const supportedAudio=/\.(?:wav|mp3|m4a|aac)$/i;
const require=(condition,text)=>{if (!condition) throw new Error(text);};

export function assemblyPlan(raw) {
  const plan=validateProject(raw);
  const {aspect,musicMaterialId=null,captionMaterialId=null,sampleSceneId}=raw.assembly ?? {};
  require(plan.intent.mode==='create' && clipAspects.includes(aspect),'Escolha a proporção da montagem.');
  const materials=new Map(plan.materials.map(item=>[item.id,item]));
  const selected=new Map();
  const audio=(id,role)=>{
    if (!id) return null;
    const file=materials.get(id);
    require(file?.kind==='audio' && supportedAudio.test(file.name), 'Escolha um áudio compatível para '+role+'.');
    selected.set(id,{id,kind:'audio'});
    return id;
  };
  const music=audio(musicMaterialId,'a trilha');
  let captions=null;
  if (captionMaterialId) {
    const file=materials.get(captionMaterialId);
    require(file?.kind==='subtitle' && /\.srt$/i.test(file.name),'Escolha um SRT para as legendas.');
    selected.set(file.id,{id:file.id,kind:'subtitle'});
    captions=file.id;
  }
  const shots=[],narrations=[];
  let totalFrames=0;
  const spans=[];
  for (const scene of plan.scenes) {
    const start=totalFrames;
    for (const shot of scene.shots) {
      const duration=Math.round(shot.seconds*30);
      require(duration>=8 && duration<=1800,'Cada plano da montagem deve durar entre 0,27 e 60 segundos.');
      require(shot.overlay===undefined || (typeof shot.overlay==='string' && shot.overlay.length<=100),'Use títulos de até 100 caracteres.');
      require(shot.motion===undefined || ['still','push'].includes(shot.motion),'Movimento de quadro inválido.');
      const layer=shot.layers.find(item=>['video','broll','image'].includes(item.kind) && item.materialId);
      let id,type;
      if (shot.selectedClip) {
        id=shot.selectedClip.jobId;
        type='video';
        const prior=selected.get(id);
        require(!prior || (prior.kind==='generated' && prior.sha256===shot.selectedClip.sha256),'Clipe identificado com duas versões.');
        selected.set(id,{id,kind:'generated',sha256:shot.selectedClip.sha256,mode:shot.selectedClip.mode});
      } else {
        id=layer?.materialId;
        const item=materials.get(id);
        require(item && layer,'Vincule um vídeo ou quadro ao plano '+shot.id+'.');
        type=layer.kind==='image'?'image':'video';
        require(type==='image'?supportedImages.test(item.name):['source','take','broll'].includes(item.kind),
          'Selecione um tipo de arquivo compatível para o plano '+shot.id+'.');
        const prior=selected.get(id);
        require(!prior || prior.kind===type,'O mesmo arquivo foi usado com formatos incompatíveis.');
        selected.set(id,{id,kind:type});
      }
      shots.push({id,type,start:totalFrames,frames:duration,overlay:shot.overlay?.trim() || '',
        motion:type==='image' && shot.motion==='push',audio:shot.keepAudio!==false});
      totalFrames+=duration;
    }
    const narration=audio(scene.narrationMaterialId,'a narração');
    if (narration) narrations.push({id:narration,start,frames:totalFrames-start,text:scene.narration});
    spans.push({id:scene.id,start,end:totalFrames});
  }
  require(shots.length>0 && shots.length<=16 && totalFrames<=3600,'A montagem do piloto aceita até 16 planos e 120 segundos.');
  const scene=spans.find(span=>span.id===sampleSceneId) || spans[0];
  require(totalFrames>=assemblySampleFrames,'A montagem precisa ter pelo menos cinco segundos para criar a amostra.');
  const hasTransition=scene.end<totalFrames;
  const candidate=hasTransition?Math.max(scene.start,scene.end-Math.floor(assemblySampleFrames/2)):scene.start;
  const start=Math.min(candidate,totalFrames-assemblySampleFrames);
  return {aspect,music,captions,shots,narrations,totalFrames,sample:{start,end:start+assemblySampleFrames},
    materials:[...selected.values()]};
}
