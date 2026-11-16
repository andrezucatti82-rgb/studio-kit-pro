// Engineering harness for an original, closed fixture. Never a production approval bypass.
import fs from 'node:fs/promises';
import path from 'node:path';
import {readContext,makeGraphRequest,fingerprint} from '../server/handoff.mjs';
import {graphPlanSchema,graphRequestSchema,validateGraphPlan} from '../server/scene-graph.mjs';
import {Orchestrator,atomicJson} from '../server/orchestrator.mjs';
import {run} from '../server/process.mjs';
import {repoRoot} from '../server/skills.mjs';
const args=process.argv.slice(2),project=path.resolve(args[args.indexOf('--project')+1]??'');
if(!args.includes('--project'))throw Error('Use --project imported-engineering-fixture');
const context=await readContext(project);
if(context.topic!=='Estudo técnico de produção a partir do site'||context.selectedStyleIds.join(',')!=='tipografia-cinetica'||context.targetDurationSeconds!==30||context.format!=='16:9')throw Error('This harness accepts only its fixed, original browser QA fixture');
const root=path.join(project,'runtime'),fixture=path.join(project,'original-fixture');await run('python3',[path.join(repoRoot,'scripts/production-fixture.py'),fixture]);
let allowed,plan;
const orchestrator=await new Orchestrator({root,context,planner:{name:'agent',plan:async()=>structuredClone(plan)},authorize:async request=>{
 if(!allowed||fingerprint(request)!==allowed.requestSha256)throw Error('Only the sealed engineering request is authorized');
 for(const id of request.assetIds){const asset=await orchestrator.store.verify(id);if(asset.sha256!==allowed.mediaSha256)throw Error('Only original fixture media is allowed');}
 return {mode:'engineering',scope:'site handoff / original code-authored fixture only',creativeApproval:'not_granted',mediaSha256:allowed.mediaSha256};
}}).init();
try{
 const asset=await orchestrator.store.import(await fs.readFile(path.join(fixture,'source-original.mp4')),{name:'Original optical orbit engineering source',rights:'Original code-authored fixture, MIT. No people, clients, external media or paid generation.'});
 const titles=['O PEDIDO\nVIRA FILME.','DIREÇÃO\nEM CAMADAS.','O MOVIMENTO\nCONECTA.','UMA IDEIA.\nEM MOVIMENTO.'],durations=[180,240,270,210],roles=['opening','body','demonstration','closing'];
 const scenes=titles.map((title,i)=>({id:`scene-${i+1}`,durationFrames:durations[i],role:roles[i],background:'#101126',initialState:'Palavras e mídia em posições editoriais definidas',action:'A tipografia revela a mensagem enquanto a mídia original mantém ação interna',result:'Mensagem legível com uma pausa antes da próxima ideia',transition:{type:i===3?'wipe':'cut',durationFrames:i===3?18:0,reason:i===3?'O traço que liga a mensagem conduz a passagem ao encerramento':'Mudança de argumento no texto sincronizado'},layers:[
  {id:'accent-plane',type:'shape',shape:'rect',x:.05,y:.16,width:.025,height:.57,fill:'#bdff42',animations:[{property:'scale',keyframes:[{frame:0,value:.25},{frame:36,value:1,easing:[.22,.75,.2,1]}]}]},
  {id:'original',type:'media',assetId:asset.id,x:.57,y:.24,width:.38,height:.52,sourceStartSeconds:i*2,fit:'contain',volume:0,radius:0,animations:[{property:'reveal',keyframes:[{frame:0,value:0},{frame:30,value:1,easing:[.22,.75,.2,1]}]}]},
  {id:'title',type:'text',text:title,x:.11,y:.27,width:.43,height:.4,font:'Geist',weight:700,fontSize:70,color:'#eff2ff',align:'left',kinetic:i===3?'character':'word',staggerFrames:2,enterFrames:24,animations:[]},
  {id:'label',type:'text',text:`ESTUDO TÉCNICO / ${String(i+1).padStart(2,'0')}`,x:.1,y:.075,width:.8,height:.06,font:'Geist',weight:400,fontSize:18,color:'#bdff42',kinetic:'none',animations:[]},
  {id:'connection',type:'path',x:.1,y:.77,width:.85,height:.03,d:'M 0 500 C 250 500 550 500 1000 500',color:'#bdff42',strokeWidth:15,progress:0,animations:[{property:'pathProgress',keyframes:[{frame:18,value:0},{frame:85,value:1,easing:[.22,.75,.2,1]}]}]},
 ]}));
 const captions=[{start:0,end:5.8,text:'O pedido completo entra no processo.'},{start:6,end:13.8,text:'A direção organiza cada camada.'},{start:14,end:22.8,text:'Imagem, texto e som seguem o plano.'},{start:23,end:30,text:'Uma ideia ganha movimento.'}];
 plan=graphPlanSchema.parse({schemaVersion:2,provider:'agent',styleId:context.selectedStyleIds[0],selectedStyleIds:context.selectedStyleIds,contextSha256:context.contextSha256,objective:context.topic,output:{format:'16:9',width:1280,height:720,fps:30,durationFrames:900,codec:'h264'},fidelity:{preserveOriginals:true,inventAngles:false,avatar:false},scenes,audio:{proceduralScore:true,bpm:100,tracks:[]},captions,styleBindings:[{styleId:'tipografia-cinetica',aspect:'style_direction',scope:'film',sceneIds:scenes.map(s=>s.id),decision:'Tipografia em grande escala, revelações por palavra/caractere, pausas de leitura e traço de conexão; mídia óptica original em janela preservada. Proposta de engenharia, sem aprovação estética.',implementation:'layers',referenceIds:context.referenceManifest.styles[0].frames.map(f=>`tipografia-cinetica:frame:${f.number}`)}],limitations:['Engineering test without narration or creative approval. Static catalogue references do not certify movement or exact style fidelity.']});
 const request=graphRequestSchema.parse(await makeGraphRequest(context,orchestrator.store));validateGraphPlan(plan,[asset],request,context);allowed={requestSha256:fingerprint(request),mediaSha256:asset.sha256};
 await atomicJson(path.join(project,'agent-authored-plan.json'),plan);await atomicJson(path.join(project,'engineering-request.json'),request);
 const job=await orchestrator.submit(request);console.log(`Site handoff job: ${job.id}`);const result=await orchestrator.wait(job.id);console.log(JSON.stringify({job:result,directory:orchestrator.directory(job.id)},null,2));if(result.state!=='completed')process.exitCode=1;
}finally{await orchestrator.close();}
