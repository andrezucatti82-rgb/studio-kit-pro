import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import '../style-atlas/dist/guided.js';
import '../style-atlas/dist/workflow.js';
import {importSiteRequest,readContext,contextFingerprint,assertHandoffContext} from '../server/handoff.mjs';
import {graphPlanSchema,graphRequestSchema,validateGraphPlan} from '../server/scene-graph.mjs';
import {checkSampleApprovals} from '../server/sample-approval.mjs';
import {sha256} from '../scripts/workflow-gate.mjs';
import {loadSkill} from '../server/skills.mjs';
import {musicGainAt} from '../src/production/audio.mjs';
import {Orchestrator} from '../server/orchestrator.mjs';
import {digest} from '../server/assets.mjs';
import {AssetStore} from '../server/assets.mjs';
import {editGraph} from '../server/graph-editor.mjs';
import {run,probe} from '../server/process.mjs';
const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8')),W=globalThis.AtlasWorkflow;
function choice(){return {selectedStyles:[catalog.styles.find(s=>s.id==='tipografia-cinetica'),catalog.styles.find(s=>s.family==='software')].map(s=>({...s,referenceFrame:W.referenceFrame(s),visualSequence:s.sequence})),styleContributions:{'tipografia-cinetica':[{aspect:'kinetic_type',scope:'film'}],[catalog.styles.find(s=>s.family==='software').id]:[{aspect:'lighting',scope:'details'}]},catalogVersion:catalog.version,catalogUrl:'https://example.org/catalog.json',topic:'Vídeo de teste de passagem completa',brand:'Marca de teste',typography:'auto',targetDurationSeconds:30,format:'16:9',projectState:{history:[],approvals:W.emptyApprovals(),preProductionApprovals:W.emptyPreProductionApprovals()}};}
async function imported(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'video-handoff-')),c=choice();c.styleContributions={[c.selectedStyles[0].id]:[{aspect:'kinetic_type',scope:'film'}],[c.selectedStyles[1].id]:[{aspect:'lighting',scope:'details'}]};const file=path.join(root,'site-project.json');await fs.writeFile(file,W.starterFiles(c).find(f=>f.name==='projeto-video.json').text);const project=path.join(root,'project');await importSiteRequest(file,project);return {root,project,c,context:await readContext(project),cleanup:()=>fs.rm(root,{recursive:true,force:true})};}
function planFor(context){const scene=(id,role)=>({id,role,durationFrames:450,background:'#09122a',initialState:'Uma mensagem entra',action:'O texto revela o argumento',result:'Mensagem legível',transition:{type:'cut',durationFrames:0,reason:'Mudança de ideia'},layers:[{id:'copy',type:'text',text:'UMA IDEIA',x:.1,y:.2,width:.8,height:.4,font:'Geist',fontSize:90,color:'#eeeeee',kinetic:'word'}]});return graphPlanSchema.parse({schemaVersion:2,provider:'agent',styleId:context.selectedStyleIds[0],selectedStyleIds:context.selectedStyleIds,contextSha256:context.contextSha256,objective:context.topic,output:{format:'16:9',width:1280,height:720,fps:30,durationFrames:900,codec:'h264'},fidelity:{preserveOriginals:true,inventAngles:false,avatar:false},scenes:[scene('opening','opening'),scene('detail','details')],audio:{proceduralScore:false,tracks:[]},captions:[],styleBindings:[{styleId:context.selectedStyleIds[0],aspect:'kinetic_type',scope:'film',sceneIds:['opening','detail'],decision:'Texto em camadas editáveis, com revelação por palavra',implementation:'layers',referenceIds:[context.selectedStyleIds[0]+':frame:1']},{styleId:context.selectedStyleIds[1],aspect:'lighting',scope:'details',sceneIds:['detail'],decision:'Luz aplicada somente à cena de detalhes conforme referência',implementation:'layers',referenceIds:[context.selectedStyleIds[1]+':frame:2']}],limitations:['Teste de software, sem aprovação estética']});}
function requestFor(c){return graphRequestSchema.parse({requestVersion:2,prompt:c.topic,styleId:c.selectedStyleIds[0],selectedStyleIds:c.selectedStyleIds,contextSha256:c.contextSha256,assetIds:[],durationSeconds:30,format:'16:9',fps:30,phase:'full'});}

test('site prompt, Page and starter bundle route both agents to real execution without another model API',()=>{
 const c=choice();for(const text of [W.buildPrompt(c),W.pagePrompt('https://example.org/catalog.json')])for(const marker of ['CODEX OU CLAUDE CODE','npm run video -- import','schemaVersion 2','MP4 realmente produzido','custos','HeyGen'])assert(text.includes(marker),marker);
 const bundle=JSON.parse(W.starterFiles(c).find(f=>f.name==='projeto-video.json').text);assert.equal(bundle.orchestrator.runtimeVersion,'2.11.0');assert.deepEqual(bundle.orchestrator.selectedStyleIds,c.selectedStyles.map(s=>s.id));assert.equal(bundle.orchestrator.filesTransferred,false);
});
test('full site bundle imports every selected contribution, reference and original source without granting approvals',async()=>{
 const h=await imported();try{assert.deepEqual(h.context.selectedStyleIds,h.c.selectedStyles.map(s=>s.id));assert.equal(h.context.combination.entries[1].contributions[0].scope,'details');assert.equal(h.context.sourceBrief.packageVersion,1);assert.equal(h.context.referenceManifest.styles[0].frames.length,4);assert.deepEqual(h.context.contract.approvalCriteria,W.fidelityContract);assert.equal(h.context.contextSha256,contextFingerprint(h.context));const wf=JSON.parse(await fs.readFile(path.join(h.project,'workflow.json'),'utf8'));assert.notEqual(wf.approvals.visual?.status,'approved');const file=path.join(h.project,'agent-context.json');const changed=structuredClone(h.context);changed.topic='Tampered';await fs.writeFile(file,JSON.stringify(changed));await assert.rejects(readContext(h.project),/modified/);}finally{await h.cleanup();}
});
test('graph preserves explicit contributions/scopes and rejects silent substitution, omitted aspects and forged references',async()=>{
 const h=await imported();try{const p=planFor(h.context),r=requestFor(h.context);assert.equal(validateGraphPlan(p,[],r,h.context).provider,'agent');assertHandoffContext(h.context,r);
  for(const mutate of [p=>p.selectedStyleIds.reverse(),p=>p.styleBindings.pop(),p=>p.styleBindings[1].scope='film',p=>p.styleBindings[1].sceneIds=['opening'],p=>p.styleBindings[0].referenceIds=['made-up-frame'],p=>p.styleBindings[0].aspect='palette']){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateGraphPlan(bad,[],r,h.context));}
  assert.throws(()=>assertHandoffContext(h.context,{...r,durationSeconds:15}),/duration/);
 }finally{await h.cleanup();}
});
test('graph rejects executable data, paths, invalid assets, unsafe fonts, timeline gaps and excessive text motion',async()=>{
 const h=await imported();try{const p=planFor(h.context),r=requestFor(h.context);
  for(const mutate of [p=>p.command='arbitrary shell',p=>p.scenes[0].layers[0].font="x';url(secret)",p=>p.scenes[0].durationFrames=100,p=>p.scenes[0].layers[0].x=.9,p=>p.scenes[0].layers[0].animations=[{property:'opacity',keyframes:[{frame:100,value:1},{frame:0,value:0}]}],p=>p.scenes[0].layers[0].kinetic='character']){const bad=structuredClone(p);mutate(bad);if(bad.scenes[0].layers[0].kinetic==='character'){bad.scenes[0].layers[0].text='a'.repeat(220);bad.scenes[0].layers[0].staggerFrames=12;}assert.throws(()=>validateGraphPlan(bad,[],r,h.context));}
  const bad=structuredClone(p);bad.scenes[0].layers=[{id:'media',type:'media',x:0,y:0,width:1,height:1,assetId:'missing',sourceStartSeconds:0,fit:'contain',volume:0,radius:0,animations:[],opacity:1,scale:1,rotation:0}];assert.throws(()=>validateGraphPlan(bad,[],r,h.context),/asset/);
 }finally{await h.cleanup();}
});
test('all catalogue styles remain selectable context; an untested style is never silently routed to the editorial POC',async()=>{
 for(const s of catalog.styles){const handoff=W.orchestratorHandoff({selectedStyles:[s],format:'9:16',targetDurationSeconds:30});assert.equal(handoff.selectedStyleIds[0],s.id);}
 const other=catalog.styles.find(s=>s.family==='software');await assert.rejects(loadSkill(other.id),/tested local executor/);const loaded=await loadSkill(other.id,{allowAgent:true});assert.equal(loaded.interpretation,other.motion);assert.equal(loaded.styles[0].id,other.id);
});
test('sample requires independent visual, script, moodboard and storyboard approvals and a fresh moodboard basis',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'video-sample-'));try{const w={schemaVersion:1,artifacts:{},approvals:{}};for(const scope of ['visual','script','moodboard','storyboard']){const file=path.join(root,scope);await fs.writeFile(file,'Synthetic test fixture '+scope);const hash=sha256(file);w.artifacts[scope]={file:scope,sha256:hash};w.approvals[scope]={status:'approved',by:'user',sha256:hash,quote:'Synthetic test fixture, not a real approval',messageRef:'test-'+scope};}w.approvals.storyboard.basis={moodboard:w.artifacts.moodboard.sha256};assert.equal(checkSampleApprovals(w,root).ready,true);delete w.approvals.moodboard;assert.equal(checkSampleApprovals(w,root).ready,false);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('music ducking uses actual narration intervals, smooth attack/release and never ducks for SFX',()=>{
 const tracks=[{role:'narration',fromFrame:60,durationFrames:60},{role:'sfx',fromFrame:10,durationFrames:10}];assert.equal(musicGainAt(15,tracks,30),1);assert.equal(musicGainAt(60,tracks,30),.3);assert.equal(musicGainAt(90,tracks,30),.3);assert.equal(musicGainAt(150,tracks,30),1);assert(musicGainAt(58,tracks,30)>.3&&musicGainAt(58,tracks,30)<1);assert(musicGainAt(123,tracks,30)>.3&&musicGainAt(123,tracks,30)<1);
});
test('explicit typography, narrated ad requirements and avatar selection cannot be silently dropped',async()=>{
 const h=await imported();try{const p=planFor(h.context),r=requestFor(h.context);
  const typo=structuredClone(h.context);typo.typographySelection={heading:'Inter',body:'Manrope'};assert.throws(()=>validateGraphPlan(p,[],r,typo),/typography/);
  const avatar=structuredClone(p);avatar.fidelity.avatar=true;assert.throws(()=>validateGraphPlan(avatar,[],r,h.context),/Avatar/);
  const ad=structuredClone(h.context),adPlan=structuredClone(p);ad.styles[0].advertising={narrationRequired:true};ad.combination.entries[0].contributions=[{aspect:'style_direction',scope:'film'}];adPlan.styleBindings[0].aspect='style_direction';assert.throws(()=>validateGraphPlan(adPlan,[],r,ad),/narrated ad/);
 }finally{await h.cleanup();}
});
test('graph sample runs only after its independent approvals and executes the approved plan without another model call',async()=>{
 const h=await imported();let o;
 try{
  const request=graphRequestSchema.parse({...requestFor(h.context),durationSeconds:10,phase:'sample'}),plan=planFor(h.context);plan.output.durationFrames=300;for(const scene of plan.scenes)scene.durationFrames=150;
  const bytes=Buffer.from('explicit unit render stub, not a video'),root=path.join(h.project,'worker');
  o=await new Orchestrator({root,context:h.context,planner:{name:'agent',plan:async()=>{throw Error('Must not replan an approved sample');}},editor:async plan=>({plan,score:{origin:'unit-test stub'}}),renderer:async(e,w)=>{const output=path.join(w,'stub');await fs.writeFile(output,bytes);return {output,reviewFrames:[]};},validator:async()=>({status:'passed',sha256:digest(bytes),bytes:bytes.length})}).init();
  const w={schemaVersion:1,productionRequestSha256:digest(Buffer.from(JSON.stringify(request))),artifacts:{},approvals:{}};
  for(const scope of ['visual','script','moodboard','storyboard']){const file=path.join(h.project,scope);await fs.writeFile(file,'Synthetic software test '+scope);const hash=sha256(file);w.artifacts[scope]={file:scope,sha256:hash};w.approvals[scope]={status:'approved',by:'user',sha256:hash,quote:'Synthetic fixture only, not an actual user approval',messageRef:'unit-'+scope};}
  w.approvals.storyboard.basis={moodboard:w.artifacts.moodboard.sha256};await fs.writeFile(path.join(h.project,'sample-plan.json'),JSON.stringify(plan));const hash=sha256(path.join(h.project,'sample-plan.json'));w.artifacts.edit_plan={file:'sample-plan.json',sha256:hash};w.approvals.edit_plan={status:'approved',by:'user',sha256:hash,quote:'Synthetic fixture only',messageRef:'unit-plan',basis:{storyboard:w.artifacts.storyboard.sha256}};
  const workflowFile=path.join(h.project,'sample-workflow.json'),validApproval=w.approvals.moodboard;delete w.approvals.moodboard;await fs.writeFile(workflowFile,JSON.stringify(w));await assert.rejects(o.submit(request,{workflowFile}),/approval/);w.approvals.moodboard=validApproval;await fs.writeFile(workflowFile,JSON.stringify(w));const job=await o.submit(request,{workflowFile});const result=await o.wait(job.id);assert.equal(result.state,'completed');assert.equal(result.request.phase,'sample');assert.equal(result.reviewStatus,'review_pending');
 }finally{await o?.close();await h.cleanup();}
});
test('authorized music loops through real FFmpeg, while narration is never silently repeated or cut past its source',async()=>{
 const h=await imported();try{const source=path.join(h.project,'original-tone.wav');await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','sine=frequency=220:duration=1',source]);const store=new AssetStore(path.join(h.project,'assets'));await store.init();const a=await store.import(await fs.readFile(source),{rights:'Original synthetic test tone, no third party recording'}),r={...requestFor(h.context),assetIds:[a.id]},p=planFor(h.context);p.audio.tracks=[{assetId:a.id,role:'music',fromFrame:0,sourceStartSeconds:0,durationFrames:900,volume:.2,fadeFrames:8,loop:true}];const plan=validateGraphPlan(p,[a],r,h.context),edited=await editGraph(plan,store,path.join(h.project,'work'));const metadata=await probe(path.join(edited.publicDir,edited.plan.renderAudio[0].src));assert.equal(Number(metadata.format.duration),30);p.audio.tracks[0].role='narration';assert.throws(()=>validateGraphPlan(p,[a],r,h.context),/Looping/);p.audio.tracks[0].loop=false;assert.throws(()=>validateGraphPlan(p,[a],r,h.context),/source/);
 }finally{await h.cleanup();}
});
