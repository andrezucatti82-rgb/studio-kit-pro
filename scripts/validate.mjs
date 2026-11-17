import fs from 'node:fs';
import '../style-atlas/dist/guided.js';
import '../style-atlas/dist/workflow.js';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildTimeline} from '../src/timeline.mjs';
export function validate(p){
 const fail=m=>{throw new Error(m)};
 if(p.schemaVersion!==2)fail('schemaVersion 2 required; see docs/MIGRATION-2.md');
 if(!p.topic?.trim()||!p.brand?.name?.trim())fail('Topic and brand name required');
 if(!Number.isInteger(p.fps)||p.fps<24||p.fps>60)fail('fps must be 24–60');
 if(!Array.isArray(p.scenes)||p.scenes.length<1)fail('At least one scene required');
 const ids=new Set();
 for(const [i,s] of p.scenes.entries()){
  if(!s.id||ids.has(s.id))fail('Scene IDs must be unique');ids.add(s.id);
  if(!Number.isInteger(s.durationFrames)||s.durationFrames<2)fail('Scene durationFrames must be an integer >= 2');
  if(!['hero','photo','palette','spatial','catalog','closing'].includes(s.layout))fail('Unknown layout; implement custom layouts explicitly');
  const t=s.transition;
  if(!t||!['cut','dissolve'].includes(t.type)||!Number.isInteger(t.durationFrames)||t.durationFrames<0)fail('Invalid transition');
  if(t.type==='cut'&&t.durationFrames!==0)fail('Cut duration must be zero');
  if(t.type==='dissolve'&&(i===0||t.durationFrames<1||t.durationFrames>=Math.min(s.durationFrames,p.scenes[i-1].durationFrames)))fail('Dissolve must fit both adjacent scenes; first scene starts with a cut');
 }
 const duration=buildTimeline(p.scenes).durationInFrames/p.fps;
 if(duration<1||duration>180)fail('Timeline must be 1–180 seconds');
 for(const k of ['primary','ink','paper'])if(!/^#[0-9a-f]{6}$/i.test(p.brand[k]))fail(`Invalid color ${k}`);
 let u;try{u=new URL(p.brand.website)}catch{fail('Invalid website')};if(!['https:','http:'].includes(u.protocol))fail('Website must be HTTP(S)');
 const asset=a=>{if(typeof a!=='string'||!a||a.includes('..')||a.startsWith('/')||/[:\\]/.test(a))fail('Assets must be safe relative paths in public/');if(!fs.existsSync(path.join('public',a)))fail(`Missing asset: ${a}`);};
 const media=m=>{if(!m||!['image','video'].includes(m.type))fail('Media must be image or video');asset(m.src);if(m.startFrom!==undefined&&(!Number.isInteger(m.startFrom)||m.startFrom<0))fail('Video startFrom must be a nonnegative frame');};
 asset(p.brand.logo);if(p.audio)asset(p.audio);
 for(const s of p.scenes){
  if(!s.title?.trim()||s.title.length>90||!s.eyebrow||!s.detail)fail('Each scene needs concise copy');media(s.media);
  if(s.layers!==undefined&&!Array.isArray(s.layers))fail('layers must be an array');
  for(const layer of s.layers??[]){media(layer.media);for(const k of ['left','top','width','height'])if(!Number.isFinite(layer[k]))fail('Layer geometry must be finite');if(layer.width<=0||layer.height<=0)fail('Layer size must be positive');for(const pose of [layer.from,layer.to])if(!pose||![pose.x,pose.y,pose.scale].every(Number.isFinite)||pose.scale<=0)fail('Layer poses must be finite with positive scale');}
 }
 if(!p.labels||typeof p.labels.badge!=='string'||typeof p.labels.illustration!=='string'||!Array.isArray(p.labels.categories)||p.labels.categories.length!==4||p.labels.categories.some(x=>typeof x!=='string'||!x.trim()))fail('Four category labels and supporting labels required');
 if(!Array.isArray(p.captions))fail('captions must be an array');
 let end=0;for(const c of p.captions){if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<end||c.end<=c.start||c.end>duration||typeof c.text!=='string')fail('Invalid caption timing');end=c.end;}
 return p;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const input=JSON.parse(fs.readFileSync(process.argv[2]||'templates/project.json','utf8'));(input.selectedStyles?validatePreset:validate)(input);console.log('Project valid. This does not certify creative quality.');}

export function validateCatalog(c){
 if(c.styles.length!==1425||new Set(c.styles.map(s=>s.id)).size!==1425)throw Error('1425 unique styles required');
 if(c.families.length!==30)throw Error('30 subcategories required');
 for(const f of c.families)if(f.count!==c.styles.filter(s=>s.family===f.id).length)throw Error('Family count mismatch: '+f.id);
 for(const f of c.families.filter(f=>f.id.startsWith('ads-')))if(f.count!==40)throw Error('Forty ads per grouped segment required: '+f.id);
 const presenters=c.styles.filter(s=>s.family==='explicadores');if(presenters.length!==265)throw Error('265 presenter directions required');
 const sectorCounts={corretores:4,dentistas:4,arquitetos:4,lojas:4,advogados:4,esteticas:4,fitness:4,procedimentos:3,gastronomia:3,pets:3,moda:3,engenharia:4,interiores:3,eventos:4,educacao:3,agro:3,turismo:3};
 const commercial=JSON.parse(fs.readFileSync(new URL('../style-atlas/records/presenter-180/briefs.json',import.meta.url)));if(commercial.length!==205)throw Error('205 authored commercial directions required');for(const b of commercial)sectorCounts[b.sector]=(sectorCounts[b.sector]||0)+1;
 if(Object.keys(sectorCounts).length!==53||new Set(presenters.map(s=>s.presenterEditing?.sector)).size!==53)throw Error('Fifty-three presenter sectors required');
 for(const [sector,count]of Object.entries(sectorCounts))if(presenters.filter(s=>s.presenterEditing?.sector===sector).length!==count)throw Error('Presenter sector count mismatch: '+sector);
 for(const b of commercial){const s=presenters.find(s=>s.id===b.id),p=s?.presenterEditing,d=p?.interactionPlan?.depthComposition;if(!s||s.edition!=='4.8'||p.recipeId!==b.id||d?.layerOrder?.length!==4||d?.graphicEvolution?.length!==4||new Set(d.graphicEvolution).size!==4||p.interactionPlan.narrativeStructure!==b.depthComposition.structure||p.interactionPlan.sourceTimes!==null)throw Error('Missing authored progressive depth direction: '+b.id);if(!p.interactionPlan.beats.every(beat=>beat.layerOrder?.length===4&&beat.depthAction&&beat.timingEvidence==='pending_actual_source'))throw Error('Depth needs speech/action and honest source timing: '+b.id);}
 for(const s of presenters){const p=s.presenterEditing,f=p?.finishProfile;if(!p?.narrationRequired||!p.captionsRequired||f?.environment?.default!=='preserve_recorded_environment'||f?.environment?.automaticBackgroundReplacement!==false||!f?.graphics?.purposeRequired||f?.music?.status!=='planned_not_generated'||f?.audiovisualProof!==false)throw Error('Presenter direction must preserve real environment and honest audio/graphics status: '+s.id);}
 for(const s of presenters)if(s.sequence?.sourceKind!=='photorealistic_generated_reference'||s.image?.sourceKind!=='image_gen')throw Error('Presenter reference must be photographic, not a procedural placeholder: '+s.id);
 for(const s of presenters)if(!s.presenterEditing||s.presenterEditing.referenceIsExecutionProof!==false||!s.presenterEditing.avatarOptInRequired||s.presenterEditing.automaticGestureTracking!==false||s.presenterEditing.automaticSegmentation!==false)throw Error('Presenter direction must state actual capabilities: '+s.id);
 const safe=v=>typeof v==='string'&&/^assets\/[a-zA-Z0-9_,./-]+\.(webp|png)$/.test(v)&&!v.includes('..');
 const sources=new Map((c.research?.sources||[]).map(r=>[r.id,r]));
 for(const s of c.styles){
  if((s.researchRefs||[]).some(id=>!sources.get(id)?.title||!/^https?:\/\//.test(sources.get(id)?.url||'')))throw Error('Unresolved research reference: '+s.id);
  if(!s.proof||!s.requirements||!s.preset?.productFidelity||!['voice','music','sfx','mix'].every(k=>s.audio?.[k]))throw Error('Incomplete fidelity fields: '+s.id);
  if(c.visualEdition==='film-sequences-1'){
   if(['4.3','4.4'].includes(s.edition)){const a=s.advertising;if(!a||!['DBO','AIDA'].includes(a.framework)||a.narrationRequired!==true||a.captionsRequired!==true||!a.cta||a.captions?.editable!==true||a.captions?.synchronized!==true||a.targetDurationRange?.[0]!==30||a.targetDurationRange?.[1]!==45||s.audio.narrationRequired!==true||s.audio.captionsRequired!==true)throw Error('Incomplete narrated ad contract: '+s.id);}
   if(s.edition==='4.4'&&(!s.advertising.researchBasis?.sources?.every(r=>/^https:\/\//.test(r.url))||s.advertising.researchBasis.sources.length<2||s.advertising.researchBasis.salesPerformanceVerified!==false||!s.executionPlan.visualLayout))throw Error('Missing researched concept contract: '+s.id);
   const seq=s.sequence,plan=s.executionPlan;
   if(!seq||seq.conceptOnly!==true||seq.motionValidated!==false||!Array.isArray(seq.frames)||seq.frames.length!==4||new Set(seq.frames.map(f=>f.src+'#'+JSON.stringify(f.crop||null))).size!==4)throw Error('Four independently addressed unvalidated concept frames required: '+s.id);
   for(const f of seq.frames)if(!safe(f.src)||!safe(f.thumbnail)||!Number.isInteger(f.width)||!Number.isInteger(f.height)||f.width<300||f.height<300||!f.label||!f.action)throw Error('Invalid sequence frame: '+s.id);
   for(const f of seq.frames)if(f.crop){const v=f.crop;if(seq.sourceKind!=='photorealistic_generated_reference'||!Array.isArray(v)||v.length!==4||!v.every(Number.isFinite)||v[0]<0||v[1]<0||v[2]<=0||v[3]<=0||v[0]+v[2]>1||v[1]+v[3]>1)throw Error('Invalid complete reference panel: '+s.id);}
   for(let i=0;i<seq.frames.length;i++)for(let j=i+1;j<seq.frames.length;j++){const a=seq.frames[i],b=seq.frames[j];if(a.src===b.src){if(!a.crop||!b.crop)throw Error('Shared reference needs explicit complete panels');const [ax,ay,aw,ah]=a.crop,[bx,by,bw,bh]=b.crop;if(Math.min(ax+aw,bx+bw)>Math.max(ax,bx)+1e-6&&Math.min(ay+ah,by+bh)>Math.max(ay,by)+1e-6)throw Error('Reference panels must not overlap: '+s.id);}}
   if(!Number.isInteger(seq.heroIndex)||seq.heroIndex<0||seq.heroIndex>3)throw Error('Invalid hero index: '+s.id);
   if(s.image.atlas!==seq.frames[seq.heroIndex].src||s.image.columns!==1)throw Error('Hero must use a complete sequence frame: '+s.id);
   if(seq.frames[seq.heroIndex].crop&&JSON.stringify(s.image.rect)!==JSON.stringify(seq.frames[seq.heroIndex].crop))throw Error('Hero must address the selected complete panel: '+s.id);
   if(!plan||plan.referenceStates?.length!==4||plan.motionTargets?.length!==3||!plan.textRule||!plan.invariants||!plan.validation)throw Error('Missing execution mapping: '+s.id);
  }
 }
 return c;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)validateCatalog(JSON.parse(fs.readFileSync(new URL('../style-atlas/dist/catalog.json',import.meta.url))));

export function validatePreset(p){
 if(p.productionContract!==undefined&&JSON.stringify(p.productionContract)!==JSON.stringify(AtlasWorkflow.productionContract(p)))throw Error('Production contract differs from the current choices');
 if(p.projectState?.continuity!==undefined)AtlasWorkflow.validateContinuity(p.projectState.continuity);if(p.continuity!==undefined)AtlasWorkflow.validateContinuity(p.continuity);
 if(!p.fidelityContract||!['appearance','movement','text','identity'].every(k=>typeof p.fidelityContract[k]==='string'&&p.fidelityContract[k]))throw Error('Four fidelity locks required');
 if(p.firstDeliverySeconds!==10||!Number.isInteger(p.targetDurationSeconds)||p.targetDurationSeconds<15||!p.scenePlan?.budgetOnly)throw Error('Separate target and sample duration required');
 if(!Array.isArray(p.selectedStyles)||p.selectedStyles.length<1||p.selectedStyles.length>AtlasWorkflow.MAX_SELECTED_STYLES)throw Error('Choose one to ten styles');
 if(p.styleContributions!==undefined)AtlasWorkflow.combinationPlan(p,{requireResolved:true});
 if(p.preProduction&&JSON.stringify(p.preProduction)!==JSON.stringify(AtlasWorkflow.preProductionContract))throw Error('Incompatible visual preproduction contract');
 if(p.projectState?.preProductionApprovals)AtlasWorkflow.validatePreProductionApprovals(p.projectState.preProductionApprovals);
 for(const s of p.selectedStyles)if(!s.proof||!s.requirements||!s.audio||!s.preset?.productFidelity||s.referenceFrame?.styleId!==s.id||!s.referenceFrame?.path)throw Error('Incomplete style/reference contract');
 return p;
}
