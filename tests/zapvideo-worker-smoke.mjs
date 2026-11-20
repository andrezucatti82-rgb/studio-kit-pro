// Run against Wrangler --env local with the loopback FFmpeg server and synthetic input.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {encryptHandoff} from '../style-atlas/dist/zapvideo-transfer.mjs';
import {retrieveHandoff} from '../scripts/retrieve-disteven-handoff.mjs';

const base = 'http://127.0.0.1:8792';
const dir = 'projects/zapvideo-prova';
const secretPath = '.cache/zapvideo/fixture-access.json';
const [stranger, owner] = JSON.parse(await fs.readFile(secretPath,'utf8'));
const root = '/api/zapvideo';
const original = await fs.readFile(path.join(dir,'câmera sintética.mp4'));
const subtitle = await fs.readFile(path.join(dir,'legendas.srt'));
// A valid MP4 with a padded free atom makes the test exercise more than one part.
const free = Buffer.alloc(8 * 1024 ** 2 + 4096);
free.writeUInt32BE(free.length);free.write('free',4);
const joined = Buffer.concat([original,free]);
const source = new File([joined],'câmera sintética.mp4',{type:'video/mp4'});
const captions = new File([subtitle],'legendas.srt');
const id = randomUUID();
const project = {
  format:'zapvideo-project',version:1,id,revision:1,intent:{mode:'edit',subject:''},scenes:[],
  materials:[{id:'source',kind:'source',name:source.name,bytes:source.size,permission:'process'},
    {id:'srt',kind:'subtitle',name:captions.name,bytes:captions.size,permission:'process'}],
  actions:{captions:'mp4+srt',cuts:[{start:0.1,end:2,x:0,y:0.5},{start:2,end:4,x:0.5,y:0.5},{start:4,end:5.9,x:1,y:0.5}],
    treatment:{brightness:0.02,contrast:1.03,saturation:1.1,balance:true,denoise:true}},
};
const prefix='/projects/'+id;
const request = (route,method='GET',body,user=owner,headers={}) => fetch(base+root+route,{
  method,headers:{...(user?{'ZapVideo-Token':user.token}:{}),...headers},body});
async function check(response,expected) {
  assert.equal(response.status,expected,await response.clone().text());
  return response.json();
}
const data = (route,method,body,user) => request(route,method,JSON.stringify(body),user,{'Content-Type':'application/json'});
await check(await request(prefix,'GET',undefined,null),401);
await check(await data(prefix,'PUT',project),200);
await check(await data(prefix,'PUT',project),200);
await check(await request(prefix,'GET',undefined,stranger),404);
await check(await data(prefix,'PUT',{...project,intent:{mode:'edit',subject:'conflito'}}),409);

const ids={};
for (const [materialId,blob] of [['source',source],['srt',captions]]) {
  const sha256=createHash('sha256').update(Buffer.from(await blob.arrayBuffer())).digest('hex');
  const info={materialId,bytes:blob.size,sha256};
  const row=await check(await data(prefix+'/uploads','POST',info),201);
  ids[materialId]=row.id;
  const route=prefix+'/uploads/'+row.id;
  await check(await request(route,'GET',undefined,stranger),404);
  await check(await request(route+'/complete','POST'),409);
  const put=(n,body)=>request(route+'/parts/'+n,'PUT',body,owner,{'Content-Type':'application/octet-stream'});
  await check(await put(1,blob.slice(0,1)),400);
  await check(await put(1,blob.slice(0,row.partBytes)),200);
  const resumed=await check(await data(prefix+'/uploads','POST',info),200);
  assert.deepEqual(resumed.parts,[1]);
  if (blob.size>row.partBytes) await check(await put(2,blob.slice(row.partBytes)),200);
  const finished=await check(await request(route+'/complete','POST'),200);
  assert.equal(finished.state,'ready');
  await check(await request(route+'/complete','POST'),200);
}
const jobRequest={kind:'edit',key:'same-click',revision:1,inputs:ids};
const created=await check(await data(prefix+'/jobs','POST',jobRequest),202);
const repeated=await check(await data(prefix+'/jobs','POST',jobRequest),202);
assert.equal(repeated.id,created.id);
const jobRoute=prefix+'/jobs/'+created.id;
await check(await request(jobRoute,'GET',undefined,stranger),404);
let status=created;
for (let i=0;i<45 && ['queued','processing'].includes(status.state);i++) {
  await new Promise(resolve=>setTimeout(resolve,1000));
  status=await check(await request(jobRoute),200);
}
assert.equal(status.state,'verified',JSON.stringify(status));
assert.deepEqual(status.result.outputs.map(output=>output.id),['video','corte-1','corte-2','corte-3','legendas']);
const destination=path.join(dir,id);
await fs.mkdir(destination);
let fileAccess;
for (const file of status.result.outputs) {
  const granted=await data(jobRoute+'/grant','POST',{file:file.id});
  const cookie=granted.headers.get('Set-Cookie').split(';')[0];
  const grant=await check(granted,200);
  const url=base+grant.url;
  assert.equal((await fetch(url)).status,404);
  const full=await fetch(url,{headers:{Cookie:cookie}});
  assert.equal(full.status,200);
  const bytes=Buffer.from(await full.arrayBuffer());
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  const partial=await fetch(url,{headers:{Cookie:cookie,Range:'bytes=0-9'}});
  assert.equal(partial.status,206);
  assert.deepEqual(Buffer.from(await partial.arrayBuffer()),bytes.subarray(0,10));
  const invalid=await fetch(url,{headers:{Cookie:cookie,Range:'bytes=9999999999-'}});
  assert.equal(invalid.status,416);
  fileAccess={url,cookie};
  await fs.writeFile(path.join(destination,file.name),bytes);
}
const encrypted=await encryptHandoff(project,[{id:'source',file:source},{id:'srt',file:captions}],32*1024**2);
const packet=await check(await request('/handoff','PUT',encrypted.body,owner,{'Content-Type':'application/octet-stream'}),201);
const received=await retrieveHandoff('https://zapvideo.com.br/api/zapvideo/handoff?id='+packet.id+'#'+encrypted.key,
  path.join(destination,'recebido'),url=>fetch(base+url.pathname+url.search));
assert.equal(received.materials,2);
const manifest=JSON.parse(await fs.readFile(path.join(received.directory,'arquivos-recebidos.json'),'utf8'));
assert.deepEqual(await fs.readFile(path.join(received.directory,manifest.find(item=>item.id==='source').filename)),joined);
await check(await request('/handoff?id='+'0'.repeat(48),'GET',undefined,null),404);

const briefId=randomUUID(), briefRoute='/projects/'+briefId;
await check(await data(briefRoute,'PUT',{...project,id:briefId,intent:{mode:'create',subject:'Nova loja'},actions:{},materials:[]}),200);
const brief=await check(await data(briefRoute+'/jobs','POST',{kind:'brief',revision:1,key:'request'}),202);
let proposed=brief;
for (let i=0;i<20 && ['queued','processing'].includes(proposed.state);i++) {
  await new Promise(resolve=>setTimeout(resolve,500));
  proposed=await check(await request(briefRoute+'/jobs/'+brief.id),200);
}
assert.equal(proposed.result?.mode,'mock',JSON.stringify(proposed));
assert.equal(proposed.reservedMicros,0);

const pdf=Buffer.from('%PDF-1.4\n% ZapVideo signed-format fixture\n%%EOF\n');
const pdfSha=createHash('sha256').update(pdf).digest('hex');
const analysisId=randomUUID(),analysisRoute='/projects/'+analysisId;
const analysisProject={...project,id:analysisId,intent:{mode:'create',subject:'Analisar as referências'},actions:{},
  materials:[{id:'pdf',kind:'reference',name:'Referência.pdf',bytes:pdf.length,permission:'process'}]};
await check(await data(analysisRoute,'PUT',analysisProject),200);
const pdfUpload=await check(await data(analysisRoute+'/uploads','POST',{materialId:'pdf',sha256:pdfSha,bytes:pdf.length}),201);
const pdfRoute=analysisRoute+'/uploads/'+pdfUpload.id;
await check(await request(pdfRoute+'/parts/1','PUT',pdf,owner,{'Content-Type':'application/octet-stream'}),200);
await check(await request(pdfRoute+'/complete','POST'),200);
await check(await data(analysisRoute+'/jobs','POST',{kind:'analysis',revision:1,key:'local-host',url:'https://localhost/private'}),400);
await check(await data(analysisRoute+'/jobs','POST',{kind:'analysis',revision:1,key:'wrong-owner',inputs:{pdf:ids.source}}),400);
let analysis=await check(await data(analysisRoute+'/jobs','POST',{kind:'analysis',revision:1,key:'materials',
  inputs:{pdf:pdfUpload.id},url:'https://zapvideo.com.br/'}),202);
for (let i=0;i<20 && ['queued','processing'].includes(analysis.state);i++) {
  await new Promise(resolve=>setTimeout(resolve,500));
  analysis=await check(await request(analysisRoute+'/jobs/'+analysis.id),200);
}
assert.equal(analysis.result?.mode,'mock',JSON.stringify(analysis));
assert.deepEqual(analysis.result.analysis.map(({id,label})=>[id,label]),[['pdf','Referência.pdf'],['public-url','https://zapvideo.com.br/']]);
const cancelJob=await check(await data(prefix+'/jobs','POST',{...jobRequest,key:'cancel'}),202);
const cancelled=await check(await request(prefix+'/jobs/'+cancelJob.id,'DELETE'),200);
assert.equal(cancelled.state,'cancelled');
await check(await data(prefix+'/jobs/'+cancelJob.id+'/grant','POST',{file:'video'}),409);
const packetHash=createHash('sha256').update(packet.id).digest('hex');
const grantHash=createHash('sha256').update(fileAccess.cookie.split('=')[1]).digest('hex');
execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','zapvideo-local','--env','local','--local',
  '--command',`UPDATE handoffs SET expires_at=1 WHERE hash='${packetHash}'; UPDATE grants SET expires_at=1 WHERE hash='${grantHash}';`],{stdio:'pipe'});
await check(await request('/handoff?id='+packet.id,'GET',undefined,null),404);
assert.equal((await fetch(fileAccess.url,{headers:{Cookie:fileAccess.cookie}})).status,404);
console.log(JSON.stringify({state:'passed',project:id,output:destination,files:status.result.outputs,multipart:true,brief:'mock',analysis:'mock'}));
