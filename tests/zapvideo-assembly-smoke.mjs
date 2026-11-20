import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {verifyMediaAsset} from '../zapvideo/renderer.mjs';

const base='http://127.0.0.1:8792';
const [stranger,,owner]=JSON.parse(await readFile('.cache/zapvideo/fixture-access.json','utf8'));
const project=randomUUID(),root='projects/zapvideo-prova',out=root+'/'+project+'-assembly';
await mkdir(out);
await verifyMediaAsset({kind:'speech'},null,out+'/speech-fixture');
await verifyMediaAsset({kind:'music'},null,out+'/music-fixture');
const inputs=[
  ['image','quadro para aprovação.png','reference',await readFile(root+'/quadro para aprovação.png')],
  ['video','câmera sintética.mp4','take',await readFile(root+'/câmera sintética.mp4')],
  ['voice','voz.wav','audio',await readFile(out+'/speech-fixture/narracao-previa.wav')],
  ['music','trilha.mp3','audio',await readFile(out+'/music-fixture/trilha-previa.mp3')],
  ['captions','legendas.srt','subtitle',Buffer.from('1\n00:00:00,200 --> 00:00:02,100\nProva de montagem.\n\n2\n00:00:07,000 --> 00:00:08,200\nÚltima cena.\n')],
];
const shot=(id,materialId,kind,overlay)=>({id,seconds:3,direction:'Mostrar o material selecionado.',
  generateSupport:false,overlay,motion:kind==='image'?'push':'still',keepAudio:kind==='broll',layers:[{kind,materialId}]});
const plan={format:'zapvideo-project',version:1,id:project,revision:1,intent:{mode:'create',subject:'Montagem sintética'},
  materials:inputs.map(([id,name,kind,bytes])=>({id,name,kind,bytes:bytes.length,permission:'process'})),actions:{},
  assembly:{aspect:'9:16',musicMaterialId:'music',captionMaterialId:'captions',sampleSceneId:'abertura'},
  scenes:[
    {id:'abertura',title:'Abertura',narration:'Uma fala sintética.',narrationMaterialId:'voice',
      shots:[shot('plano-1','image','image','Abertura com animação')]},
    {id:'apoio',title:'B-roll',narration:'',shots:[shot('plano-2','video','broll','Tomada de apoio')]},
    {id:'fecho',title:'Fecho',narration:'',shots:[shot('plano-3','video','video','Encerramento')]},
  ]};
const prefix='/api/zapvideo/projects/'+project;
const call=(path,{method='GET',body,user=owner,raw=false}={})=>fetch(base+path,{method,
  headers:{'ZapVideo-Token':user.token,...(body?{'Content-Type':raw?'application/octet-stream':'application/json'}:{})},
  body:raw?body:body?JSON.stringify(body):undefined});
const post=(path,body)=>call(path,{method:'POST',body});
async function check(response,code) {
  assert.equal(response.status,code,await response.clone().text());
  return response.json();
}
await check(await call(prefix,{method:'PUT',body:plan}),200);
const uploaded={},evidence={};
for (const [id,,,data] of inputs) {
  const sha=createHash('sha256').update(data).digest('hex');
  const row=await check(await post(prefix+'/uploads',{materialId:id,bytes:data.length,sha256:sha}),201);
  const route=prefix+'/uploads/'+row.id;
  for (let start=0,part=1;start<data.length;start+=row.partBytes,part++) {
    await check(await call(route+'/parts/'+part,{method:'PUT',body:data.subarray(start,start+row.partBytes),raw:true}),200);
  }
  await check(await post(route+'/complete'),200);
  uploaded[id]=row.id;
  evidence[id]={id,uploadId:row.id,presentedSha256:sha};
}
const payload={kind:'assembly',revision:1,inputs:uploaded};
for (const [,name,,bytes] of inputs) await writeFile(out+'/'+name,bytes,{flag:'wx'});
await writeFile(out+'/projeto-video.json',JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
await check(await post(prefix+'/jobs',{...payload,phase:'full',key:'before-approval'}),409);
async function run(phase,approvalId) {
  const spec={...payload,phase,approvalId,key:'assembly-'+phase};
  const accepted=await check(await post(prefix+'/jobs',spec),202);
  const route=prefix+'/jobs/'+accepted.id;
  let state=accepted;
  for (let i=0;i<75 && ['queued','processing'].includes(state.state);i++) {
    await new Promise(resolve=>setTimeout(resolve,1000));
    state=await check(await call(route),200);
  }
  assert.equal(state.state,'verified',JSON.stringify(state));
  assert.equal(state.result.phase,phase);
  const [file]=state.result.outputs;
  assert.deepEqual([file.width,file.height,file.audio],[720,1280,true]);
  assert(Math.abs(file.duration-(phase==='sample'?6:9))<0.17);
  const grant=await post(route+'/grant',{file:file.id});
  const cookie=grant.headers.get('Set-Cookie').split(';')[0];
  const {url}=await check(grant,200);
  assert.equal((await fetch(base+url)).status,404);
  const result=await fetch(base+url,{headers:{Cookie:cookie}});
  assert.equal(result.status,200);
  const bytes=Buffer.from(await result.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  await writeFile(out+'/'+phase+'.mp4',bytes);
  return {jobId:state.id,sha256:file.sha256,basis:state.result.basis};
}
const sample=await run('sample');
const approvalRequest={revision:1,sampleJob:sample.jobId,sampleSha256:sample.sha256,
  storyboard:evidence.image,animatic:evidence.video,seen:true,message:'Aceite sintético para a prova local.'};
await check(await post(prefix+'/assembly/approve',{...approvalRequest,seen:false}),400);
await check(await call(prefix+'/assembly/approve',{method:'POST',body:approvalRequest,user:stranger}),404);
const approval=await check(await post(prefix+'/assembly/approve',approvalRequest),201);
const full=await run('full',approval.id);
assert.equal(full.basis,sample.basis);
plan.revision=2;
plan.scenes[0].shots[0].overlay='Alteração de título invalida a amostra.';
await check(await call(prefix,{method:'PUT',body:plan}),200);
await check(await post(prefix+'/jobs',{...payload,revision:2,phase:'full',key:'changed',approvalId:approval.id}),409);
console.log(JSON.stringify({state:'passed',out,sample,full}));
