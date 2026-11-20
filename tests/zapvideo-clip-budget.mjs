// Test the reservation with SQLite, a fake Workflows binding, and no provider transport.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {clipRoute,omniModel} from '../zapvideo/clips.mjs';
import {models,quoteMedia} from '../zapvideo/media-assets.mjs';
import {startJob} from '../zapvideo/jobs.mjs';
import {hex,now} from '../zapvideo/http.mjs';

const db=new DatabaseSync(':memory:');
for (const name of ['0001_pilot.sql','0002_output_quota.sql','0003_clip_approvals.sql','0004_asset_quotes.sql']) {
  db.exec(readFileSync(new URL('../migrations/zapvideo/'+name,import.meta.url),'utf8'));
}
const dbBinding={prepare(query){return {bind(...args){
  const statement=db.prepare(query);
  return {first:async()=>statement.get(...args),run:async()=>({meta:{changes:statement.run(...args).changes}})};
}};}};
const selected=readFileSync('projects/zapvideo-prova/quadro para aprovação.png');
const sha=hex(await crypto.subtle.digest('SHA-256',selected));
const starts=[];
const env={ENVIRONMENT:'staging',GEMINI_CLIP_VERIFIED:'1',GEMINI_CLIP_MODEL:omniModel,
  GEMINI_API_KEY:'fictitious',RENDER_ENABLED:'1',RENDERER:{},GEMINI_CLIP_RESERVE_MICROS_PER_SECOND:'80000',
  GEMINI_TEST_DAILY_BUDGET_MICROS:'400000',GEMINI_ASSET_DAILY_BUDGET_MICROS:'100000',
  GEMINI_FRAME_VERIFIED:'1',GEMINI_FRAME_MODEL:models.frame,GEMINI_FRAME_RESERVE_MICROS:'50000',
  GEMINI_CLIP_DAILY_BUDGET_MICROS:'400000',DB:dbBinding,
  PRIVATE:{get:async()=>new Blob([selected])},JOBS:{create:async({id})=>starts.push(id)}};
const original=globalThis.fetch;
globalThis.fetch=()=>{throw new Error('Network forbidden in reservation test');};
async function seed(index) {
  const owner='fixture-'+index, id='project-'+index, upload='upload-'+index;
  const plan={format:'zapvideo-project',version:1,id,revision:1,intent:{mode:'create',subject:'Teste de reserva'},
    materials:[{id:'frame',name:'Imagem.png',bytes:selected.length,kind:'reference',permission:'process'}],actions:{},
    scenes:[{id:'scene',title:'Abertura',narration:'',shots:[{id:'shot',direction:'Um motivo sintético.',
      generateSupport:true,seconds:5,layers:[]}]}]};
  db.prepare('INSERT INTO people(id,token_hash,expires_at) VALUES (?,?,?)').run(owner,'hash-'+index,now()+3600);
  db.prepare('INSERT INTO projects(id,owner,revision,created_at) VALUES (?,?,1,?)').run(id,owner,now());
  db.prepare('INSERT INTO revisions(project_id,revision,body,created_at) VALUES (?,1,?,?)').run(id,JSON.stringify(plan),now());
  db.prepare("INSERT INTO uploads(id,project_id,material_id,sha256,kind,bytes,key,state,expires_at) VALUES (?,?,'frame',?,'reference',?,?,'ready',?)")
    .run(upload,id,sha,selected.length,'key-'+index,now()+3600);
  return {owner,plan,upload};
}
const request=body=>new Request('http://stage/fixture',{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function quote({owner,plan,upload}) {
  const approved=await clipRoute(request({revision:1,sceneId:'scene',shotId:'shot',frameId:'frame',aspect:'9:16',
    uploadId:upload,seen:true,message:'Aceito para teste.',presentedSha256:sha}),env,plan,owner,'approve');
  const {id}=await approved.json();
  return (await clipRoute(request({revision:1,approvalId:id}),env,plan,owner,'quote')).json();
}
try{
  const first=await seed(1), other=await seed(2);
  const fee1=await quote(first), fee2=await quote(other);
  assert.equal(fee1.reservedMicros,400000);
  const dispatch=(target,fee,config=env)=>startJob(request({revision:1,kind:'clip',quoteId:fee.id,confirmed:true}),
    config,target.plan,target.owner);
  await assert.rejects(dispatch(first,fee1,{...env,GEMINI_CLIP_DAILY_BUDGET_MICROS:'0'}),error=>error.status===503);
  const same=await (await dispatch(first,fee1)).json();
  assert.equal((await (await dispatch(first,fee1)).json()).id,same.id);
  // The mock binding accepts the create request without running a provider.
  db.prepare("UPDATE jobs SET state='uncertain',provider_claim_at=? WHERE id=?").run(now(),same.id);
  const repeat=await quote(first);
  await assert.rejects(dispatch(first,repeat),error=>error.status===409);
  await assert.rejects(dispatch(other,fee2),error=>error.status===429);
  const frame=await (await quoteMedia(request({revision:1,kind:'frame',sceneId:'scene',shotId:'shot',aspect:'9:16'}),
    env,other.plan,other.owner)).json();
  await assert.rejects(startJob(request({revision:1,kind:'asset',quoteId:frame.id,confirmed:true}),
    env,other.plan,other.owner),error=>error.status===429);
  const paid={...env,GEMINI_BRIEF_PAID_VERIFIED:'1',GEMINI_BRIEF_MODEL:'gemini-test',GEMINI_BRIEF_RESERVE_MICROS:'20000'};
  const briefing=(config,agreedMicros)=>startJob(request({kind:'brief',revision:1,key:'brief-fixture',agreedMicros}),
    config,other.plan,other.owner);
  await assert.rejects(briefing(paid),error=>error.status===400);
  await assert.rejects(briefing(paid,20000),error=>error.status===429);
  const expanded={...paid,GEMINI_TEST_DAILY_BUDGET_MICROS:'420000'};
  const brief=await (await briefing(expanded,20000)).json();
  assert.equal(brief.reservedMicros,20000);
  assert.equal((await (await briefing(expanded,20000)).json()).id,brief.id);
  assert.equal(new Set(starts).size,2);
  assert.equal(db.prepare('SELECT sum(reserved_micros) sum FROM jobs').get().sum,420000);
  console.log('Reserva simulada: zero bloqueia, orçamento é cumulativo, chamada incerta bloqueia nova tentativa.');
} finally {
  globalThis.fetch=original;
  db.close();
}
