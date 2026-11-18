import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import '../style-atlas/dist/guided.js';
import '../style-atlas/dist/workflow.js';
import {importSiteRequest,readContext,runtimeContext,contextFingerprint} from '../server/handoff.mjs';
const W=globalThis.AtlasWorkflow;
const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
const style=id=>catalog.styles.find(s=>s.id===id);
function choice(s,aspect='style_direction',scope='film'){
 return {selectedStyles:[{...s,referenceFrame:W.referenceFrame(s),visualSequence:s.sequence}],styleContributions:{[s.id]:[{aspect,scope}]},catalogVersion:catalog.version,topic:'Demonstração com materiais autorizados',brand:'',format:'9:16',typography:'auto',targetDurationSeconds:30,projectState:{history:[],approvals:W.emptyApprovals(),preProductionApprovals:W.emptyPreProductionApprovals()}};
}
test('VFX routes technical recipes and chosen effects, preserving local contribution scope',()=>{
 for(const id of ['rotoscopia','holografia','nevoa-volumetrica','produto-com-widgets-rastreados','explicador-texto-atras','explicador-toque-e-resposta']){
  const c=choice(style(id),'style_direction','demonstration'),r=W.skillRouting(c);
  assert(r.modules.includes('video-vfx'),id);assert.equal(r.version,3);
  assert.deepEqual(W.vfxContract(c).contributions,[{styleId:id,aspect:'style_direction',scope:'demonstration'}]);
  assert(W.buildPrompt(c).includes('VFX POR PLANO'));assert(r.modules.indexOf('video-vfx')<r.modules.indexOf('video-tratamento'));
 }
 for(const aspect of ['masks','effects'])assert(W.needsVfx(choice(style('documental-observacional'),aspect,'opening'),style('documental-observacional')));
});
test('every catalog style respects palette, typography, sound and explicit effects boundaries',()=>{
 for(const s of catalog.styles){
  for(const aspect of ['palette','grading','lighting','texture','typographic_language','sound_direction','music','sfx']){
   const c=choice(s,aspect,'details');assert.equal(W.needsVfx(c,s),false,`${s.id}:${aspect}`);assert(!W.skillRouting(c).modules.includes('video-vfx'));
  }
  for(const aspect of ['masks','effects'])assert(W.needsVfx(choice(s,aspect,'opening'),s),`${s.id}:${aspect}`);
 }
 const c=choice(style('documental-observacional'));assert(!W.needsVfx(c,c.selectedStyles[0]));
 // Generic warnings must never route a simple style to compositing.
 const plain={...c.selectedStyles[0],requirements:'tracking roto VFX não instalados',proof:'conferir máscaras',note:'holograma não autorizado'};
 assert(!W.needsVfx({...c,selectedStyles:[plain]},plain));
});
test('mixed styles activate VFX once without importing effects from a palette-only complement',()=>{
 const main=style('documental-observacional'),fx=style('rotoscopia'),c=choice(main);
 c.selectedStyles.push({...fx,referenceFrame:W.referenceFrame(fx),visualSequence:fx.sequence});c.styleContributions[fx.id]=[{aspect:'palette',scope:'details'}];
 assert(!W.skillRouting(c).modules.includes('video-vfx'));
 c.styleContributions[fx.id]=[{aspect:'masks',scope:'demonstration'}];
 assert.equal(W.skillRouting(c).modules.filter(id=>id==='video-vfx').length,1);assert.equal(W.intentSummary(c).styles[0].styleId,main.id);
 assert.deepEqual(W.vfxContract(c).contributions,[{styleId:fx.id,aspect:'masks',scope:'demonstration'}]);
});
test('VFX import creates auxiliary records once and legacy v2 contexts retain exact bytes and artifacts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'vfx-route-'));
 try{
  const c=choice(style('rotoscopia')),bundle=JSON.parse(W.starterFiles(c).find(f=>f.name==='projeto-video.json').text);
  const legacy={...W.skillRouting(c),version:2,modules:W.skillRouting(c).modules.filter(id=>id!=='video-vfx')};bundle.orchestrator.skillRouting=legacy;
  const file=path.join(root,'request.json'),project=path.join(root,'project');await fs.writeFile(file,JSON.stringify(bundle));await importSiteRequest(file,project);
  const plan=JSON.parse(await fs.readFile(path.join(project,'vfx-plan.json'),'utf8'));assert.equal(plan.status,'planning');assert.deepEqual(plan.contributionBindings,W.vfxContract(c).contributions);
  const review=JSON.parse(await fs.readFile(path.join(project,'vfx-review.json'),'utf8'));assert.equal(review.playback.status,'not_checked');assert.equal(review.status,'review_pending');
  await fs.writeFile(path.join(project,'vfx-plan.json'),'existing operator work');
  const context=await readContext(project);context.skillRouting=legacy;context.intentSummary.skillRouting=legacy;context.contextSha256=contextFingerprint(context);const bytes=JSON.stringify(context);await fs.writeFile(path.join(project,'agent-context.json'),bytes);
  await importSiteRequest(file,project);assert.equal(await fs.readFile(path.join(project,'agent-context.json'),'utf8'),bytes);assert.equal(await fs.readFile(path.join(project,'vfx-plan.json'),'utf8'),'existing operator work');
  const assets=path.join(root,'assets');await fs.mkdir(assets);assert((await runtimeContext(project,{root:assets})).effectiveSkillRouting.modules.includes('video-vfx'));
  bundle.orchestrator.skillRouting.modules.push('video-vfx');await fs.writeFile(file,JSON.stringify(bundle));await assert.rejects(importSiteRequest(file,path.join(root,'forged')),/routing/);
  const simple=choice(style('documental-observacional'));await fs.writeFile(file,JSON.stringify(JSON.parse(W.starterFiles(simple).find(f=>f.name==='projeto-video.json').text)));await importSiteRequest(file,path.join(root,'simple'));await assert.rejects(fs.stat(path.join(root,'simple/vfx-plan.json')),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
