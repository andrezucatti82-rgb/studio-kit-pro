import test from 'node:test';
import assert from 'node:assert/strict';
import {clipBasis,clipMode,clipScope,omniModel} from '../zapvideo/clips.mjs';
import {downloadOmni,omniFileId,omniFileState,submitOmni} from '../zapvideo/omni.mjs';

const config={ENVIRONMENT:'staging',GEMINI_CLIP_MODEL:omniModel,GEMINI_CLIP_VERIFIED:'1',GEMINI_API_KEY:'fictitious',
  GEMINI_TEST_DAILY_BUDGET_MICROS:'5000000',
  RENDER_ENABLED:'1',RENDERER:{},GEMINI_CLIP_RESERVE_MICROS_PER_SECOND:'80000'};
const selection={sceneId:'cena',shotId:'plano',frameId:'pauta',aspect:'9:16'};
const plan={intent:{mode:'create',subject:'Tema do vídeo'},
  scenes:[{id:'cena',title:'Abertura',narration:'',shots:[{id:'plano',direction:'Veja a introdução.',seconds:5,generateSupport:true,layers:[]}]},
    {id:'outra',title:'Outra cena',shots:[]}],
  materials:[{id:'pauta',kind:'reference',name:'Quadro.png',bytes:400,permission:'process'}]};

test('clip mode fails closed at zero budget and mocks are confined to loopback',()=>{
  assert.equal(clipMode({...config,GEMINI_CLIP_DAILY_BUDGET_MICROS:'0'}),'unavailable');
  assert.equal(clipMode({...config,GEMINI_CLIP_DAILY_BUDGET_MICROS:'400000'}),'gemini');
  assert.equal(clipMode({...config,GEMINI_CLIP_DAILY_BUDGET_MICROS:'1e6'}),'unavailable');
  assert.equal(clipMode({...config,GEMINI_CLIP_DAILY_BUDGET_MICROS:'400000',GEMINI_CLIP_VERIFIED:'0'}),'unavailable');
  assert.equal(clipMode({ENVIRONMENT:'local',GEMINI_MOCK:'1',RENDER_LOCAL_URL:'http://127.0.0.1:4000'}),'mock');
  assert.equal(clipMode({ENVIRONMENT:'staging',GEMINI_MOCK:'1',RENDER_LOCAL_URL:'http://127.0.0.1:4000'}),'unavailable');
});

test('approval basis binds clip instructions, aspect, image bytes and mode, allowing unrelated edits',async()=>{
  const sha='a'.repeat(64);
  const scope=clipScope(plan,selection);
  const basis=await clipBasis(scope,'mock',omniModel,sha);
  const another=structuredClone(plan);
  another.scenes[1].title='Revisei apenas a outra cena';
  assert.equal(await clipBasis(clipScope(another,selection),'mock',omniModel,sha),basis);
  another.scenes[0].shots[0].direction='Nova direção visual';
  assert.notEqual(await clipBasis(clipScope(another,selection),'mock',omniModel,sha),basis);
  assert.notEqual(await clipBasis(scope,'mock',omniModel,'b'.repeat(64)),basis);
  assert.notEqual(await clipBasis(scope,'gemini',omniModel,sha),basis);
  assert.throws(()=>clipScope(plan,{...selection,aspect:'1:1'}),/3 a 15/);
});

test('Omni requests preserve format and use an allowlisted identifier with no duplicate POST on timeout',async()=>{
  const scope=clipScope(plan,selection);
  const input={model:omniModel,scope,frame:{data:'AA==',mime:'image/png'}};
  const uri='https://generativelanguage.googleapis.com/v1beta/files/clip-123:download?alt=media';
  const expected={type:'video',duration:'5s',aspect_ratio:'9:16',resolution:'720p',delivery:'inline'};
  assert.equal(omniFileId(uri),'clip-123');
  for (const invalid of ['https://example.com/v1beta/files/clip-123','files/chave%2fsegredo','//example.com/files/x','https://user:pass@generativelanguage.googleapis.com/v1beta/files/test']) {
    assert.throws(()=>omniFileId(invalid));
  }
  const result=await submitOmni(input,'fictitious',async(url,options)=>{
    assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/interactions');
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body).response_format,expected);
    assert.equal(JSON.parse(options.body).store,false);
    assert.equal(JSON.parse(options.body).input[0].mime_type,'image/png');
    return Response.json({id:'v1_test',steps:[{type:'model_output',content:[{type:'video',uri}]}]});
  });
  assert.deepEqual(result,{id:'v1_test',fileId:'clip-123'});
  const stateless=await submitOmni(input,'fictitious',async()=>Response.json({
    steps:[{type:'model_output',content:[{type:'video',uri}]}],
  }));
  assert.deepEqual(stateless,{id:null,fileId:'clip-123'});
  const fixtureMp4=Uint8Array.of(0,0,0,12,102,116,121,112,109,112,52,50);
  const inline=await submitOmni(input,'fictitious',async()=>Response.json({
    steps:[{type:'model_output',content:[{type:'video',mime_type:'video/mp4',data:Buffer.from(fixtureMp4).toString('base64')}]}],
  }));
  assert.deepEqual(inline.bytes,fixtureMp4);
  assert.match(inline.sha256,/^[a-f0-9]{64}$/);
  const rejected=await submitOmni(input,'fictitious',async()=>Response.json({error:{
    message:'This raw message must never be exposed.',
    details:[{fieldViolations:[{field:'private.field'},{field:'response_format.duration'}]}],
  }},{status:400}));
  assert.deepEqual(rejected,{rejected:true,status:400,field:'response_format.duration'});
  assert.deepEqual(await submitOmni(input,'fictitious',async()=>new Response('non-JSON',{status:429})),
    {rejected:true,status:429});
  assert.equal(await omniFileState(result.fileId,'fictitious',async()=>Response.json({state:'ACTIVE'})),'ACTIVE');
  let calls=0;
  await assert.rejects(submitOmni(input,'fictitious',async()=>{
    calls++; return new Response(null,{status:408});
  }),/sem confirmação/);
  assert.equal(calls,1);
});

test('Omni download caps bytes, enforces MP4 signature and strips provider key from redirected storage requests',async()=>{
  const bytes=new Uint8Array([0,0,0,12,102,116,121,112,109,112,52,50]);
  const result=await downloadOmni('test-file','fictitious',async(url,init)=>{
    if (String(url).startsWith('https://generativelanguage.googleapis.com')) {
      assert.equal(init.headers['x-goog-api-key'],'fictitious');
      return Response.redirect('https://storage.googleapis.com/fixture-download',302);
    }
    assert.equal(init.headers,undefined);
    assert.equal(init.redirect,'manual');
    return new Response(bytes,{headers:{'Content-Type':'video/mp4','Content-Length':String(bytes.length)}});
  });
  assert.deepEqual(result.bytes,bytes);
  await assert.rejects(downloadOmni('test-file','fictitious',async()=>Response.redirect('https://example.com/clip',302)),/inválido/);
  await assert.rejects(downloadOmni('test-file','fictitious',async()=>new Response(bytes,{
    headers:{'Content-Type':'video/mp4','Content-Length':String(24*1024**2+1)},
  })),/indisponível/);
  await assert.rejects(downloadOmni('test-file','fictitious',async()=>new Response(new Uint8Array(12))),/não é um MP4/);
});
