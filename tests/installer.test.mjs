import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {safeRelative,validateManifest,archiveRoot,verifyTree,installStudio} from '../packaging/installer/setup-studio.mjs';
const revision='a'.repeat(40),rootName='studio-kit-pro-'+revision;
const hash=text=>createHash('sha256').update(text).digest('hex');
const manifest=text=>({version:1,kitVersion:'2.12.0',repository:'andrezucatti82-rgb/studio-kit-pro',sourceRevision:revision,files:{'README.md':{bytes:Buffer.byteLength(text),sha256:hash(text)}}});
test('installer validates pinned origins and rejects traversal, links and arbitrary repositories',()=>{
 for(const name of ['../owned','/etc/passwd','a/../../b','C:/data','a\\b','a\nfile','a//b'])assert.equal(safeRelative(name),false,name);
 assert(safeRelative('.agents/skills/video-multimarcas/SKILL.md'));
 for(const alter of [m=>m.repository='someone/other',m=>m.sourceRevision='main',m=>m.files['../secret']=m.files['README.md'],m=>m.files['README.md'].bytes=-1]){const m=manifest('public');alter(m);assert.throws(()=>validateManifest(m));}
 assert.equal(archiveRoot(rootName+'/\n'+rootName+'/README.md\n','drwxr-xr-x root\n-rw-r--r-- file\n'),rootName);
 assert.throws(()=>archiveRoot(rootName+'/\n'+rootName+'/../../escape\n','drwx root\n-rw file'));
 assert.throws(()=>archiveRoot(rootName+'/\n'+rootName+'/link\n','drwx root\nlrwx link'));
});
test('verified source installation resumes without overwriting a project and never calls incomplete runtime ready',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'studio install '));try{
  const source=path.join(temp,'source'),root=path.join(source,rootName),archive=path.join(temp,'source.tar.gz'),config=path.join(temp,'manifest.json'),target=path.join(temp,'installed');await fs.mkdir(root,{recursive:true});await fs.writeFile(path.join(root,'README.md'),'Public source');await fs.writeFile(config,JSON.stringify(manifest('Public source')));execFileSync('tar',['-czf',archive,'-C',source,rootName]);
  const installed=await installStudio({manifest:config,archive,target,prepareOnly:true});assert.equal(installed.status,'source_verified_runtime_pending');assert.equal(installed.accountsConnected,false);
  await fs.mkdir(path.join(target,'projects'));await fs.writeFile(path.join(target,'projects/private.txt'),'Keep my project');await installStudio({manifest:config,archive,target,prepareOnly:true});assert.equal(await fs.readFile(path.join(target,'projects/private.txt'),'utf8'),'Keep my project');
  await fs.writeFile(path.join(target,'README.md'),'Local edits');await assert.rejects(installStudio({manifest:config,archive,target,prepareOnly:true}),/integridade/);assert.equal(await fs.readFile(path.join(target,'README.md'),'utf8'),'Local edits');assert.equal((await fs.readdir(temp)).filter(name=>name.startsWith('.studio-install-')).length,0);
  const personal=path.join(temp,'personal');await fs.mkdir(personal);await fs.writeFile(path.join(personal,'keep.txt'),'Mine');await assert.rejects(installStudio({manifest:config,archive,target:personal,prepareOnly:true}),/pasta já existe/);assert.equal(await fs.readFile(path.join(personal,'keep.txt'),'utf8'),'Mine');
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('corrupted source hashes fail before creating the installed target',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'studio-corrupt-'));try{const folder=path.join(temp,rootName),archive=path.join(temp,'bad.tar.gz'),config=path.join(temp,'manifest.json'),target=path.join(temp,'target');await fs.mkdir(folder);await fs.writeFile(path.join(folder,'README.md'),'Wrong source');await fs.writeFile(config,JSON.stringify(manifest('Expected source')));execFileSync('tar',['-czf',archive,'-C',temp,rootName]);await assert.rejects(installStudio({manifest:config,archive,target,prepareOnly:true}),/integridade/);await assert.rejects(fs.stat(target),/ENOENT/);
 }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('compact ZIP has one bootstrap, tutorial and hash manifest, with a matching download receipt',()=>{
 execFileSync('python3',['-c',String.raw`
import json,zipfile,hashlib
from pathlib import Path
r=Path.cwd();m=json.loads((r/'style-atlas/dist/installation.json').read_text());p=r/'style-atlas/dist'/m['download'];assert m['bytes']==p.stat().st_size and m['sha256']==hashlib.sha256(p.read_bytes()).hexdigest()
assert (r/'dist/studio-kit-pro-installer.zip').read_bytes()==p.read_bytes()
release=json.loads((r/'dist/release-manifest.json').read_text());assert release['installer']['sha256']==m['sha256']
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 for f in ['install.sh','INSTALAR.cmd','install.ps1','setup-studio.mjs','install-manifest.json','LEIA-PRIMEIRO.html']:assert 'Studio-Kit-Pro/'+f in z.namelist()
 manifest=json.loads(z.read('Studio-Kit-Pro/install-manifest.json'));assert manifest['sourceRevision']==m['sourceRevision'];assert manifest['accountsIncluded'] is False
 for name,record in manifest['files'].items():
  assert not any(part in ['projects','node_modules','.env','.git'] for part in Path(name).parts)
  assert hashlib.sha256((r/name).read_bytes()).hexdigest()==record['sha256'],name
`],{stdio:'pipe'});
});
test('all 265 interactive briefs keep required inputs and unknown source timing',async()=>{
 const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8')),styles=catalog.styles.filter(s=>s.presenterEditing);assert.equal(styles.length,265);
 for(const s of styles){const p=s.presenterEditing.interactionPlan;assert(p?.techniqueLabel,s.id);assert.equal(p.beats.length,4);assert.equal(p.sourceTimes,null);assert.equal(p.exampleOnly,true);assert(p.requiredInputs.length>=3);assert.equal(p.beats[3].soundIntent,s.presenterEditing.finishProfile.soundEvents[2].sound);assert(p.beats.every(b=>b.timingEvidence==='pending_actual_source'&&b.graphicAction&&b.presenterAction&&b.purpose));assert.deepEqual(s.executionPlan.presenterEditing.interactionPlan,p);}
});
