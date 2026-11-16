import fs from 'node:fs/promises';
import path from 'node:path';
import {Orchestrator} from './orchestrator.mjs';
import {STYLE_ID,requestSchema} from './schema.mjs';
import {digest} from './assets.mjs';
import {run} from './process.mjs';
import {repoRoot} from './skills.mjs';
import {createPlanner} from './planner.mjs';

// Narrow engineering harness: no arbitrary brief, uploaded assets, AI or approval fabrication.
// The user expressly requested a 30-second engineering POC with authorized test media.
export async function engineeringRun(root,{onJob=()=>{},...options}={}){
 const fixture=path.join(root,'fixture');await fs.mkdir(root,{recursive:true});
 await run('python3',[path.join(repoRoot,'scripts/production-fixture.py'),fixture]);
 let allowed;
 const orchestrator=new Orchestrator({...options,root,planner:createPlanner(),authorize:async request=>{
  if(!allowed || digest(Buffer.from(JSON.stringify(request)))!==allowed.fingerprint)throw Error('Engineering run only accepts its exact generated fixture request');
  for(const id of request.assetIds){const asset=await orchestrator.store.verify(id);if(asset.sha256!==allowed.mediaSha256)throw Error('Engineering media changed');}
  return {mode:'engineering',scope:'original fixture only; deterministic planning; no external generation',mediaSha256:allowed.mediaSha256,authorization:'User master mission sections 3, 7 and 21 explicitly request engineering tests and an approximately 30-second POC',creativeApproval:'not_granted'};
 }});
 await orchestrator.init();
 try{
  const asset=await orchestrator.store.import(await fs.readFile(path.join(fixture,'source-original.mp4')),{name:'Original optical orbit test',rights:'Original code-authored fixture, MIT; no people, products, brands or external assets'});
  const request=requestSchema.parse({styleId:STYLE_ID,prompt:'Transformar ruído em uma ideia clara. Abrir espaço, revelar o movimento e conectar a mensagem.',assetIds:[asset.id],durationSeconds:30,format:'16:9',fps:30,captions:[{start:0,end:5.8,text:'Entre tantas mensagens, o essencial pede espaço.'},{start:6,end:13.6,text:'Abra espaço para uma ideia clara.'},{start:13.8,end:22.6,text:'O movimento revela. A composição organiza.'},{start:22.8,end:30,text:'Conecte a ideia ao próximo passo.'}]});
  allowed={fingerprint:digest(Buffer.from(JSON.stringify(request))),mediaSha256:asset.sha256};
  // Each explicit POC invocation is a fresh render, even when immutable fixture bytes are reused.
  const job=await orchestrator.submit(request);onJob(job);
  const result=await orchestrator.wait(job.id);
  if(result.state!=='completed')throw Error(`Engineering POC ${result.state}: ${result.error}`);
  return {job:result,directory:orchestrator.directory(result.id)};
 }finally{await orchestrator.close();}
}
