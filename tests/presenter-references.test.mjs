import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateCatalog} from '../scripts/validate.mjs';
import '../style-atlas/dist/workflow.js';
const W=globalThis.AtlasWorkflow,catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
test('public presenter references are realistic originals with four complete independent panel addresses',async()=>{
 const styles=catalog.styles.filter(s=>s.presenterEditing);assert.equal(styles.length,265);
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

test('color-only use of a commercial explanation removes depth/acting requirements from the scoped execution plan',()=>{
 const style=catalog.styles.find(s=>s.edition==='4.8'&&s.presenterEditing);assert(style?.executionPlan.depthComposition);
 const choice={selectedStyles:[style],styleContributions:{[style.id]:[{aspect:'palette',scope:'details'}]}};
 const scoped=W.scopedPromptStyle(choice,style);assert.equal(scoped.presenterEditing,undefined);assert.equal(scoped.executionPlan.presenterEditing,undefined);assert.equal(scoped.executionPlan.depthComposition,undefined);assert.equal(scoped.executionPlan.creativeDirection,undefined);
 const full=W.scopedPromptStyle({...choice,styleContributions:{[style.id]:[{aspect:'style_direction',scope:'film'}]}},style);assert.deepEqual(full.executionPlan.depthComposition,style.executionPlan.depthComposition);assert.equal(full.presenterEditing.interactionPlan.sourceTimes,null);
});

test('property and implant requests preserve verified-domain inputs through the portable project',()=>{
 const properties=catalog.styles.filter(s=>s.presenterEditing?.domain?.kind==='real_estate'),dentistry=catalog.styles.filter(s=>s.presenterEditing?.domain?.kind==='implant_education');assert.equal(properties.length,30);assert.equal(dentistry.length,10);
 const mcmv=properties.filter(s=>s.presenterEditing.domain.profile==='Minha Casa, Minha Vida');assert.equal(mcmv.length,5);
 for(const s of [...properties,...dentistry]){
  const p=s.presenterEditing;assert.equal(p.domain.sourceVerificationRequired,true);assert.equal(p.route,'external_asset');assert(p.requiredInputs.length>5);assert.equal(p.interactionPlan.sourceTimes,null);
  const c={selectedStyles:[{...s,referenceFrame:W.referenceFrame(s),visualSequence:s.sequence}],catalogVersion:catalog.version,topic:s.exampleTopic,format:'9:16',targetDurationSeconds:30};
  const bundle=JSON.parse(W.starterFiles(c).find(f=>f.name==='projeto-video.json').text),portable=bundle.brief.selectedStyles[0];assert.deepEqual(portable.presenterEditing.domain,p.domain);assert.deepEqual(portable.presenterEditing.requiredInputs,p.requiredInputs);
  const scoped=W.scopedPromptStyle({...c,styleContributions:{[s.id]:[{aspect:'palette',scope:'details'}]}},s);assert.equal(scoped.presenterEditing,undefined);
 }
 for(const s of mcmv)assert(s.researchRefs.includes('mcmv-official'));
 for(const s of dentistry){assert(s.researchRefs.includes('efp-implants-explained'));assert.match(s.presenterEditing.professionalConstraints,/individuais, sem prazo fixo/);}
});

test('business explanations distinguish demonstrated interfaces from live results and retain metric provenance',()=>{
 const rows=catalog.styles.filter(s=>s.presenterEditing?.domain?.kind==='business_education');assert.equal(rows.length,20);
 for(const sector of ['agencias','trafego-pago','ecommerce','ia-negocios'])assert.equal(rows.filter(s=>s.presenterEditing.sector===sector).length,5);
 for(const s of rows){const p=s.presenterEditing;assert.equal(p.domain.metricsRequirePeriodDefinitionAndSource,true);assert.equal(p.domain.simulatedInterfacesAreNotLive,true);assert.match(p.professionalConstraints,/atribuição como causalidade/);assert.equal(p.interactionPlan.sourceTimes,null);assert(p.interactionPlan.beats.every(b=>b.depthAction&&b.shotLanguage));assert(s.researchRefs.length>=2);}
});
