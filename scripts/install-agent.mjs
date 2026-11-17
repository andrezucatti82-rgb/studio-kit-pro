import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../style-atlas/dist/workflow.js';
const repo=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const agent=arg('--agent'),root=path.resolve(arg('--project-root',repo));
if(!['codex','claude'].includes(agent))throw Error('Use --agent codex|claude --project-root path');
const ids=AtlasWorkflow.skillSystem.skills.map(s=>s.id),stamp=Date.now()+'-'+process.pid;
const records=ids.map(id=>({id,source:path.join(repo,'.agents/skills',id),path:path.join(root,agent==='codex'?'.agents':'.claude','skills',id),backup:null}));
// Validate all owned sources before staging or moving any installed skill.
for(const r of records)await fs.access(path.join(r.source,'SKILL.md'));
const work=records.filter(r=>r.source!==r.path),staged=[];
try{
 for(const r of work){await fs.mkdir(path.dirname(r.path),{recursive:true});r.staged=r.path+'.updating-'+stamp;staged.push(r);await fs.cp(r.source,r.staged,{recursive:true});}
 for(const r of work){
  try{await fs.lstat(r.path);const backupPath=path.join(root,'.cache/video-multimarcas-installs',stamp,agent,r.id);await fs.mkdir(path.dirname(backupPath),{recursive:true});await fs.rename(r.path,backupPath);r.backup=backupPath;}catch(error){if(error.code!=='ENOENT')throw error;}
  await fs.rename(r.staged,r.path);r.installed=true;
 }
}catch(error){
 const failures=[];
 for(const r of [...work].reverse()){try{if(r.installed)await fs.rm(r.path,{recursive:true,force:true});if(r.backup)await fs.rename(r.backup,r.path);}catch(rollbackError){failures.push(rollbackError);}}
 for(const r of staged){try{await fs.rm(r.staged,{recursive:true,force:true});}catch(cleanupError){failures.push(cleanupError);}}
 if(failures.length)throw new AggregateError([error,...failures],'Kit update failed; inspect reported rollback/cleanup failures and backups');
 throw error;
}
const main=records[0];console.log(JSON.stringify({agent,scope:'project',skill:main.path,backup:main.backup,skills:records.map(r=>({id:r.id,path:r.path,backup:r.backup,status:r.source===r.path?'already_present':'installed'})),runtimeIncluded:false,connectionsTransferred:false,note:'Complete six-skill kit. Other skills/configuration are untouched. Reopen the agent; verify runtime and connections separately.'},null,2));
