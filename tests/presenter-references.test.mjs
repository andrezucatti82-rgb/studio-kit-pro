import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateCatalog} from '../scripts/validate.mjs';
import '../style-atlas/dist/workflow.js';
const W=globalThis.AtlasWorkflow,catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
test('public presenter references are realistic originals with four complete independent panel addresses',async()=>{
 const styles=catalog.styles.filter(s=>s.presenterEditing);assert.equal(styles.length,60);
 for(const s of styles){assert.equal(s.sequence.sourceKind,'photorealistic_generated_reference',s.id);assert(!s.sequence.frames.some(f=>f.src.startsWith('assets/presenter-60/')),'Procedural placeholders must not remain public references');assert.equal(s.image.sourceKind,'image_gen');
  const record=JSON.parse(await fs.readFile(new URL('../style-atlas/records/presenter-realistic/'+s.id+'.json',import.meta.url),'utf8'));const bytes=await fs.readFile(new URL('../style-atlas/dist/'+record.path,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.equal(record.fictionalPeopleAndPlaces,true);assert.equal(record.motionValidated,false);
  assert.equal(new Set(s.sequence.frames.map(f=>f.src+JSON.stringify(f.crop))).size,4);assert.deepEqual(W.referenceFrame(s).crop,s.sequence.frames[s.sequence.heroIndex].crop);
  const manifest=W.referenceManifest({selectedStyles:[s],catalogVersion:catalog.version});assert.deepEqual(manifest.styles[0].frames.map(f=>f.crop),s.sequence.frames.map(f=>f.crop));
 }
});
test('reference validation rejects overlapping panels, missing crop and out-of-bounds crop',()=>{
 const copy=structuredClone(catalog),s=copy.styles.find(s=>s.presenterEditing);assert.doesNotThrow(()=>validateCatalog(copy));const original=structuredClone(s.sequence.frames);
 for(const change of [()=>{s.sequence.frames[0].crop=[0,0,.8,.8]},()=>{delete s.sequence.frames[0].crop},()=>{s.sequence.frames[0].crop=[-.1,0,.5,.5]}]){s.sequence.frames=structuredClone(original);change();assert.throws(()=>validateCatalog(copy),/panel|reference|frame/i);}
});
test('composition directives cover different mechanisms without a fixed presenter side or universal glass panel',()=>{
 const styles=catalog.styles.filter(s=>s.presenterEditing);const modes=new Set(),positions=new Set();let glass=0;
 for(const s of styles){const p=s.presenterEditing,d=p.creativeDirection;assert.equal(d.fixedPresenterSide,false);assert.equal(d.digitalMirroringDefault,false);assert.equal(d.sourceCoverageRequired,true);assert.equal(d.presenterBlocking.length,4);assert.equal(d.shotLanguage.length,4);assert.equal(p.interactionPlan.genericGlassPanelDefault,false);modes.add(d.visualMode);d.presenterBlocking.forEach(v=>positions.add(v));if(p.finishProfile.glass)glass++;}
 assert(modes.has('real_interface_takeover')&&modes.has('body_trajectory')&&modes.has('physical_scale_model')&&modes.has('event_map_build')&&modes.has('two_role_dialogue'));assert(positions.has('center')&&positions.has('left')&&positions.has('right')&&positions.has('voice_only')&&positions.has('inset_left')&&positions.has('inset_right'));assert(glass<styles.length/4,'Glass is a specific treatment, not the common presenter layout');
 const style=styles[0],scoped=W.scopedPromptStyle({selectedStyles:[style],styleContributions:{[style.id]:[{aspect:'palette',scope:'details'}]}},style);assert.equal(scoped.executionPlan.creativeDirection,undefined);assert.equal(scoped.presenterEditing,undefined);
});
