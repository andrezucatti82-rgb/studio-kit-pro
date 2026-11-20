import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';

const base='http://127.0.0.1:8792';
const [stranger,,owner]=JSON.parse(await readFile('.cache/zapvideo/fixture-access.json','utf8'));
const project=randomUUID(),path='/api/zapvideo/projects/'+project;
const record={format:'zapvideo-project',version:1,id:project,revision:1,intent:{mode:'create',subject:'Produção sintética'},
  materials:[],actions:{},scenes:[{id:'cena',title:'Abertura',narration:'Uma fala aprovada no teste.',
    shots:[{id:'plano',direction:'Mostrar uma tela.',seconds:5,generateSupport:false,layers:[]}]}]};
const request=(url,method='GET',body,user=owner)=>fetch(base+url,{method,headers:{
  'ZapVideo-Token':user.token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
async function check(response,status) {
  assert.equal(response.status,status,await response.clone().text());
  return response.json();
}
const post=(url,body)=>request(url,'POST',body);
await check(await request(path,'PUT',record),200);
const outputs=[];
for (const [kind,expected] of Object.entries({frame:['quadro','image/jpeg'],speech:['narracao','audio/wav'],music:['trilha','audio/mpeg']})) {
  const choices={revision:1,kind,sceneId:'cena',shotId:'plano',aspect:'9:16',voice:'Kore',prompt:'Trilha de piano tranquila.'};
  await check(await request(path+'/assets/quote','POST',choices,stranger),404);
  const quote=await check(await post(path+'/assets/quote',choices),201);
  assert.equal(quote.mode,'mock');
  assert.equal(quote.reservedMicros,0);
  await check(await post(path+'/jobs',{revision:1,kind:'asset',quoteId:quote.id,confirmed:false}),400);
  const start=await check(await post(path+'/jobs',{revision:1,kind:'asset',quoteId:quote.id,confirmed:true}),202);
  const again=await check(await post(path+'/jobs',{revision:1,kind:'asset',quoteId:quote.id,confirmed:true}),202);
  assert.equal(again.id,start.id);
  let state=start;
  const route=path+'/jobs/'+start.id;
  for(let poll=0;poll<45 && ['queued','processing'].includes(state.state);poll++) {
    await new Promise(resolve=>setTimeout(resolve,1000));
    state=await check(await request(route),200);
  }
  assert.equal(state.state,'verified',JSON.stringify(state));
  assert.equal(state.result.mediaKind,kind);
  assert.equal(state.result.status,'review_pending');
  const [out]=state.result.outputs;
  assert.deepEqual([out.id,out.type],expected);
  if (kind==='frame') assert.deepEqual([out.width,out.height],[720,1280]);
  if (kind==='speech') assert.deepEqual([out.sampleRate,out.channels],[24000,1]);
  if (kind==='music') assert.deepEqual([out.sampleRate,out.channels],[44100,2]);
  const granted=await post(route+'/grant',{file:out.id});
  const cookie=granted.headers.get('Set-Cookie').split(';')[0];
  const {url}=await check(granted,200);
  assert.equal((await fetch(base+url)).status,404);
  const file=await fetch(base+url,{headers:{Cookie:cookie}});
  assert.equal(file.status,200);
  const bytes=Buffer.from(await file.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),out.sha256);
  const destination='projects/zapvideo-prova/'+project+'-'+out.name;
  await writeFile(destination,bytes);
  outputs.push({kind,destination,sha256:out.sha256});
}
console.log(JSON.stringify({state:'passed',outputs}));
