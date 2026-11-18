import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('Codex, Claude and runtime archives match canonical files, versions and integrity without private media or credentials',()=>{
 execFileSync('python3',['-c',String.raw`
from pathlib import Path
import json,hashlib,zipfile
r=Path.cwd();version=json.loads((r/'package.json').read_text())['version'];release=json.loads((r/'dist/release-manifest.json').read_text());assert release['kitVersion']==version and release['pluginVersion']==version
ids=[s['id'] for s in release['skillSystem']['skills']];assert len(ids)==8
for name,record in release['packages'].items():assert hashlib.sha256((r/'dist'/name).read_bytes()).hexdigest()==record['sha256']
for archive_name,manifest_name in [('video-multimarcas-plugin.zip','.codex-plugin/plugin.json'),('video-multimarcas-claude-plugin.zip','.claude-plugin/plugin.json')]:
 with zipfile.ZipFile(r/'dist'/archive_name) as z:
  assert z.testzip() is None;assert json.loads(z.read(manifest_name))['version']==version
  import re,posixpath
  for target in re.findall(r'\]\(([^)]+)\)',z.read('INSTALL.md').decode()):
   if ':' not in target and not target.startswith('#'):assert target in z.namelist(),target
  assert z.read('COMECE-AQUI.html')==(r/'docs/COMECE-AQUI.html').read_bytes()
  assert 'https://github.com/andrezucatti82-rgb/studio-kit-pro/blob/main/docs/RELEASE-2.12.md' in z.read('INSTALL.md').decode()
  for f in (r/'.agents/skills/video-multimarcas').rglob('*'):
   if f.is_file():assert z.read('skills/video-multimarcas/'+f.relative_to(r/'.agents/skills/video-multimarcas').as_posix())==f.read_bytes()
  import re,posixpath
  for sid in ids:
   for f in (r/'.agents/skills'/sid).rglob('*'):
    if f.is_file():assert z.read('skills/'+sid+'/'+f.relative_to(r/'.agents/skills'/sid).as_posix())==f.read_bytes()
   entry='skills/'+sid+'/SKILL.md';body=z.read(entry).decode();assert body==(r/'.agents/skills'/sid/'SKILL.md').read_text()
   for target in re.findall(r'\]\(([^)]+)\)',body):
    if ':' not in target and not target.startswith('#'):assert posixpath.normpath(posixpath.join(posixpath.dirname(entry),target.split('#')[0])) in z.namelist(),(entry,target)
with zipfile.ZipFile(r/'dist/video-multimarcas.skill') as z:
 for target in re.findall(r'\]\(([^)]+)\)',z.read('video-multimarcas/INSTALL.md').decode()):
  if ':' not in target and not target.startswith('#'):assert 'video-multimarcas/'+target in z.namelist(),target
 assert z.read('video-multimarcas/COMECE-AQUI.html')==(r/'docs/COMECE-AQUI.html').read_bytes()
 for sid in ids[1:]:
  entry='video-multimarcas/references/skill-modules/'+sid+'.md';body=z.read(entry).decode()
  for target in re.findall(r'\]\(([^)]+)\)',body):
   if ':' not in target and not target.startswith('#'):assert posixpath.normpath(posixpath.join(posixpath.dirname(entry),target.split('#')[0])) in z.namelist(),(entry,target)
with zipfile.ZipFile(r/'dist/video-multimarcas-runtime.zip') as z:
 m=json.loads(z.read('video-multimarcas-runtime/runtime-manifest.json'));assert m['runtimeVersion']==version
 for name in z.namelist():
  assert not any(part in ['..','projects','node_modules','.git','.env','.env.cpanel'] for part in Path(name).parts)
  assert not name.endswith(('.mp4','.jpg','.png','.webp'))
 for name,h in m['files'].items():assert hashlib.sha256(z.read('video-multimarcas-runtime/'+name)).hexdigest()==h==hashlib.sha256((r/name).read_bytes()).hexdigest()
`],{stdio:'pipe'});
});
test('Claude project install replaces only the requested skill and preserves its previous version and other skills',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'claude-skill-'));
 try{const skill=path.join(root,'.claude/skills/video-multimarcas'),other=path.join(root,'.claude/skills/other');await fs.mkdir(skill,{recursive:true});await fs.mkdir(other,{recursive:true});await fs.writeFile(path.join(skill,'old-only.txt'),'Previous user version');await fs.writeFile(path.join(other,'SKILL.md'),'Unrelated skill');
  const output=JSON.parse(execFileSync('node',['scripts/install-agent.mjs','--agent','claude','--project-root',root],{encoding:'utf8'}));assert(output.backup);assert.equal(await fs.readFile(path.join(output.backup,'old-only.txt'),'utf8'),'Previous user version');assert.equal(await fs.readFile(path.join(other,'SKILL.md'),'utf8'),'Unrelated skill');await assert.rejects(fs.stat(path.join(skill,'old-only.txt')),/ENOENT/);assert.match(await fs.readFile(path.join(skill,'references/orchestrator-execution.md'),'utf8'),/2\.12\.0/);assert.equal(output.connectionsTransferred,false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
