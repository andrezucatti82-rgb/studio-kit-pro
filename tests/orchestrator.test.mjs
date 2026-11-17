import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {requestSchema,STYLE_ID,validatePlan} from '../server/schema.mjs';
import {loadSkill} from '../server/skills.mjs';
import {deterministicPlan,createPlanner} from '../server/planner.mjs';
import {Orchestrator,atomicJson} from '../server/orchestrator.mjs';
import {AssetStore,digest} from '../server/assets.mjs';
import {run,probe} from '../server/process.mjs';
import {createProductionServer} from '../server/http.mjs';
import {editMedia} from '../server/editor.mjs';
import {validateVideo,frameRate} from '../server/validator.mjs';
import {bezierProgress,motionAt,morphPoints,motionRegistry} from '../src/production/motion.mjs';

let imageBytes,skill;
before(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gda-input-'));
 try{await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=blue:s=64x64','-frames:v','1',path.join(root,'fixture.png')]);imageBytes=await fs.readFile(path.join(root,'fixture.png'));skill=await loadSkill();}finally{await fs.rm(root,{recursive:true,force:true});}
});
const raw=id=>({styleId:STYLE_ID,prompt:'Uma ideia ganha espaço. O movimento organiza o argumento e conecta a conclusão.',assetIds:[id],durationSeconds:30});
const fakeRenderBytes=Buffer.from('unit-test-render-stub-not-a-video');
async function harness(overrides={}){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gda-job-'));
 const renderer=async(edited,work)=>{const output=path.join(work,'unit-stub.bin');await fs.writeFile(output,fakeRenderBytes);return {output,reviewFrames:[]};};
 const validator=async()=>({status:'passed',sha256:digest(fakeRenderBytes),bytes:fakeRenderBytes.length,creativeReview:'review_pending'});
 const o=new Orchestrator({root,authorize:async()=>({mode:'unit-test-fixture'}),editor:async plan=>({plan,score:{origin:'unit stub'}}),renderer,validator,...overrides});
 await o.init();const asset=await o.store.import(imageBytes,{name:'Original test image',rights:'Original fixture created by test code'});
 return {o,root,asset,cleanup:async()=>{await o.close();await fs.rm(root,{recursive:true,force:true});}};
}

test('strict request and plan schemas reject commands, paths, unsupported styles and changed output',async()=>{
 const asset={id:'fixture',kind:'image',durationSeconds:0};const request=requestSchema.parse(raw(asset.id));
 const plan=deterministicPlan(request,[asset],skill);assert.equal(validatePlan(plan,[asset],request).output.durationFrames,900);
 for(const extra of [{command:'touch /tmp/pwned'},{assetIds:['../secret']},{styleId:'unimplemented-style'}])assert.throws(()=>requestSchema.parse({...raw(asset.id),...extra}));
 for(const mutate of [p=>p.scenes[0].command='evil',p=>p.scenes[0].assetId='other',p=>p.output.fps=24,p=>p.scenes[1].id=p.scenes[0].id,p=>p.fidelity.inventAngles=true,p=>p.scenes[0].sourceStartSeconds=5,p=>p.audio.musicAssetId='other',p=>p.resources=['After Effects'],p=>p.scenes.at(-1).effects=[]]){const p=structuredClone(plan);mutate(p);assert.throws(()=>validatePlan(p,[asset],request));}
});
test('caption timing, source trims and readable animation are enforced before execution',()=>{
 const asset={id:'fixture',kind:'video',durationSeconds:35};const request=requestSchema.parse(raw(asset.id)),plan=deterministicPlan(request,[asset],skill);
 for(const mutate of [p=>p.captions[1].start=0,p=>p.captions[0].end=40,p=>p.scenes[0].sourceStartSeconds=34,p=>p.scenes[0].animation.delayFrames=30,p=>p.scenes[0].transition={type:'shape-reveal',durationFrames:0,reason:'fixture'}]){const p=structuredClone(plan);mutate(p);if(p.scenes[0].animation.delayFrames===30)p.scenes[0].durationFrames=31;assert.throws(()=>validatePlan(p,[asset],request));}
 const cues=requestSchema.parse({...raw(asset.id),captions:[{start:0,end:5.8,text:'Uma ideia.'},{start:6,end:13.8,text:'Uma nova hierarquia.'},{start:14,end:30,text:'Uma conclusão que conecta.'}]});
 assert.deepEqual(deterministicPlan(cues,[asset],skill).scenes.map(s=>s.durationFrames),[180,240,480]);
});
test('skill adapter preserves full source hashes, style mechanism and existing fidelity rules',async()=>{
 assert.equal(skill.style.id,STYLE_ID);assert.equal(skill.catalogVersion,JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8')).version);assert(skill.records.some(r=>r.file.endsWith('scene.js')));
 for(const r of skill.records)assert.equal(digest(Buffer.from(r.content)),r.sha256);
 assert.equal(skill.rules.inventAngles,false);assert.match(skill.style.motion,/cedem espaço/);
});
test('Bezier motion has stable endpoints, non-linear spacing, deterministic sampling and compatible morphs',()=>{
 assert.equal(bezierProgress(-1),0);assert.equal(bezierProgress(2),1);assert(bezierProgress(.5)>.8);
 let previous=0;for(let i=0;i<=100;i++){const current=bezierProgress(i/100);assert(current>=previous);previous=current;}
 assert.equal(motionAt(42,10,40),motionAt(42,10,40));
 assert.deepEqual(morphPoints([[0,0],[1,0],[1,1]],[[0,2],[3,0],[1,3]],.5),[[0,1],[2,0],[1,2]]);
 assert.throws(()=>morphPoints([[0,0]],[[0,0]],.5));assert.equal(motionRegistry.length,5);
});
test('planning is deterministic by default and never silently invokes a paid provider',async()=>{
 assert.equal(createPlanner().name,'deterministic');assert.throws(()=>createPlanner({provider:'openai',apiKey:'test',model:'test'}),/opt-in/);
 let calls=0;const p=createPlanner({provider:'openai',allowPaid:true,apiKey:'test-only-key',model:'test-only-model',fetchImpl:async()=>{calls++;return {ok:false,status:429};}});
 const request=requestSchema.parse(raw('fixture'));await assert.rejects(p.plan(request,[{id:'fixture',kind:'image'}],skill),/HTTP 429/);assert.equal(calls,1);
});
test('OpenAI adapter validates a mocked response and bounds plan repair (not a real model test)',async()=>{
 const asset={id:'fixture',kind:'image'},request=requestSchema.parse(raw(asset.id)),good=deterministicPlan(request,[asset],skill);let calls=0;
 const planner=createPlanner({provider:'openai',allowPaid:true,apiKey:'test-key',model:'test-model',fetchImpl:async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/chat/completions');assert(!opts.body.includes('test-key'));calls++;return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(calls===1?{command:'forbidden'}:good)}}]})};}});
 assert.equal((await planner.plan(request,[asset],skill)).provider,'openai');assert.equal(calls,2);
});
test('assets are probed, licensed and immutable; text, unsafe IDs and hash changes are rejected',async()=>{
 const h=await harness();try{assert.equal(h.asset.kind,'image');assert.equal(h.asset.width,64);await assert.rejects(h.o.store.import(Buffer.from('not media'),{rights:'test original'}));await assert.rejects(h.o.store.import(imageBytes,{}),/rights/);assert.throws(()=>h.o.store.file('../secret'));await fs.appendFile(h.o.store.file(h.asset.id),'modified');await assert.rejects(h.o.store.verify(h.asset.id),/changed/);}finally{await h.cleanup();}
});
test('concurrent duplicate submissions share one job and conflicting idempotency keys fail',async()=>{
 const h=await harness();try{const [a,b]=await Promise.all([h.o.submit(raw(h.asset.id),{idempotencyKey:'same-request-key'}),h.o.submit(raw(h.asset.id),{idempotencyKey:'same-request-key'})]);assert.equal(a.id,b.id);await assert.rejects(h.o.submit({...raw(h.asset.id),prompt:'Different brief'},{idempotencyKey:'same-request-key'}),/different request/);const job=await h.o.wait(a.id);assert.equal(job.state,'completed');assert.equal(job.reviewStatus,'review_pending');assert.deepEqual(job.logs.map(l=>l.state),['queued','analyzing','planning','editing','rendering','validating','completed']);const review=JSON.parse(await fs.readFile(path.join(h.o.directory(a.id),'review.json'),'utf8'));assert.equal(review.videoSha256,job.result.sha256);assert.equal(review.playback.status,'not_run');assert.equal(review.listening.status,'not_run');assert.equal(review.preProduction.moodboardApproved,false);await assert.rejects(fs.stat(path.join(h.o.directory(a.id),'work')),/ENOENT/);}finally{await h.cleanup();}
});
test('normal production rejects missing approvals without starting an editor',async()=>{
 const h=await harness({authorize:undefined});try{await assert.rejects(h.o.submit(raw(h.asset.id)),/scoped workflow approvals/);assert.equal(h.o.jobs.size,0);}finally{await h.cleanup();}
});
test('production requires the exact approved executable plan and never replans it',async()=>{
 const h=await harness({authorize:undefined});
 try{
  const prepared=await h.o.prepare(raw(h.asset.id)),w={schemaVersion:1,productionRequestSha256:prepared.productionRequestSha256,artifacts:{},approvals:{},requiredComponents:['typography','media','score']};
  // Synthetic approval records ONLY exercise the gate, not a user decision or media review.
  for(const scope of ['visual','script','animatic','integrated_sample']){const bytes=Buffer.from('synthetic test fixture '+scope);await fs.writeFile(path.join(h.root,scope),bytes);w.artifacts[scope]={file:scope,sha256:digest(bytes)};w.approvals[scope]={status:'approved',by:'user',quote:'Synthetic fixture, not an actual approval',messageRef:'unit-test-only-'+scope,sha256:digest(bytes),basis:Object.fromEntries(Object.entries(w.artifacts).filter(([k])=>k!==scope).map(([k,v])=>[k,v.sha256]))};}
  Object.assign(w.artifacts.integrated_sample,{components:w.requiredComponents,hardestShot:'Test only',transitionEvidence:'Test only'});
  const file=path.join(h.root,'workflow.json');await atomicJson(file,w);
  await assert.rejects(h.o.submit(raw(h.asset.id),{workflowFile:file}),/approved edit_plan/);
  const bytes=Buffer.from(JSON.stringify(prepared.plan,null,2)+'\n');await fs.writeFile(path.join(h.root,'approved.json'),bytes);
  w.artifacts.edit_plan={file:'approved.json',sha256:digest(bytes)};w.approvals.edit_plan={status:'approved',by:'user',quote:'Synthetic fixture only',messageRef:'unit-only-plan',sha256:digest(bytes),basis:{integrated_sample:w.artifacts.integrated_sample.sha256}};await atomicJson(file,w);
  h.o.planner={name:'must-not-call',plan:async()=>{throw Error('Unexpected replan after approval');}};
  const job=await h.o.submit(raw(h.asset.id),{workflowFile:file});assert.equal((await h.o.wait(job.id)).state,'completed');
  await fs.appendFile(path.join(h.root,'approved.json'),' ');
  await assert.rejects(h.o.submit(raw(h.asset.id),{workflowFile:file}),/matching scoped user approval/);
 }finally{await h.cleanup();}
});
test('cancellation aborts the renderer and cleans temporary files',async()=>{
 let rendering;const started=new Promise(r=>rendering=r);
 const h=await harness({renderer:async(e,w,{signal})=>{rendering();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 try{const job=await h.o.submit(raw(h.asset.id));await started;const cancelled=await h.o.cancel(job.id);assert.equal(cancelled.state,'cancelled');assert.equal(cancelled.attempts,1);await assert.rejects(fs.stat(path.join(h.o.directory(job.id),'work')),/ENOENT/);}finally{await h.cleanup();}
});
test('timeout fails a job and bounded recovery retries only one transient render failure',async()=>{
 const h=await harness({timeoutMs:100,renderer:async(e,w,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 try{const j=await h.o.submit(raw(h.asset.id));const result=await h.o.wait(j.id);assert.equal(result.state,'failed');assert.match(result.error,/limit/);}finally{await h.cleanup();}
 let attempts=0;
 const h2=await harness({renderer:async(e,w,{concurrency})=>{attempts++;if(attempts===1)throw Error('Target closed');assert.equal(concurrency,1);const output=path.join(w,'stub');await fs.writeFile(output,fakeRenderBytes);return {output,reviewFrames:[]};}});
 try{const j=await h2.o.submit(raw(h2.asset.id));assert.equal((await h2.o.wait(j.id)).state,'completed');assert.equal(attempts,2);}finally{await h2.cleanup();}
});
test('worker ownership prevents concurrent execution and interrupted jobs never auto-replay',async()=>{
 const h=await harness();try{await assert.rejects(new Orchestrator({root:h.root}).init(),/Worker lock exists/);await h.o.close();const jobId='11111111-1111-4111-8111-111111111111';await fs.mkdir(path.join(h.root,'jobs',jobId));await atomicJson(path.join(h.root,'jobs',jobId,'job.json'),{id:jobId,state:'rendering'});const next=await new Orchestrator({root:h.root}).init();assert.equal(next.get(jobId).state,'failed');await next.close();}finally{await h.cleanup();}
});
test('HTTP requires a local session, token and same origin; preview supports byte ranges',async()=>{
 const h=await harness(),server=createProductionServer(h.o);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/api/jobs')).status,401);
  const home=await fetch(base),cookie=home.headers.get('set-cookie').split(';')[0];assert.match(await home.text(),/production-config.js/);
  const config=await(await fetch(base+'/production-config.js',{headers:{cookie}})).text(),token=JSON.parse(config.match(/token:("[^"]+")/)[1]);
  const headers={cookie,'X-GDA-Token':token,'Content-Type':'application/json'};
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{cookie},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'})).status,403);
  assert.equal((await fetch(base+'/api/jobs',{method:'POST',headers,body:JSON.stringify({...raw(h.asset.id),command:'bad'})})).status,400);
  const response=await fetch(base+'/api/jobs',{method:'POST',headers,body:JSON.stringify(raw(h.asset.id))});assert.equal(response.status,202);const job=await response.json();await h.o.wait(job.id);
  const ranged=await fetch(base+`/api/jobs/${job.id}/candidate.mp4`,{headers:{cookie,Range:'bytes=0-3'}});assert.equal(ranged.status,206);assert.equal(await ranged.text(),'unit');
  assert.equal((await fetch(base+`/api/jobs/${job.id}/frame-999.jpg`,{headers:{cookie}})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));await h.cleanup();}
});
test('FFmpeg editor really trims and reorders media, and output validation rejects wrong duration',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gda-edit-'));
 try{
  const source=path.join(root,'source.mp4');await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=blue:s=64x64:r=30:d=12','-f','lavfi','-i','sine=frequency=440:duration=12','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',source]);
  const store=new AssetStore(path.join(root,'assets'));await store.init();const asset=await store.import(await fs.readFile(source),{rights:'Original FFmpeg fixture, test only'});
  const request=requestSchema.parse({...raw(asset.id),durationSeconds:10});const plan=deterministicPlan(request,[asset],skill);const edited=await editMedia(plan,store,path.join(root,'work'));
  const metadata=await probe(path.join(edited.publicDir,edited.plan.media[0].src));assert(Math.abs(Number(metadata.format.duration)-plan.scenes[0].durationFrames/30)<.1);assert(metadata.streams.some(s=>s.codec_type==='audio'));
  await assert.rejects(validateVideo(source,plan),/does not match plan/);assert.equal(frameRate('30000/1001'),30000/1001);assert(Number.isNaN(frameRate('30/0')));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
