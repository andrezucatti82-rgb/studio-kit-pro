import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseProductionRequest,validateProductionPlan as validatePlan} from './contracts.mjs';
import {AssetStore,digest} from './assets.mjs';
import {loadSkill} from './skills.mjs';
import {createPlanner} from './planner.mjs';
import {editMedia} from './editor.mjs';
import {renderProduction} from './renderer.mjs';
import {validateVideo} from './validator.mjs';
import {checkWorkflow} from '../scripts/workflow-gate.mjs';
import {pendingReview} from './review-record.mjs';
import {editGraph} from './graph-editor.mjs';
import {assertHandoffContext} from './handoff.mjs';
import {checkSampleApprovals} from './sample-approval.mjs';

export const states=['queued','analyzing','planning','editing','rendering','validating','completed','failed','cancelled'];
const terminal=new Set(['completed','failed','cancelled']);
export async function atomicJson(file,value){const temporary=`${file}.tmp`;await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');await fs.rename(temporary,file);}
export class Orchestrator {
 constructor({root,planner=createPlanner(),renderer=renderProduction,validator=validateVideo,editor,timeoutMs=15*60*1000,authorize,concurrency=2,context}={}){
  if(!root)throw Error('Job root required');this.root=path.resolve(root);this.store=new AssetStore(path.join(this.root,'assets'));this.planner=planner;this.renderer=renderer;this.validator=validator;this.editor=editor??((plan,...args)=>(plan.schemaVersion===2?editGraph:editMedia)(plan,...args));this.timeoutMs=timeoutMs;this.authorize=authorize;this.concurrency=concurrency;this.context=context;this.jobs=new Map();this.queue=[];this.active=null;this.persist=Promise.resolve();this.submissions=Promise.resolve();this.closing=false;
 }
 async init(){await this.store.init();await fs.mkdir(path.join(this.root,'jobs'),{recursive:true});
  // Single-host, single-worker ownership. Never replay a rendering job after a crash.
  this.lockFile=path.join(this.root,'worker.lock');
  try{this.lock=await fs.open(this.lockFile,'wx');await this.lock.writeFile(JSON.stringify({pid:process.pid}));}
  catch(error){if(error.code!=='EEXIST')throw error;throw Error('Worker lock exists: ensure old worker has stopped, then remove worker.lock explicitly');}
  try{for(const id of await fs.readdir(path.join(this.root,'jobs'))){if(!/^[a-f0-9-]{36}$/.test(id))continue;const file=path.join(this.root,'jobs',id,'job.json');try{const job=JSON.parse(await fs.readFile(file,'utf8'));if(!terminal.has(job.state)){job.state='failed';job.error='Worker interrupted; inspect inputs and submit a new request';await atomicJson(file,job);await fs.rm(path.join(this.root,'jobs',id,'work'),{recursive:true,force:true});}this.jobs.set(id,job);}catch(error){if(error.code!=='ENOENT')throw error;}}}catch(error){await this.close();throw error;}return this;
 }
 async close(){this.closing=true;for(const id of [...this.queue])await this.cancel(id);if(this.active){this.active.controller.abort(Error('Worker stopped'));await this.active.promise;}await this.flush();await this.lock?.close();if(this.lock)await fs.rm(this.lockFile,{force:true});this.lock=null;}
 directory(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job ID');return path.join(this.root,'jobs',id);}
 get(id){const job=this.jobs.get(id);if(!job)throw Error('Job not found');return structuredClone(job);}
 save(job){job.updatedAt=new Date().toISOString();const snapshot=structuredClone(job);this.persist=this.persist.then(()=>atomicJson(path.join(this.directory(job.id),'job.json'),snapshot));return this.persist;}
 async flush(){await this.persist;}
 async prepare(raw,{signal=AbortSignal.timeout(120000)}={}){
  const request=parseProductionRequest(raw),assets=await Promise.all([...new Set([...request.assetIds,...(request.musicAssetId?[request.musicAssetId]:[])])].map(id=>this.store.verify(id)));
  if(request.requestVersion===2)assertHandoffContext(this.context,request);
  const skill=await loadSkill(request.styleId,{allowAgent:request.requestVersion===2,selectedStyleIds:request.selectedStyleIds,context:this.context}),plan=validatePlan(await this.planner.plan(request,assets,skill,{signal}),assets,request,this.context);
  return {request,plan,productionRequestSha256:digest(Buffer.from(JSON.stringify(request))),productionPlanSha256:digest(Buffer.from(JSON.stringify(plan))),limitations:skill.limitations};
 }
 submit(raw,options={}){const pending=this.submissions.then(()=>this.submitOnce(raw,options));this.submissions=pending.catch(()=>{});return pending;}
 async submitOnce(raw,{idempotencyKey,workflowFile}={}){
  if(this.closing)throw Error('Worker is stopping');
  const request=parseProductionRequest(raw);
  if(request.requestVersion===2)assertHandoffContext(this.context,request);
  for(const assetId of [...request.assetIds,...(request.musicAssetId?[request.musicAssetId]:[])])await this.store.verify(assetId);
  if(idempotencyKey && !/^[a-zA-Z0-9_-]{8,100}$/.test(idempotencyKey))throw Error('Invalid idempotency key');
  const fingerprint=digest(Buffer.from(JSON.stringify(request))),existing=[...this.jobs.values()].find(j=>idempotencyKey?j.idempotencyKey===idempotencyKey:(!terminal.has(j.state)&&j.fingerprint===fingerprint));
  if(existing){if(existing.fingerprint!==fingerprint)throw Error('Idempotency key already used for a different request');return this.get(existing.id);}
  if(this.queue.length>=20)throw Error('Production queue full');
  let authorization,approvedPlan;
  if(this.authorize)authorization=await this.authorize(request);
  else {
   if(!workflowFile)throw Error('Production requires the existing scoped workflow approvals (--workflow)');
   const workflow=JSON.parse(await fs.readFile(workflowFile,'utf8'));
   const gate=request.phase==='sample'?checkSampleApprovals(workflow,path.dirname(path.resolve(workflowFile))):checkWorkflow(workflow,'full-render',path.dirname(path.resolve(workflowFile)));
   if(!gate.ready)throw Error('Production approval pending: '+gate.errors.join('; '));
   // Bind preproduction to the exact executable inputs. An old approval cannot authorize a changed request.
   if(workflow.productionRequestSha256!==fingerprint)throw Error('Workflow is not bound to this exact production request');
   const artifact=workflow.artifacts?.edit_plan,approval=workflow.approvals?.edit_plan;
   if(!artifact?.file)throw Error('Workflow needs an approved edit_plan artifact; prepare the request first');
   const bytes=await fs.readFile(path.resolve(path.dirname(workflowFile),artifact.file)),hash=digest(bytes);
   const basis=request.phase==='sample'?'storyboard':'integrated_sample';
   if(artifact.sha256!==hash||approval?.sha256!==hash||approval?.by!=='user'||approval?.status!=='approved'||!approval?.quote?.trim()||!approval?.messageRef?.trim()||approval?.basis?.[basis]!==workflow.artifacts[basis]?.sha256)throw Error('Executable edit plan needs matching scoped user approval based on the '+basis);
   approvedPlan=validatePlan(JSON.parse(bytes.toString()),await Promise.all([...new Set([...request.assetIds,...(request.musicAssetId?[request.musicAssetId]:[])])].map(id=>this.store.verify(id))),request,this.context);
   authorization={mode:'production',workflowFile:path.resolve(workflowFile),fingerprint,planSha256:hash,executablePlanSha256:digest(Buffer.from(JSON.stringify(approvedPlan))),workflowSha256:digest(Buffer.from(JSON.stringify(workflow)))};
  }
  const id=randomUUID(),job={id,request,fingerprint,idempotencyKey,authorization,state:'queued',progress:0,logs:[{at:new Date().toISOString(),state:'queued',message:'Request accepted'}],attempts:0,reviewStatus:'review_pending',createdAt:new Date().toISOString()};
  await fs.mkdir(this.directory(id),{recursive:false});if(request.requestVersion===2)await atomicJson(path.join(this.directory(id),'input-context.json'),this.context);if(approvedPlan)await atomicJson(path.join(this.directory(id),'approved-plan.json'),approvedPlan);this.jobs.set(id,job);await this.save(job);this.queue.push(id);queueMicrotask(()=>this.drain());return this.get(id);
 }
 async cancel(id){const job=this.jobs.get(id);if(!job)throw Error('Job not found');if(terminal.has(job.state))return this.get(id);if(this.active?.id===id){this.active.controller.abort(Error('Cancelled by user'));await this.active.promise;}else{this.queue=this.queue.filter(v=>v!==id);job.state='cancelled';job.logs.push({at:new Date().toISOString(),state:'cancelled',message:'Cancelled before processing'});await this.save(job);}return this.get(id);}
 async wait(id){while(!terminal.has(this.get(id).state)){await new Promise(resolve=>setTimeout(resolve,50));}await this.flush();return this.get(id);}
 drain(){if(this.closing||this.active||!this.queue.length)return;const id=this.queue.shift(),controller=new AbortController();this.active={id,controller,promise:null};this.active.promise=this.execute(id,controller).finally(()=>{this.active=null;this.drain();});}
 async execute(id,controller){
  const job=this.jobs.get(id),directory=this.directory(id),work=path.join(directory,'work'),{signal}=controller;
  let timedOut=false;const timer=setTimeout(()=>{timedOut=true;controller.abort(Error('Production execution limit reached'));},this.timeoutMs);
  const stage=async(state,progress,message)=>{signal.throwIfAborted();job.state=state;job.progress=progress;job.logs.push({at:new Date().toISOString(),state,message});await this.save(job);};
  try{
   await fs.mkdir(work,{recursive:true});
   await stage('analyzing',5,'Inspecting and hashing original media');
   const assets=await Promise.all([...new Set([...job.request.assetIds,...(job.request.musicAssetId?[job.request.musicAssetId]:[])])].map(id=>this.store.verify(id)));
   await atomicJson(path.join(directory,'media-analysis.json'),assets);
   const context=job.request.requestVersion===2?JSON.parse(await fs.readFile(path.join(directory,'input-context.json'),'utf8')):undefined;
   if(context)assertHandoffContext(context,job.request);
   const skill=await loadSkill(job.request.styleId,{allowAgent:job.request.requestVersion===2,selectedStyleIds:job.request.selectedStyleIds,context:this.context});await atomicJson(path.join(directory,'skill-snapshot.json'),skill);
   if(context?.catalogSnapshot?.sha256!==undefined&&context.catalogSnapshot.sha256!==skill.catalogSha256)throw Error('Catalogue changed after site import; review references before rendering');
   await stage('planning',12,job.authorization.mode==='production'?'Loading approved executable plan':`Planning provider: ${this.planner.name}`);
   const candidate=job.authorization.mode==='production'?JSON.parse(await fs.readFile(path.join(directory,'approved-plan.json'),'utf8')):await this.planner.plan(job.request,assets,skill,{signal});
   if(job.authorization.mode==='production'&&digest(Buffer.from(JSON.stringify(candidate)))!==job.authorization.executablePlanSha256)throw Error('Approved executable plan changed after submission');
   const plan=validatePlan(candidate,assets,job.request,context);await atomicJson(path.join(directory,'edit-plan.json'),plan);
   await stage('editing',20,'Trimming/reordering original media and preparing soundtrack');
   const edited=await this.editor(plan,this.store,work,{signal});await atomicJson(path.join(directory,'score-provenance.json'),edited.score);
   await stage('rendering',30,'Rendering frame-driven Remotion composition');
   let rendered;
   for(let attempt=1;attempt<=2;attempt++){
    job.attempts=attempt;await this.save(job);
    try{rendered=await this.renderer(edited,work,{signal,concurrency:attempt===1?this.concurrency:1,onProgress:p=>{const progress=30+Math.floor(p*55);if(progress>job.progress){job.progress=progress;this.save(job).catch(error=>controller.abort(error));}}});break;}
    catch(error){if(signal.aborted||attempt===2||!/Target closed|ENOMEM|ECONNRESET|timeout/i.test(error.message))throw error;job.logs.push({at:new Date().toISOString(),state:'rendering',message:'Recoverable render error; retrying once with concurrency 1'});}
   }
   await stage('validating',90,'Checking codecs, frames, duration, audio and full decode');
   const report=await this.validator(rendered.output,plan,{signal});await atomicJson(path.join(directory,'technical-report.json'),report);signal.throwIfAborted();
   await atomicJson(path.join(directory,'review.json'),await pendingReview(report,job.authorization));
   await fs.rename(rendered.output,path.join(directory,'candidate.mp4'));
   for(const frame of rendered.reviewFrames??[])await fs.copyFile(path.join(work,`frame-${frame}.jpg`),path.join(directory,`frame-${frame}.jpg`));
   const srt=plan.captions.map((c,i)=>`${i+1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n');await fs.writeFile(path.join(directory,'captions.srt'),srt);
   job.result={file:'candidate.mp4',sha256:report.sha256,bytes:report.bytes,frames:rendered.reviewFrames??[],plan:'edit-plan.json',report:'technical-report.json',captions:'captions.srt'};
   await stage('completed',100,'Technical pipeline complete; audiovisual review pending');
  }catch(error){job.state=signal.aborted&&!timedOut?'cancelled':'failed';job.error=String(error.message).slice(0,2000);job.logs.push({at:new Date().toISOString(),state:job.state,message:job.error});await this.save(job);}
  finally{clearTimeout(timer);await fs.rm(work,{recursive:true,force:true});}
 }
}
function srtTime(seconds){const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;}
