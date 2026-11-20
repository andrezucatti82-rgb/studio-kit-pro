// Run against Wrangler local with the synthetic-frame fixture and loopback FFmpeg renderer.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const base='http://127.0.0.1:8792/api/zapvideo';
const [stranger,,owner]=JSON.parse(await readFile('.cache/zapvideo/fixture-access.json','utf8'));
const frame=await readFile('projects/zapvideo-prova/quadro para aprovação.png');
const sha=createHash('sha256').update(frame).digest('hex');
const project=randomUUID(), target='/projects/'+project;
const record={format:'zapvideo-project',version:1,id:project,revision:1,intent:{mode:'create',subject:'Clipe sintético'},
  materials:[{id:'quad',name:'Quadro.png',kind:'reference',bytes:frame.length,permission:'process'}],
  actions:{},scenes:[{id:'cena',title:'Abertura',narration:'',shots:[{id:'plano',direction:'Mostrar o quadro de teste em movimento.',
    seconds:3,generateSupport:true,layers:[]}]},
    {id:'apoio',title:'Segunda cena',narration:'',shots:[{id:'plano-2',direction:'Mostrar uma tela.',seconds:4,generateSupport:false,layers:[]}]}]};
const call=(path,{method='GET',body,user=owner,raw=false}={})=>fetch(base+path,{method,
  headers:{'ZapVideo-Token':user.token,...(body?{'Content-Type':raw?'application/octet-stream':'application/json'}:{})},
  body:raw?body:body?JSON.stringify(body):undefined});
async function check(res,status) {
  assert.equal(res.status,status,await res.clone().text());
  return res.json();
}
const post=(path,body)=>call(path,{method:'POST',body});
const save=async()=>check(await call(target,{method:'PUT',body:record}),200);
await save();
await check(await post(target+'/clips/quote',{revision:1,approvalId:'missing'}),404);
const u=await check(await post(target+'/uploads',{materialId:'quad',bytes:frame.length,sha256:sha}),201);
await check(await call(target+'/uploads/'+u.id+'/parts/1',{method:'PUT',body:frame,raw:true}),200);
await check(await post(target+'/uploads/'+u.id+'/complete'),200);
const approval={revision:1,sceneId:'cena',shotId:'plano',frameId:'quad',aspect:'9:16',uploadId:u.id,
  presentedSha256:sha,message:'Aceite sintético para a simulação.',seen:true};
await check(await post(target+'/clips/approve',{...approval,seen:false}),400);
await check(await post(target+'/clips/approve',{...approval,presentedSha256:'0'.repeat(64)}),409);
await check(await call(target+'/clips/approve',{method:'POST',body:approval,user:stranger}),404);
const accepted=await check(await post(target+'/clips/approve',approval),201);
assert.equal(accepted.sha256,sha);
record.revision=2;
record.scenes[1].title='Outra cena revisada';
await save();
const quote=await check(await post(target+'/clips/quote',{revision:2,approvalId:accepted.id}),201);
assert.equal(quote.mode,'mock');
assert.equal(quote.reservedMicros,0);
const job={kind:'clip',revision:2,quoteId:quote.id,confirmed:true};
await check(await post(target+'/jobs',{...job,confirmed:false}),400);
const start=await check(await post(target+'/jobs',job),202);
const duplicate=await check(await post(target+'/jobs',{...job,key:'different-key'}),202);
assert.equal(duplicate.id,start.id);
let state=start;
const route=target+'/jobs/'+start.id;
for(let wait=0;wait<45 && ['queued','processing'].includes(state.state);wait++) {
  await new Promise(resolve=>setTimeout(resolve,1000));
  state=await check(await call(route),200);
}
assert.equal(state.state,'verified',JSON.stringify(state));
assert.equal(state.result.mode,'mock');
assert.equal(state.result.sceneId,'cena');
assert.equal(state.result.status,'review_pending');
const [output]=state.result.outputs;
assert.deepEqual([output.width,output.height,output.audio,output.duration],[720,1280,true,3]);
const response=await post(route+'/grant',{file:'clipe'});
const cookie=response.headers.get('Set-Cookie')?.split(';')[0];
const download=await check(response,200);
const origin=new URL(base).origin;
assert.equal((await fetch(origin+download.url)).status,404);
const preview=await fetch(origin+download.url,{headers:{Cookie:cookie}});
assert.equal(preview.status,200);
const bytes=Buffer.from(await preview.arrayBuffer());
assert.equal(createHash('sha256').update(bytes).digest('hex'),output.sha256);
const saved='projects/zapvideo-prova/clipe-simulado-'+project+'.mp4';
await writeFile(saved,bytes);
record.revision=3;
record.scenes[0].shots[0].direction='Direção alterada. Exige novo aceite.';
await save();
await check(await post(target+'/clips/quote',{revision:3,approvalId:accepted.id}),409);
await check(await post(target+'/jobs',{...job,revision:3}),409);
console.log(JSON.stringify({state:'passed',mode:'mock',sha256:output.sha256,output:saved}));
