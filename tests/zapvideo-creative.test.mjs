import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeCreative,proposeCreativeBoard} from '../zapvideo/gemini.mjs';
import {creativeProfile, recommend, sound} from '../style-atlas/dist/zapvideo-planning.mjs';

const source='https://alpacasfoods.com.br/products/quinoa-choco-ball-pro-200g';
const brief={
  name:'Quinoa Choco Ball Pro 200g',category:'Alimentação',description:'Cereal de quinoa com cacau.',
  goals:[
    {title:'Mostrar em uso',detail:'Mostrar o cereal sendo servido.',directions:['demo','sensory']},
    {title:'Destacar textura',detail:'Mostrar os detalhes do cereal em macro.',directions:['sensory','brand']},
    {title:'Apresentar a marca',detail:'Apresentar o produto da Alpacas Foods.',directions:['brand','life']},
  ],
};
const chosen={...brief.goals[0],directions:['sensory']};
const style={id:'food-asmr',family:'campanhas',familyName:'Campanhas e demonstrações',
  label:'Food ASMR com narração',caption:'Som de preparo e textura',tags:['ASMR','cereal'],
  frames:[{image:'/assets/exemplo.webp'}]};
const audioSport={...style,id:'ads-pet',family:'ads-pets',label:'Pet em demonstração',tags:['cachorro']};
const context={id:'produto-loja',group:'loja'};
const env={
  ENVIRONMENT:'staging',GEMINI_API_KEY:'synthetic-only',GEMINI_BRIEF_PAID_VERIFIED:'1',
  GEMINI_BRIEF_RESERVE_MICROS:'60000',GEMINI_TEST_DAILY_BUDGET_MICROS:'500000',
  GEMINI_BRIEF_MODEL:'gemini-3.8-flash',GEMINI_BOARD_MODEL:'gemini-3.1-pro-preview',
  GEMINI_PRODUCT_URL_VERIFIED:'1',
  ASSETS:{fetch:async()=>Response.json([style,audioSport])},
};
const draft={intent:{subject:brief.name,creative:{
  recipeId:'produto-loja',origin:'product',source:'link',url:source,category:brief.category,summary:brief.description,
  goal:chosen,styleId:style.id,direction:'sensory',pace:'detail',sound:'Trilha suave',narration:false,
}}};
const output=(val,steps=[])=>Response.json({steps:[...steps,{type:'model_output',content:[{type:'text',text:JSON.stringify(val)}]}]});

test('catalog suggestions match the objective and keep unrelated sectors out',()=>{
  const profile=creativeProfile(brief,context);
  const [first,...rest]=recommend([style,audioSport],profile,chosen);
  assert.equal(first.id,style.id);
  assert.deepEqual(rest,[]);
  assert(sound(profile,first,chosen).some(([name])=>name==='Narração e sons do preparo'));
});

test('Flash requires retrieval evidence and returns three grounded objectives',async()=>{
  const ok=[{type:'url_context_result',result:[{status:'success',url:source}]}];
  const result=await proposeCreative(draft,env,async(_url,init)=>{
    const request=JSON.parse(init.body);
    assert.equal(request.model,env.GEMINI_BRIEF_MODEL);
    assert.equal(request.store,false);
    assert.deepEqual(request.tools,[{type:'url_context'}]);
    assert(JSON.parse(request.input).url===source);
    return output(brief,ok);
  });
  assert.equal(result.creative.goals.length,3);
  assert.equal(result.model,env.GEMINI_BRIEF_MODEL);
  assert((await proposeCreative(draft,env,async()=>output(brief))).error);
});

test('Pro storyboard uses the selected catalog visual, pace and sound',async()=>{
  const scenes=[4,7,4].map((seconds,index)=>({title:'Cena '+(index+1),narration:'',
    shots:[{seconds,direction:'Mostrar a embalagem original do cereal com luz lateral.'}]}));
  const result=await proposeCreativeBoard(draft,env,async(_url,init)=>{
    const request=JSON.parse(init.body);
    assert.equal(request.store,false);
    assert.equal(request.model,env.GEMINI_BOARD_MODEL);
    assert(!request.tools);
    const input=JSON.parse(request.input);
    assert.equal(input.estilo,style.label);
    assert.equal(input.usarNarracao,false);
    assert.deepEqual(input.segundosPorCena,[4,7,4]);
    return output({title:'Quinoa em cena',scenes});
  });
  assert.equal(result.proposal.scenes.length,3);
  const mismatched={title:'Quinoa em cena',scenes:structuredClone(scenes)};
  mismatched.scenes[0].narration='Texto indevido.';
  assert((await proposeCreativeBoard(draft,env,async()=>output(mismatched))).error);
  const unrelated=structuredClone(draft);
  unrelated.intent.creative.styleId=audioSport.id;
  assert((await proposeCreativeBoard(unrelated,env,async()=>{assert.fail('Não deve chamar o provedor');})).error);
});
