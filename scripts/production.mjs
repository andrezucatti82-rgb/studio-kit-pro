import fs from 'node:fs/promises';
import path from 'node:path';
import {Orchestrator} from '../server/orchestrator.mjs';
import {engineeringRun} from '../server/engineering.mjs';
import {createPlanner} from '../server/planner.mjs';
const args=process.argv.slice(2),value=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const root=path.resolve(value('--root','projects/production-local'));
try{
 if(args.includes('--engineering-poc')){
  const result=await engineeringRun(root,{onJob:job=>console.log(`Job ${job.id} queued; logs: ${path.join(root,'jobs',job.id,'job.json')}`),concurrency:Number(process.env.RENDER_CONCURRENCY??2)});
  console.log(JSON.stringify(result,null,2));
 }else{
  const planner=createPlanner({provider:value('--provider','deterministic'),allowPaid:args.includes('--allow-paid-planning')});
  const orchestrator=await new Orchestrator({root,planner}).init();
  try{
   if(args.includes('--import'))console.log(JSON.stringify(await orchestrator.store.import(await fs.readFile(value('--import')),{name:path.basename(value('--import')),rights:value('--rights')}),null,2));
   else if(args.includes('--prepare')){const prepared=await orchestrator.prepare(JSON.parse(await fs.readFile(value('--prepare'),'utf8')));if(!args.includes('--out'))throw Error('Use --out projects/name/prepared');const out=path.resolve(value('--out'));await fs.mkdir(out,{recursive:false});for(const [name,data] of Object.entries({'request.json':prepared.request,'edit-plan.json':prepared.plan,'preparation.json':prepared}))await fs.writeFile(path.join(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});console.log(`Plan prepared for visual preproduction: ${out}. No approval or video was generated.`);}
   else if(args.includes('--request')){const job=await orchestrator.submit(JSON.parse(await fs.readFile(value('--request'),'utf8')),{workflowFile:value('--workflow'),idempotencyKey:value('--key')});console.log(JSON.stringify(await orchestrator.wait(job.id),null,2));if(orchestrator.get(job.id).state!=='completed')process.exitCode=1;}
   else throw Error('Use --engineering-poc, --import media --rights attribution, --prepare request.json --out projects/name, or --request request.json --workflow workflow.json');
  }finally{await orchestrator.close();}
 }
}catch(error){console.error(error.message);process.exitCode=1;}
