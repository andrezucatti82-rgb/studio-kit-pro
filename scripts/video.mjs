import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {z} from 'zod';
import {importSiteRequest,readContext,runtimeContext,makeGraphRequest,fingerprint,registerDurationSource} from '../server/handoff.mjs';
import {graphPlanSchema,validateGraphPlan,graphRequestSchema} from '../server/scene-graph.mjs';
import {AssetStore,digest} from '../server/assets.mjs';
import {Orchestrator,atomicJson} from '../server/orchestrator.mjs';
import {editGraph} from '../server/graph-editor.mjs';
import {repoRoot} from '../server/skills.mjs';
import {checkReview} from './review.mjs';
import {checkWorkflow} from './workflow-gate.mjs';

const args=process.argv.slice(2),command=args[0],arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const required=key=>{const value=arg(key);if(!value||value.startsWith('--'))throw Error(`Missing ${key}`);return value;};
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
async function exactFile(file,value){const text=JSON.stringify(value,null,2)+'\n';try{await fs.writeFile(file,text,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;if(await fs.readFile(file,'utf8')!==text)throw Error('Preserving existing different file: '+file);}}

try{
 if(command==='import')console.log(JSON.stringify(await importSiteRequest(required('--preset'),required('--out')),null,2));
 else {
  const project=path.resolve(required('--project')),context=await readContext(project),root=path.join(project,'runtime'),store=new AssetStore(path.join(root,'assets'));await store.init();
  if(command==='media'){
   const source=args.includes('--duration-source'),file=required('--file');
   if(source&&context.durationMode!=='source')throw Error('This request does not preserve source duration');
   const asset=await store.import(await fs.readFile(file),{name:path.basename(file),rights:required('--rights')});
   const result=source?{...asset,durationSource:await registerDurationSource(context,store,asset.id)}:asset;
   console.log(JSON.stringify(result,null,2));
  }
  else if(command==='context'){
   const result=await runtimeContext(project,store),schema=path.join(project,'render-plan.schema.json');await fs.writeFile(schema,JSON.stringify(z.toJSONSchema(graphPlanSchema),null,2)+'\n');console.log(JSON.stringify({...result,planSchemaFile:schema,environment:{node:process.version,heygenEnvironmentKey:Boolean(process.env.HEYGEN_API_KEY),note:'A connected HeyGen plugin/API may exist outside environment variables. Verify available tools before requesting credentials. Never print secret values.'}},null,2));
  }else if(['validate','stills','render'].includes(command)){
   const raw=await read(required('--plan')),phase=arg('--phase','full'),request=graphRequestSchema.parse(await makeGraphRequest(context,store,{phase,durationSeconds:phase==='sample'?raw.output.durationFrames/raw.output.fps:context.targetDurationSeconds,fps:raw.output.fps}));
   const assets=await Promise.all(request.assetIds.map(id=>store.verify(id))),plan=validateGraphPlan(raw,assets,request,context);
   const prepared=path.join(project,'prepared',phase+'-'+fingerprint({request,plan}).slice(0,16));await fs.mkdir(prepared,{recursive:true});await exactFile(path.join(prepared,'request.json'),request);await exactFile(path.join(prepared,'edit-plan.json'),plan);
   const preparation={requestFile:path.join(prepared,'request.json'),planFile:path.join(prepared,'edit-plan.json'),productionRequestSha256:digest(Buffer.from(JSON.stringify(request))),editPlanSha256:digest(await fs.readFile(path.join(prepared,'edit-plan.json'))),phase,contextSha256:context.contextSha256};await exactFile(path.join(prepared,'preparation.json'),preparation);
   if(command==='validate')console.log(JSON.stringify({status:'valid_not_rendered',...preparation},null,2));
   else if(command==='stills'){
    const out=path.resolve(arg('--out',path.join(prepared,'storyboard')));await fs.mkdir(out,{recursive:true});const work=await fs.mkdtemp(path.join(out,'.render-work-'));
    try{const edited=await editGraph(plan,store,work),serveUrl=await bundle({entryPoint:path.join(repoRoot,'src/production/index.tsx'),publicDir:edited.publicDir,outDir:path.join(work,'bundle')}),browserExecutable=process.env.CHROME_PATH,inputProps={plan:edited.plan},composition=await selectComposition({serveUrl,id:'DiStevenGraph',inputProps,browserExecutable});
     let cursor=0;const records=[];for(const scene of plan.scenes){const frame=cursor+Math.floor(scene.durationFrames/2),file=`${scene.id}.png`;await renderStill({serveUrl,composition,inputProps,output:path.join(out,file),frame,imageFormat:'png',browserExecutable});records.push({sceneId:scene.id,frame,file});cursor+=scene.durationFrames;}await atomicJson(path.join(out,'frames.json'),{planSha256:preparation.editPlanSha256,records,approval:'pending'});console.log(JSON.stringify({status:'visual_frames_for_review',out,records},null,2));
    }finally{await fs.rm(work,{recursive:true,force:true});}
   }else{
    const timeoutMs=Math.min(6*60*60*1000,Math.max(15*60*1000,request.durationSeconds*6000));
    const orchestrator=await new Orchestrator({root,context,timeoutMs,planner:{name:'agent',plan:async()=>structuredClone(plan)}}).init();
    try{const job=await orchestrator.submit(request,{workflowFile:required('--workflow'),idempotencyKey:arg('--key')});const result=await orchestrator.wait(job.id);console.log(JSON.stringify({job:result,directory:orchestrator.directory(job.id)},null,2));if(result.state!=='completed')process.exitCode=1;}finally{await orchestrator.close();}
   }
  }else if(command==='deliver'){
   const orchestrator=await new Orchestrator({root,context}).init();
   try{const job=orchestrator.get(required('--job'));if(job.state!=='completed')throw Error('Job must be technically completed before delivery');const directory=orchestrator.directory(job.id),video=path.join(directory,'candidate.mp4'),hash=digest(await fs.readFile(video)),review=await read(path.join(directory,'review.json')),technical=await read(path.join(directory,'technical-report.json'));
    if(technical.sha256!==hash)throw Error('Technical report no longer matches video');const quality=checkReview(review,hash),workflowFile=required('--workflow'),workflow=checkWorkflow(await read(workflowFile),'deliver',path.dirname(path.resolve(workflowFile)),video);if(!quality.ready||!workflow.ready)throw Error('Final delivery review pending: '+[...quality.errors,...workflow.errors].join('; '));job.reviewStatus='reviewed';orchestrator.jobs.set(job.id,job);await orchestrator.save(job);const delivery={status:'reviewed',video,sha256:hash,captions:path.join(directory,'captions.srt'),plan:path.join(directory,'edit-plan.json'),technical:path.join(directory,'technical-report.json'),review:path.join(directory,'review.json')};await atomicJson(path.join(project,'delivery.json'),delivery);console.log(JSON.stringify(delivery,null,2));
   }finally{await orchestrator.close();}
  }else throw Error('Use video import --preset file --out project; then context, media, validate, stills, render or deliver --project project');
 }
}catch(error){console.error(error.message);process.exitCode=1;}
