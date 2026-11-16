import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=fileURLToPath(new URL('../',import.meta.url)),args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const agent=arg('--agent'),root=path.resolve(arg('--project-root',repo));
if(!['codex','claude'].includes(agent))throw Error('Use --agent codex|claude --project-root path');
const source=path.join(repo,'.agents/skills/video-multimarcas'),dest=path.join(root,agent==='codex'?'.agents':'.claude','skills/video-multimarcas');
if(source===dest){console.log('Canonical Codex project skill already present: '+dest);process.exit(0);}
await fs.mkdir(path.dirname(dest),{recursive:true});let backup;const staged=dest+'.updating-'+Date.now();await fs.cp(source,staged,{recursive:true});
try{await fs.stat(dest);backup=path.join(root,'.cache/video-multimarcas-installs',String(Date.now()),agent);await fs.mkdir(path.dirname(backup),{recursive:true});await fs.rename(dest,backup);}catch(error){if(error.code!=='ENOENT')throw error;}
// Only this explicitly requested skill is updated. Other skills/configuration are untouched.
try{await fs.rename(staged,dest);}catch(error){if(backup)await fs.rename(backup,dest);throw error;}console.log(JSON.stringify({agent,scope:'project',skill:dest,backup:backup??null,runtimeIncluded:false,connectionsTransferred:false,note:'Reopen the agent session and verify its loaded version. The runtime and provider connections require separate checks.'},null,2));
