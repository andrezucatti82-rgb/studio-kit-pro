import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import '../style-atlas/dist/workflow.js';
import {importSiteRequest,readContext,contextFingerprint} from '../server/handoff.mjs';
const W=globalThis.AtlasWorkflow;
const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
const presenter=catalog.styles.find(s=>s.presenterEditing),ad=catalog.styles.find(s=>s.advertising);
function choice(styles,contributions){return {selectedStyles:styles.map(s=>({...s,referenceFrame:W.referenceFrame(s),visualSequence:s.sequence})),styleContributions:contributions,catalogVersion:catalog.version,targetDurationSeconds:30,format:'9:16',topic:'Explicar um processo com materiais reais',brand:'',typography:'auto',projectState:{history:[],approvals:W.emptyApprovals(),preProductionApprovals:W.emptyPreProductionApprovals()}};}
test('kit exposes a coordinator and five discoverable specialists',()=>{
 assert.equal(typeof W.skillRouting,'function','Missing structured skill routing');
 assert.equal(W.skillSystem.orchestrator,'video-multimarcas');assert.equal(W.skillSystem.skills.length,6);
});
test('all sixty presenter directions route interaction work to the presenter specialist',()=>{
 assert.equal(typeof W.skillRouting,'function');
 for(const s of catalog.styles.filter(s=>s.presenterEditing)){const r=W.skillRouting(choice([s],{[s.id]:[{aspect:'style_direction',scope:'film'}]}));assert.equal(r.primarySkill,'video-explicador-interativo');assert(r.modules.includes('video-planejamento'));assert(r.modules.includes('video-edicao'));assert(r.modules.includes('video-revisao'));}
});
test('palette-only presenter references retain scopes without requiring a presenter recipe',()=>{
 assert.equal(typeof W.skillRouting,'function');
 const c=choice([ad,presenter],{[ad.id]:[{aspect:'style_direction',scope:'film'}],[presenter.id]:[{aspect:'palette',scope:'details'}]});
 const r=W.skillRouting(c);assert.equal(r.primarySkill,'video-publicidade');assert(!r.modules.includes('video-explicador-interativo'));
 assert.equal(W.productionContract(c).presenterInput.required,false);
 const scoped=W.scopedPromptStyle(c,c.selectedStyles[1]);assert.equal(scoped.presenterEditing,undefined);assert.equal(scoped.executionPlan.presenterEditing,undefined);assert.equal(scoped.executionPlan.finishProfile,undefined);
 const prompt=W.buildPrompt(c);assert(prompt.includes('video-publicidade'));assert(!prompt.includes('EDIÇÃO COM APRESENTADOR —'));
 assert.equal(W.intentSummary(c).styles[1].contributions[0].scope,'details');
});
test('routing names project capabilities and preserves scoped resume decisions',()=>{
 const c=choice([presenter],{[presenter.id]:[{aspect:'style_direction',scope:'film'}]});c.projectState.continuity=W.emptyContinuity();c.projectState.continuity.decisions.push({id:'sound-revision',stage:'visual_storyboard',text:'Alterar somente o som; preservar roteiro e visual',evidence:'Synthetic test decision'});
 const original=structuredClone(c.projectState);const route=W.skillRouting(c);assert.equal(route.resumePolicy,'run_only_pending_or_affected_stages');assert.equal(route.scope,'selected_style_capabilities');assert.deepEqual(c.projectState,original);assert(W.buildPrompt(c).includes('Alterar somente o som'));
});
test('mixed functional choices keep both specialists and the principal role',()=>{
 assert.equal(typeof W.skillRouting,'function');
 const c=choice([presenter,ad],{[presenter.id]:[{aspect:'style_direction',scope:'film'}],[ad.id]:[{aspect:'hook',scope:'opening'}]});const r=W.skillRouting(c);assert.equal(r.primarySkill,'video-explicador-interativo');assert(r.modules.includes('video-publicidade'));assert.equal(W.intentSummary(c).styles[0].role,'principal');
});
test('downloaded routing is checked against actual selections, while old requests remain importable',async()=>{
 assert.equal(typeof W.skillRouting,'function');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'skill-route-'));try{const c=choice([presenter],{[presenter.id]:[{aspect:'style_direction',scope:'film'}]}),bundle=JSON.parse(W.starterFiles(c).find(f=>f.name==='projeto-video.json').text);assert.deepEqual(bundle.orchestrator.skillRouting,W.skillRouting(c));
  const file=path.join(root,'request.json');await fs.writeFile(file,JSON.stringify(bundle));await importSiteRequest(file,path.join(root,'good'));assert.deepEqual((await readContext(path.join(root,'good'))).skillRouting,W.skillRouting(c));
  bundle.orchestrator.skillRouting.primarySkill='video-publicidade';await fs.writeFile(file,JSON.stringify(bundle));await assert.rejects(importSiteRequest(file,path.join(root,'bad')),/routing|rota/i);
  delete bundle.orchestrator.skillRouting;await fs.writeFile(file,JSON.stringify(bundle));await importSiteRequest(file,path.join(root,'legacy'));assert.equal((await readContext(path.join(root,'legacy'))).skillRouting.primarySkill,'video-explicador-interativo');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('fresh project install includes all six kit skills and leaves another skill intact',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kit-install-'));try{await fs.mkdir(path.join(root,'.claude/skills/personal'),{recursive:true});await fs.writeFile(path.join(root,'.claude/skills/personal/SKILL.md'),'personal');const result=JSON.parse(execFileSync('node',['scripts/install-agent.mjs','--agent','claude','--project-root',root],{encoding:'utf8'}));assert.equal(result.skills?.length,6,'Complete kit was not installed');assert.equal(await fs.readFile(path.join(root,'.claude/skills/personal/SKILL.md'),'utf8'),'personal');for(const s of result.skills)assert((await fs.readFile(path.join(s.path,'SKILL.md'),'utf8')).includes('name: '+s.id));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('failed kit update rolls back earlier skills and removes staging files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kit-rollback-'));try{const skills=path.join(root,'.claude/skills');await fs.mkdir(path.join(skills,'video-planejamento'),{recursive:true});await fs.writeFile(path.join(skills,'video-planejamento/old.txt'),'keep old planning');await fs.writeFile(path.join(root,'.cache'),'blocks backup directory');
  assert.throws(()=>execFileSync('node',['scripts/install-agent.mjs','--agent','claude','--project-root',root],{encoding:'utf8',stdio:'pipe'}));
  assert.equal((await fs.readdir(skills)).includes('video-multimarcas'),false,'Partial coordinator install must roll back');assert(!(await fs.readdir(skills)).some(s=>s.includes('.updating-')));assert.equal(await fs.readFile(path.join(skills,'video-planejamento/old.txt'),'utf8'),'keep old planning');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('reimporting a valid pre-routing context preserves its fingerprint and artifacts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kit-context-'));try{const c=choice([presenter],{[presenter.id]:[{aspect:'style_direction',scope:'film'}]}),bundle=JSON.parse(W.starterFiles(c).find(f=>f.name==='projeto-video.json').text);delete bundle.orchestrator.skillRouting;delete bundle.orchestrator.intentSummary;const file=path.join(root,'request.json'),project=path.join(root,'project');await fs.writeFile(file,JSON.stringify(bundle));await importSiteRequest(file,project);
  const context=await readContext(project);delete context.skillRouting;delete context.intentSummary;delete context.contract.skillRouting;delete context.contract.intentSummary;context.contextSha256=contextFingerprint(context);const old=JSON.stringify(context);await fs.writeFile(path.join(project,'agent-context.json'),old);await fs.writeFile(path.join(project,'production-contract.json'),JSON.stringify(context.contract));await fs.writeFile(path.join(project,'approved-plan.txt'),'Existing project artifact');
  const resumed=await importSiteRequest(file,project);assert.equal(resumed.contextSha256,context.contextSha256);assert.equal(await fs.readFile(path.join(project,'agent-context.json'),'utf8'),old);assert.equal(await fs.readFile(path.join(project,'approved-plan.txt'),'utf8'),'Existing project artifact');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('a copy failure cleans the staged skill before installation starts',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'kit-copy-'));try{const hook=path.join(root,'copy-fault.mjs');await fs.writeFile(hook,"import fs from 'node:fs/promises';const copy=fs.cp;fs.cp=async(...args)=>{await copy(...args);throw Object.assign(new Error('Synthetic copy failure'),{code:'EIO'});};");assert.throws(()=>execFileSync('node',['--import',hook,'scripts/install-agent.mjs','--agent','claude','--project-root',root],{stdio:'pipe'}));const files=await fs.readdir(path.join(root,'.claude/skills'));assert(!files.some(f=>f.includes('.updating-')),'Failed staging must be cleaned');assert(!files.includes('video-multimarcas'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
