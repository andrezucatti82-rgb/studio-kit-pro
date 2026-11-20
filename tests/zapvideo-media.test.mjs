import test from 'node:test';
import assert from 'node:assert/strict';
import {generateMedia,mediaMode,mediaRequest,mediaScope,models} from '../zapvideo/media-assets.mjs';

const plan={intent:{mode:'create'},scenes:[{id:'cena',title:'Cena inicial',narration:'Olá, André.',
  shots:[{id:'plano',direction:'Mostre a tela da loja.'}]}]};
const options={sceneId:'cena',shotId:'plano',aspect:'9:16',voice:'Kore',prompt:'Piano leve com andamento calmo.'};
const build=kind=>({scope:mediaScope(plan,{kind,...options}),model:models[kind]});

test('imagem, narração e trilha geram pedidos de formato e escopo distintos',()=>{
  assert.deepEqual(mediaRequest(build('frame')).response_format,{
    type:'image',mime_type:'image/jpeg',aspect_ratio:'9:16',image_size:'1K',
  });
  assert.deepEqual(mediaRequest(build('speech')).generation_config.speech_config,[{voice:'Kore'}]);
  assert.equal(mediaRequest(build('speech')).input[0].content[0].text,'Olá, André.');
  assert.match(mediaRequest(build('music')).input,/instrumental de fundo/);
  assert.throws(()=>mediaScope(plan,{kind:'speech',...options,voice:'voice_rogue'}),/voz do catálogo/);
  assert.throws(()=>mediaScope(plan,{kind:'frame',...options,shotId:'wrong'}),/Escolha o plano/);
});

test('orçamento zero desativa chamada real de todos os geradores',()=>{
  for (const [kind,model] of Object.entries(models)) {
    const profile=kind.toUpperCase();
    const cfg={ENVIRONMENT:'staging',RENDER_ENABLED:'1',RENDERER:{},GEMINI_API_KEY:'fictitious',GEMINI_TEST_DAILY_BUDGET_MICROS:'5000000',
      ['GEMINI_'+profile+'_VERIFIED']:'1',['GEMINI_'+profile+'_MODEL']:model,
      ['GEMINI_'+profile+'_RESERVE_MICROS']:'50000'};
    assert.equal(mediaMode({...cfg,GEMINI_ASSET_DAILY_BUDGET_MICROS:'0'},kind),'unavailable');
    assert.equal(mediaMode({...cfg,GEMINI_ASSET_DAILY_BUDGET_MICROS:'49999'},kind),'unavailable');
    assert.equal(mediaMode({...cfg,GEMINI_ASSET_DAILY_BUDGET_MICROS:'50000'},kind),'gemini');
  }
});

test('respostas simuladas preservam comprovante, limitam bytes e distinguem falha confirmada',async()=>{
  const mock=(type,mime,bytes)=>async()=>Response.json({id:'v1-fixture',steps:[{type:'model_output',content:[
    {type,mime_type:mime,data:Buffer.from(bytes).toString('base64')}
  ]}]});
  const result=await generateMedia(build('frame'),'fictitious',mock('image','image/jpeg',[255,216,255,224,0,0]));
  assert.equal(result.id,'v1-fixture');
  assert.equal(result.sha256.length,64);
  assert.match((await generateMedia(build('speech'),'fictitious',mock('audio','audio/wav',[0,0,0,0]))).error,/incompatível/);
  assert.deepEqual(await generateMedia(build('music'),'fictitious',async()=>new Response(null,{status:403})),{rejected:true});
  await assert.rejects(generateMedia(build('music'),'fictitious',async()=>new Response(null,{status:503})),/sem confirmação/);
});
