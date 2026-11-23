import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {referenceImageInfo} from '../scripts/reference-image-info.mjs';
import '../style-atlas/dist/workflow.js';
import '../style-atlas/dist/search.js';
import '../style-atlas/dist/disteven-model.js';

const root=new URL('../style-atlas/',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const catalog=read('dist/catalog.json');
const provenance=[...read('records/sequences-720/assets.json'),...read('records/natural-ads-60/assets.json'),...read('records/segments-440/assets.json'),...read('records/presenter-realistic/manifest.json').images,...read('records/broll-apresentacoes/assets.json')];
const W=globalThis.AtlasWorkflow;

test('B-roll collection is discoverable and exports stock guidance within the chosen scope',()=>{
 const model=globalThis.DiStevenCollections;
 const search=globalThis.AtlasSearch.createIndex(catalog.styles,catalog.search);
 const styles=catalog.styles.filter(s=>model.matchesBrowse(s,'presentations','b-roll'));
 assert.equal(styles.length,30);
 assert.equal(new Set(styles.map(s=>s.broll.niche)).size,30);
 for(const treatment of ['recorte','match-cut','janela']){
  const group=styles.filter(s=>s.broll.treatment===treatment);
  assert.equal(group.length,10);
  assert.equal(group.filter(s=>s.broll.examplePresenter==='mulher').length,5);
 }
 for(const s of styles){
  assert.equal(s.family,'apresentacoes');
  const {layout,sequence,exampleCaptions}=s.executionPlan.supportMedia;
  const [width,height]=layout.frame;
  const split=Math.floor(height/3);
  assert.deepEqual(layout.media,[0,0,width,split],s.id);
  assert.deepEqual(layout.presenter,[0,split,width,height],s.id);
  const [left,top,right,bottom]=layout.captions;
  assert.ok(left>0&&right<width&&left+right===width,s.id);
  assert.ok(top<split&&bottom>split&&top+bottom===split*2,s.id);
  assert.equal(layout.subtitleMaxLines,2);
  assert.deepEqual(sequence,['video_context','screen_capture','video_detail','screen_capture']);
  assert.equal(exampleCaptions.length,4);
  assert.ok(s.sequence.frames.every(frame=>frame.width/frame.height===9/16),s.id);
  assert.ok(search.search('B-roll '+s.name).some(result=>result.style.id===s.id),s.id);
  assert.deepEqual(search.search(globalThis.AtlasSearch.styleCode(s.id)).map(result=>result.style.id),[s.id]);
 }
 assert.equal(model.groupByNiche(styles).flatMap(group=>group.styles).length,30);
 const [first,second]=styles;
 const choice={
  selectedStyles:[first,second].map(s=>({...s,visualSequence:s.sequence,referenceFrame:W.referenceFrame(s)})),
  styleContributions:{
   [first.id]:[{aspect:'style_direction',scope:'film'}],
   [second.id]:[{aspect:'movement_language',scope:'details'}]
  },
  topic:'Como escolher as frutas do gelato',format:'16:9',durationMode:'source',targetDurationSeconds:null,
  materialAssignments:[{id:'tomada-original',label:'Apresentação.mp4',kind:'video',source:'picked_locally',
   roles:['reference','incorporate'],rights:{image:'authorized',voice:'authorized'}}]
 };
 const prompt=W.buildPrompt(choice);
 const bundle=W.portableBundle(choice);
 assert.equal(bundle.brief.productionIntent.deliverable,'final_ai_video');
 assert.equal(bundle.brief.format,'16:9');
 assert.equal(bundle.brief.durationMode,'source');
 assert.deepEqual(bundle.brief.materialAssignments,choice.materialAssignments);
 assert.deepEqual(bundle.brief.styleContributions,choice.styleContributions);
 for(const s of bundle.brief.selectedStyles){
  assert.match(s.executionPlan.planningRule,/curadoria-de-conteudos/);
  assert.ok(prompt.includes(s.executionPlan.planningRule));
  assert.equal(s.executionPlan.supportMedia.layout.subtitleMaxLines,2);
 }
});

test('1455 distinct visual sequences preserve IDs, four complete frames and review boundaries',()=>{
 assert.equal(catalog.styles.length,1455);
 assert.equal(catalog.visualEditionStatus,'complete');
 assert.equal(provenance.length,1455);
 assert.equal(new Set(catalog.styles.map(s=>s.id)).size,1455);
 const hashes=new Set();
 for(const s of catalog.styles){
  const record=provenance.find(r=>r.id===s.id);
  assert.ok(record,s.id);
  assert.equal(s.sequence.frames.length,4,s.id);
  assert.equal(s.sequence.motionValidated,false);
  assert.equal(s.sequence.conceptOnly,true);
  assert.equal(record.motionValidated,false);
  if(s.broll)assert.equal(s.sequence.conceptApproval,'approved_by_user_2026-11-23');
  else assert.ok(['approved_by_user_2026-11-11','approved_by_user_2026-11-12','pending_user_review'].includes(s.sequence.conceptApproval));
  for(const [i,f] of s.sequence.frames.entries()){
   assert.ok(f.width>=300&&f.height>=300,s.id);
   const data=fs.readFileSync(new URL('dist/'+f.src,root));
   if(f.crop){const info=referenceImageInfo(data);assert.deepEqual(f.crop,record.frames[i].crop);assert.equal(f.width,Math.round(info.width*f.crop[2]));assert.equal(f.height,Math.round(info.height*f.crop[3]));}
   else assert.equal(data.toString('ascii',8,12),'WEBP');
   const hash=createHash('sha256').update(data).digest('hex');
   hashes.add(hash+JSON.stringify(f.crop||null));if(f.crop)assert.equal(hash,record.sha256,s.id);
   if(s.broll)assert.equal(hash,record.frames[i].sha256,s.id);
   assert.ok(fs.statSync(new URL('dist/'+f.thumbnail,root)).size>100);
   if(record.crops){
    assert.equal(hash,record.crops[i].sha256,s.id);
    const [x1,y1,x2,y2]=record.crops[i].rect;
    assert.equal(f.width,x2-x1);assert.equal(f.height,y2-y1);
   }
  }
  assert.equal(s.executionPlan.referenceStates.length,4);
  assert.equal(s.executionPlan.motionTargets.length,3);
  assert.match(s.executionPlan.planningRule,/sem divisão uniforme/);
  assert.match(s.executionPlan.textRule,/editável/);
  assert.equal(s.executionPlan.movementLanguage,s.motion);
  assert.deepEqual(s.executionPlan.resources,s.resources);
 }
 assert.equal(hashes.size,5820,'each frame has a distinct complete address, never a repeated cover');
});

test('old and expanded styles hand off the actual sequence, action plan and neutral approval rules',()=>{
 for(const s of [catalog.styles[0],catalog.styles.at(-1)]){
  const selected={...s,visualSequence:s.sequence,referenceFrame:W.referenceFrame(s)};
  const choice={selectedStyles:[selected],targetDurationSeconds:90,format:'9:16',topic:'Tema demonstrativo',typography:'auto',fidelityContract:W.fidelityContract};
  const prompt=W.buildPrompt(choice);
  for(const f of s.sequence.frames)assert.ok(prompt.includes(f.src),f.src);
  assert.ok(prompt.includes('executionPlan'));
  assert.ok(prompt.includes(s.motion));
  assert.ok(prompt.includes('moodboard'));
  assert.ok(prompt.includes('storyboard'));
  assert.doesNotMatch(prompt,/\bGDA\b|wa\.me|WHATSAPP/);
  assert.doesNotMatch(prompt,/STATUS_PROJETO/,'no machine status snippet is requested in chat');
 }
});
