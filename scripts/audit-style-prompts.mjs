// Exhaustive contract audit. Does not generate or creatively approve any video.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import '../style-atlas/dist/guided.js';
import '../style-atlas/dist/workflow.js';
const W=globalThis.AtlasWorkflow,bytes=await fs.readFile('style-atlas/dist/catalog.json'),catalog=JSON.parse(bytes);
const counts=Object.fromEntries(W.skillSystem.skills.map(s=>[s.id,0])),styles=[];
let partialChecks=0;
for(const s of catalog.styles){
 const c={selectedStyles:[{...s,referenceFrame:W.referenceFrame(s),visualSequence:s.sequence}],styleContributions:{[s.id]:[{aspect:'style_direction',scope:'film'}]},catalogVersion:catalog.version,topic:'Assunto autorizado para auditoria de contrato',brand:'',format:'9:16',typography:'auto',targetDurationSeconds:30,projectState:{history:[],approvals:W.emptyApprovals(),preProductionApprovals:W.emptyPreProductionApprovals()}};
 const prompt=W.buildPrompt(c),files=W.starterFiles(c),bundle=JSON.parse(files.find(f=>f.name==='projeto-video.json').text),route=W.skillRouting(c);
 assert.equal(files.find(f=>f.name==='pedido.txt').text,prompt);assert.equal(bundle.request,prompt);assert.deepEqual(bundle.orchestrator.skillRouting,route);assert.deepEqual(bundle.project.styleContributions,c.styleContributions);assert.equal(bundle.brief.selectedStyles[0].id,s.id);assert.deepEqual(bundle.referenceManifest,W.referenceManifest(c));assert.equal(W.productionContract(c).vfxInput.required,route.modules.includes('video-vfx'));
 assert.equal(prompt.includes('VFX POR PLANO'),W.needsVfx(c,s));assert.equal(prompt.includes('EDIÇÃO COM APRESENTADOR —'),W.needsPresenter(c,s));assert(prompt.includes('review_pending'));assert(prompt.includes('styleId'));assert(prompt.includes('scope'));
 counts[W.skillSystem.orchestrator]++;for(const id of route.modules){assert(Object.hasOwn(counts,id),id);counts[id]++;}
 for(const aspect of ['palette','typographic_language','sound_direction'])for(const scope of Object.keys(W.contributionScopes)){
  const partial={...c,styleContributions:{[s.id]:[{aspect,scope}]}};assert(!W.needsVfx(partial,s));assert(!W.needsPresenter(partial,s));assert(!W.needsAdvertising(partial,s));assert.deepEqual(W.intentSummary(partial).styles[0].contributions.map(({aspect,scope})=>({aspect,scope})),[{aspect,scope}]);partialChecks++;
 }
 styles.push({styleId:s.id,modules:route.modules,vfxContributions:W.vfxContract(c).contributions,promptSha256:createHash('sha256').update(prompt).digest('hex'),status:'contract_checked',audiovisualValidation:'not_run'});
}
const report={schemaVersion:1,date:'2026-11-18',catalogVersion:catalog.version,catalogSha256:createHash('sha256').update(bytes).digest('hex'),skillRoutingVersion:W.skillSystem.version,styleCount:styles.length,partialChecks,counts,promptSurfaces:{copiedRequest:'buildPrompt',txtDownload:'starterFiles/pedido.txt',portableJSON:'portableBundle/request/orchestrator',continuation:'guided-ui uses AtlasApp.prompt',adjustments:'guided-ui uses AtlasApp.prompt plus scoped change',embeddedPage:'pagePrompt plus modelContent and current contributions',presenterTemplate:'presenter-prompt.txt; conditional VFX and shared project required'},limits:['Contract validation only; no generated video, playback, listening or creative approval','Browser clipboard/download and destination checks are recorded separately','VFX detection must be supplemented by shot/media diagnosis and explicit conversation changes'],styles};
const output=process.argv[2]||'docs/validation/vfx-style-prompts.json';await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,styleCount:styles.length,partialChecks,counts}));
