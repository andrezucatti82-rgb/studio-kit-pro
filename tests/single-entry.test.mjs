import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import '../style-atlas/dist/workflow.js';
import {loadSkill} from '../server/skills.mjs';
const W=globalThis.AtlasWorkflow,base=new URL('../.agents/skills/video-multimarcas/',import.meta.url);
const install=(root,agent='claude',extra=[])=>JSON.parse(execFileSync('node',[...extra,'scripts/install-agent.mjs','--agent',agent,'--project-root',root],{encoding:'utf8',stdio:'pipe'}));
test('one discovery entry owns seven canonical internal modules and all portable links resolve',async()=>{
 assert.deepEqual(W.skillSystem.skills.map(s=>s.id),['video-multimarcas']);assert.equal(W.skillSystem.modules.length,7);
 assert.deepEqual(await fs.readdir(new URL('../.agents/skills/',import.meta.url)),['video-multimarcas']);assert.deepEqual(await fs.readdir(new URL('../.claude/skills/',import.meta.url)),['video-multimarcas']);
 for(const module of W.skillSystem.modules){const body=await fs.readFile(new URL(module.instructions,base),'utf8');assert(!body.startsWith('---'),'Internal module must not register skill frontmatter');for(const [,link] of body.matchAll(/\]\(([^)]+)\)/g)){if(link.includes(':')||link.startsWith('#'))continue;await fs.access(new URL(link.split('#')[0],new URL(module.instructions,base)));}}
});
test('both agents retire exact legacy kit specialists with recoverable backups, preserving custom folders',async()=>{
 for(const agent of ['codex','claude']){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'single-entry-'));try{
   const folder=path.join(root,agent==='codex'?'.agents':'.claude','skills');await fs.mkdir(folder,{recursive:true});
   await fs.cp(new URL('./fixtures/legacy-video-planejamento/',import.meta.url),path.join(folder,'video-planejamento'),{recursive:true});
   const original=await fs.readFile(path.join(folder,'video-planejamento/SKILL.md'),'utf8');
   await fs.mkdir(path.join(folder,'video-vfx'));await fs.writeFile(path.join(folder,'video-vfx/SKILL.md'),'custom VFX');
   await fs.mkdir(path.join(folder,'vfx-effects'));await fs.writeFile(path.join(folder,'vfx-effects/SKILL.md'),'external VFX');
   const result=install(root,agent);assert.equal(result.skills.length,1);assert.equal(result.modules.length,7);assert.equal(result.retired.length,1);assert.equal(result.retired[0].id,'video-planejamento');
   assert.equal(await fs.readFile(path.join(result.retired[0].backup,'SKILL.md'),'utf8'),original);await assert.rejects(fs.stat(path.join(folder,'video-planejamento')),/ENOENT/);
   assert.equal(await fs.readFile(path.join(folder,'video-vfx/SKILL.md'),'utf8'),'custom VFX');assert.equal(result.preservedLegacy[0].id,'video-vfx');assert.equal(await fs.readFile(path.join(folder,'vfx-effects/SKILL.md'),'utf8'),'external VFX');
   assert.equal(install(root,agent).retired.length,0);
  }finally{await fs.rm(root,{recursive:true,force:true});}
 }
});
test('an install failure restores retired legacy modules and the previous coordinator',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'single-entry-rollback-'));try{
  const folder=path.join(root,'.claude/skills');await fs.mkdir(folder,{recursive:true});await fs.cp(new URL('./fixtures/legacy-video-planejamento/',import.meta.url),path.join(folder,'video-planejamento'),{recursive:true});
  await fs.mkdir(path.join(folder,'video-multimarcas'));await fs.writeFile(path.join(folder,'video-multimarcas/old.txt'),'prior coordinator');
  const hook=path.join(root,'fault.mjs');await fs.writeFile(hook,"import fs from 'node:fs/promises';const rename=fs.rename;fs.rename=async(from,...args)=>{if(from.includes('.updating-'))throw Error('Synthetic activation failure');return rename(from,...args)};");
  assert.throws(()=>install(root,'claude',['--import',hook]));await fs.access(path.join(folder,'video-planejamento/SKILL.md'));assert.equal(await fs.readFile(path.join(folder,'video-multimarcas/old.txt'),'utf8'),'prior coordinator');assert(!(await fs.readdir(folder)).some(name=>name.includes('.updating-')));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('runtime reads modules selected by actual scopes rather than every specialist',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
 const s=catalog.styles.find(s=>s.id==='rotoscopia');
 const context={styles:[s],combination:{explicit:true,entries:[{styleId:s.id,contributions:[{aspect:'palette',scope:'details'}]}]}};
 const palette=await loadSkill(s.id,{allowAgent:true,context});assert(!palette.records.some(r=>r.file.includes('video-vfx')));assert(!palette.records.some(r=>r.file.includes('video-publicidade')));assert.equal(palette.records.filter(r=>r.file.endsWith('/SKILL.md')).length,1);
 context.combination.entries[0].contributions=[{aspect:'masks',scope:'demonstration'}];const fx=await loadSkill(s.id,{allowAgent:true,context});assert(fx.records.some(r=>r.file.endsWith('/video-vfx.md')));assert(fx.records.some(r=>r.file.endsWith('/vfx-plan.json')));assert(fx.skillRouting.modules.includes('video-vfx'));
});
test('missing internal instructions fail before staging or retiring any installed files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'single-entry-missing-'));try{
  const hook=path.join(root,'missing.mjs');await fs.writeFile(hook,"import fs from 'node:fs/promises';const access=fs.access;fs.access=async(file,...args)=>{if(String(file).endsWith('skill-modules/video-vfx.md'))throw Error('Synthetic missing internal module');return access(file,...args)};");
  assert.throws(()=>install(root,'claude',['--import',hook]));await assert.rejects(fs.stat(path.join(root,'.claude')),/ENOENT/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
