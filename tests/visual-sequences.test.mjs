import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/workflow.js';

const root=new URL('../style-atlas/',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const catalog=read('dist/catalog.json');
const provenance=[...read('records/sequences-720/assets.json'),...read('records/natural-ads-60/assets.json'),...read('records/segments-440/assets.json'),...read('records/presenter-realistic/manifest.json').images];
const W=globalThis.AtlasWorkflow;

test('1220 distinct visual sequences preserve IDs, four complete frames and review boundaries',()=>{
 assert.equal(catalog.styles.length,1220);
 assert.equal(catalog.visualEditionStatus,'complete');
 assert.equal(provenance.length,1220);
 assert.equal(new Set(catalog.styles.map(s=>s.id)).size,1220);
 const hashes=new Set();
 for(const s of catalog.styles){
  const record=provenance.find(r=>r.id===s.id);
  assert.ok(record,s.id);
  assert.equal(s.sequence.frames.length,4,s.id);
  assert.equal(s.sequence.motionValidated,false);
  assert.equal(s.sequence.conceptOnly,true);
  assert.equal(record.motionValidated,false);
  assert.ok(['approved_by_user_2026-11-11','approved_by_user_2026-11-12','pending_user_review'].includes(s.sequence.conceptApproval));
  for(const [i,f] of s.sequence.frames.entries()){
   assert.ok(f.width>=300&&f.height>=300,s.id);
   const data=fs.readFileSync(new URL('dist/'+f.src,root));
   if(f.crop){assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.deepEqual(f.crop,record.frames[i].crop);assert.equal(f.width,Math.round(data.readUInt32BE(16)*f.crop[2]));assert.equal(f.height,Math.round(data.readUInt32BE(20)*f.crop[3]));}
   else assert.equal(data.toString('ascii',8,12),'WEBP');
   const hash=createHash('sha256').update(data).digest('hex');
   hashes.add(hash+JSON.stringify(f.crop||null));if(f.crop)assert.equal(hash,record.sha256,s.id);
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
 assert.equal(hashes.size,4880,'each frame has a distinct complete address, never a repeated cover');
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
  assert.ok(prompt.indexOf('STATUS_PROJETO')>prompt.indexOf(s.id),'status instructions follow the creative brief');
 }
});
