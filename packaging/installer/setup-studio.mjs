// Local, account-independent bootstrap. Downloads only the pinned public repository.
import fs from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
export function safeRelative(value){return typeof value==='string'&&value.length>0&&!/[\\:\x00-\x1f]/u.test(value)&&!value.startsWith('/')&&value.split('/').every(part=>part&&part!=='.'&&part!=='..');}
export function validateManifest(m){
 if(m.version!==1||!/^\d+\.\d+\.\d+$/.test(m.kitVersion)||m.repository!=='andrezucatti82-rgb/studio-kit-pro'||!/^[a-f0-9]{40}$/.test(m.sourceRevision)||!m.files||!Object.keys(m.files).length)throw Error('Manifesto de instalação inválido.');
 for(const [name,record] of Object.entries(m.files))if(!safeRelative(name)||!record||!/^[a-f0-9]{64}$/.test(record.sha256)||!Number.isSafeInteger(record.bytes)||record.bytes<0)throw Error('Arquivo inválido no manifesto.');
 return m;
}
export function archiveRoot(listing,verbose){
 const names=listing.trim().split(/\r?\n/u);if(!names.length)throw Error('Arquivo vazio.');
 const root=names[0].split('/')[0];if(!/^studio-kit-pro-[a-f0-9]{40}$/.test(root))throw Error('Origem inesperada no arquivo.');
 for(const name of names){const clean=name.replace(/\/$/u,'');if(!safeRelative(clean)||!(clean===root||clean.startsWith(root+'/')))throw Error('Caminho inseguro no arquivo.');}
 // Reject symlinks, hardlinks and special files before any extraction.
 if(verbose.trim().split(/\r?\n/u).some(line=>!/^[-d]/u.test(line)))throw Error('Links ou arquivos especiais não permitidos.');
 return root;
}
async function hashFile(file){const hash=createHash('sha256');for await(const data of createReadStream(file))hash.update(data);return hash.digest('hex');}
export async function verifyTree(root,manifest){
 for(const [name,record] of Object.entries(manifest.files)){
  const file=path.join(root,...name.split('/')),stat=await fs.lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==record.bytes||await hashFile(file)!==record.sha256)throw Error('Falha de integridade: '+name);
 }
}
async function run(command,args,{cwd,env=process.env,capture=false}={}){
 return new Promise((resolve,reject)=>{const p=spawn(command,args,{cwd,env,shell:false,stdio:capture?['ignore','pipe','pipe']:'inherit'});let stdout='',stderr='';
  if(capture){p.stdout.on('data',b=>{stdout+=b;if(stdout.length>8*1024*1024)p.kill();});p.stderr.on('data',b=>{stderr+=b;if(stderr.length>1024*1024)p.kill();});}
  p.on('error',reject);p.on('close',code=>code===0?resolve({stdout,stderr}):reject(Error(command+' falhou ('+code+'). '+(capture?stderr.slice(-1200):'Confira a mensagem acima.'))));
 });
}
const available=async command=>run(command,command==='git'?['--version']:['-version'],{capture:true}).then(()=>true,()=>false);
async function download(manifest,target){
 const url=`https://codeload.github.com/${manifest.repository}/tar.gz/${manifest.sourceRevision}`;
 // Native fetch in Node 22 does not honor proxy environment settings. System curl
 // does, including corporate certificate configuration; never print proxy values.
 if(process.env.HTTPS_PROXY||process.env.https_proxy||process.env.ALL_PROXY||process.env.all_proxy){
  console.log('Usando o transporte do sistema para a configuração de rede existente.');
  await run('curl',['--fail','--silent','--show-error','--location','--proto','=https','--proto-redir','=https','--max-time','1800','--max-filesize','1073741824','--output',target,url]);
  if((await fs.stat(target)).size>1024*1024*1024)throw Error('Download excede 1 GiB.');return;
 }
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30*60*1000)});
 if(!response.ok||!response.body)throw Error('GitHub indisponível: HTTP '+response.status);
 let bytes=0;const bound=new Transform({transform(data,encoding,callback){bytes+=data.length;callback(bytes>1024*1024*1024?Error('Download excede 1 GiB.'):null,data);}});
 await pipeline(Readable.fromWeb(response.body),bound,createWriteStream(target,{flags:'wx'}));
}
async function systemDependencies(){
 const needGit=!await available('git'),needFfmpeg=!await available('ffmpeg')||!await available('ffprobe');if(!needGit&&!needFfmpeg)return;
 console.log('Instalando requisitos ausentes (Git/FFmpeg) pelo gerenciador do sistema; pode haver confirmação local.');
 if(process.platform==='darwin')await run('brew',['install',...(needGit?['git']:[]),...(needFfmpeg?['ffmpeg']:[])]);
 else if(process.platform==='win32'){
  for(const id of [...(needGit?['Git.Git']:[]),...(needFfmpeg?['Gyan.FFmpeg']:[])])await run('winget',['install','--id',id,'--exact','--accept-source-agreements','--accept-package-agreements']);
  process.env.PATH=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData/Local'),'Microsoft/WinGet/Links')+path.delimiter+process.env.PATH;
  process.env.PATH=path.join(process.env.ProgramFiles||'C:\\Program Files','Git/cmd')+path.delimiter+process.env.PATH;
 }else if(process.platform==='linux'){
  const prefix=process.getuid?.()===0?[]:['sudo'];const cmd=prefix[0]||'apt-get';
  const packages=[...(needGit?['git']:[]),...(needFfmpeg?['ffmpeg']:[])];await run(cmd,prefix.length?['apt-get','update']:['update']);await run(cmd,[...(prefix.length?['apt-get']:[]),'install','-y',...packages]);
 }else throw Error('Instale FFmpeg e FFprobe e execute novamente.');
 if(!await available('ffmpeg')||!await available('ffprobe')||!await available('git'))throw Error('Git/FFmpeg ainda não estão no PATH. Abra um novo terminal e execute novamente.');
}
async function setupGit(target,revision){
 const url='https://github.com/andrezucatti82-rgb/studio-kit-pro.git',metadata=await fs.lstat(path.join(target,'.git')).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(metadata){
  if(!metadata.isDirectory()||metadata.isSymbolicLink())throw Error('Metadados Git externos não serão alterados.');
  const remote=await run('git',['remote','get-url','origin'],{cwd:target,capture:true});if(remote.stdout.trim()!==url)throw Error('Outro remoto Git foi preservado; use uma pasta nova.');
  const head=await run('git',['rev-parse','--verify','HEAD'],{cwd:target,capture:true}).catch(()=>null);
  if(head){if(head.stdout.trim()!==revision)throw Error('O histórico Git mudou. Preserve seu trabalho e use uma pasta nova.');return;}
 }else{await run('git',['init','--initial-branch=main'],{cwd:target});await run('git',['remote','add','origin',url],{cwd:target});}
 await run('git',['config','remote.origin.promisor','true'],{cwd:target});await run('git',['config','remote.origin.partialclonefilter','blob:none'],{cwd:target});
 await run('git',['fetch','--no-tags','--filter=blob:none','--depth=1','origin',revision],{cwd:target});
 // Mixed reset initializes metadata/index only. Verified working files are preserved.
 await run('git',['reset','--mixed','FETCH_HEAD'],{cwd:target});
}
async function npmCi(cwd){
 // npm.cmd cannot be spawned directly on Windows; invoke its bundled JS CLI.
 if(process.platform==='win32'){const cli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');await fs.access(cli);await run(process.execPath,[cli,'ci','--no-audit','--no-fund'],{cwd});}
 else await run('npm',['ci','--no-audit','--no-fund'],{cwd});
}
export function parseInstallArgs(args){
 const options={freeTools:'all-free'};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(['--system-deps','--prepare-only','--open-tutorial'].includes(key))options[{'--system-deps':'systemDeps','--prepare-only':'prepareOnly','--open-tutorial':'openTutorial'}[key]]=true;
  else if(['--target','--agent','--archive','--manifest','--free-tools'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))options[key==='--free-tools'?'freeTools':key.slice(2)]=args[++i];
  else throw Error('Opção inválida: '+key);
 }
 if(!['base','automation','ai','all-free','none'].includes(options.freeTools))throw Error('Perfil gratuito inválido');
 return options;
}
async function findPython(){
 for(const candidate of (process.platform==='win32'?['python','python3']:['python3','python']))try{await run(candidate,['-c','import sys;sys.exit(sys.version_info<(3,10))'],{capture:true});return candidate;}catch{}
 return null;
}
async function preparePython(){
 let python=await findPython();if(python)return python;
 if(process.platform==='darwin')await run('brew',['install','python']);
 else if(process.platform==='win32')await run('winget',['install','--id','Python.Python.3.12','--exact','--accept-source-agreements','--accept-package-agreements']);
 else if(process.platform==='linux'){
  const command=process.getuid?.()===0?'apt-get':'sudo',prefix=command==='sudo'?['apt-get']:[];
  await run(command,[...prefix,'update']);await run(command,[...prefix,'install','-y','python3','python3-venv']);
 }
 return findPython();
}
export async function freeToolchainReport(cwd,profile='all-free',options={}){
 if(!['base','automation','ai','all-free','none'].includes(profile))throw Error('Perfil gratuito inválido');
 if(profile==='none')return {status:'skipped_by_choice',freeOnly:true,accountsRequired:false};
 const python=Object.hasOwn(options,'python')?options.python:await findPython();
 if(!python)return {status:'blocked_python',freeOnly:true,accountsRequired:false,reason:'Instale Python 3.10+ gratuito com venv e retome a toolchain. Nenhuma chave/API é necessária.'};
 const script=path.join(cwd,'tools/free-vfx/toolchain.py');
 const installed=JSON.parse((await run(python,[script,'install','--root',cwd,'--profile',profile,'--apply'],{cwd,capture:true})).stdout);
 const smoke=JSON.parse((await run(python,[script,'smoke','--root',cwd,'--profile',profile],{cwd,capture:true})).stdout);
 const blocked=smoke.results.filter(r=>!['smoke_passed','startup_passed'].includes(r.status));
 return {status:blocked.length?'partial':'technical_passed',freeOnly:true,accountsRequired:false,installed,smoke,blockers:blocked,creativeApproval:false};
}
export async function installStudio(options){
 const manifest=validateManifest(JSON.parse(await fs.readFile(options.manifest||path.join(here,'install-manifest.json'),'utf8')));
 if(Number(process.versions.node.split('.')[0])<22)throw Error('Use Node.js 22 ou superior.');
 const agent=options.agent||'both';if(!['codex','claude','both'].includes(agent))throw Error('--agent deve ser codex, claude ou both.');
 const target=path.resolve(options.target||path.join(here,'Studio-Kit-Pro-'+manifest.kitVersion)),reportFile=path.join(target,'installation-report.json');
 let work,report,step='source';
 try{
  const exists=await fs.lstat(target).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
  if(exists){
   if(!exists.isDirectory()||exists.isSymbolicLink())throw Error('Destino precisa ser uma pasta própria do instalador.');
   report=JSON.parse(await fs.readFile(reportFile,'utf8').catch(()=>{throw Error('A pasta já existe. Escolha uma pasta nova com --target; seus arquivos foram preservados.');}));
   if(report.sourceRevision!==manifest.sourceRevision)throw Error('Outra versão está instalada. Use uma pasta nova; projetos e versões existentes serão preservados.');
   await verifyTree(target,manifest);
  }else{
   await fs.mkdir(path.dirname(target),{recursive:true});work=await fs.mkdtemp(path.join(path.dirname(target),'.studio-install-'));
   const archive=options.archive?path.resolve(options.archive):path.join(work,'source.tar.gz');
   if(!options.archive){console.log('Baixando o projeto completo do GitHub (inclui referências visuais). Aguarde.');await download(manifest,archive);}
   const listing=await run('tar',['-tzf',archive],{capture:true}),verbose=await run('tar',['-tvzf',archive],{capture:true}),root=archiveRoot(listing.stdout,verbose.stdout);
   if(root!=='studio-kit-pro-'+manifest.sourceRevision)throw Error('Revisão diferente da versão fixada no instalador.');
   await run('tar',['-xzf',archive,'-C',work]);const extracted=path.join(work,root);await verifyTree(extracted,manifest);
   report={version:1,kitVersion:manifest.kitVersion,sourceRevision:manifest.sourceRevision,repository:manifest.repository,status:'source_verified',steps:{source:'passed'},agent,accountsConnected:false,providerCreditsTransferred:false};
   await fs.writeFile(path.join(extracted,'installation-report.json'),JSON.stringify(report,null,2)+'\n');await fs.rename(extracted,target);
  }
  const save=()=>fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');
  if(options.prepareOnly){report.status='source_verified_runtime_pending';await save();return {...report,target};}
  report.status='installing';delete report.error;await save();
  step='system_dependencies';if(options.systemDeps)await systemDependencies();
  if(!await available('ffmpeg')||!await available('ffprobe'))throw Error('Falta FFmpeg/FFprobe. Execute o instalador com --system-deps ou instale-os e retome.');report.steps.systemDependencies='passed';await save();
  step='git';if(!await available('git'))throw Error('Falta Git. Execute com --system-deps ou instale-o e retome.');await setupGit(target,manifest.sourceRevision);report.steps.git='passed';await save();
  step='npm_ci';await npmCi(target);report.steps.dependencies='passed';await save();
  step='skills';
  // Canonical discovery files already belong to the extracted repository. Avoid replacing
  // Claude bridge files: that would change verified source bytes and break safe resume.
  const system=JSON.parse(await fs.readFile(path.join(target,'.agents/skills/video-multimarcas/references/skill-system.json'),'utf8')),ids=system.skills.map(s=>s.id);
  for(const module of system.modules)await fs.access(path.join(target,'.agents/skills/video-multimarcas',module.instructions));
  for(const id of ids){await fs.access(path.join(target,'.agents/skills',id,'SKILL.md'));await fs.access(path.join(target,'.claude/skills',id,'SKILL.md'));}
  report.steps.skills={status:'passed',count:ids.length,internalModules:system.modules.length,discovery:agent};await save();
  step='runtime_check';await run(process.execPath,['scripts/setup-check.mjs'],{cwd:target});report.steps.runtime='passed';await save();
  // Keep a portable Node installation with this project so deleting the downloaded ZIP
  // directory does not remove its runtime. No global PATH/profile changes.
  if(process.execPath.includes(path.join(here,'.studio-tools'))){const nodeRoot=process.platform==='win32'?path.dirname(process.execPath):path.resolve(path.dirname(process.execPath),'..');await fs.cp(nodeRoot,path.join(target,'.studio-tools/node'),{recursive:true});report.portableNode=true;}
  step='free_toolchain';
  const freeProfile=options.freeTools||'all-free';
  try{if(options.systemDeps&&!await findPython())await preparePython();report.steps.freeToolchain=await freeToolchainReport(target,freeProfile);}catch(error){report.steps.freeToolchain={status:'blocked',freeOnly:true,reason:error.message,accountsRequired:false};}
  const toolchainReady=['technical_passed','skipped_by_choice'].includes(report.steps.freeToolchain.status);
  report.status=toolchainReady?'ready':'ready_with_toolchain_blockers';report.next='Abra esta pasta no Codex ou Claude Code; leia o tutorial e envie projeto-video.json com os originais.';await save();
  console.log('\nInstalação do projeto: '+report.status+' — '+target+'\nTutorial: '+path.join(target,'docs/COMECE-AQUI.html')+'\nContas e login do agente são conferidos separadamente.');
  if(options.openTutorial){const tutorial=path.join(target,'docs/COMECE-AQUI.html');try{if(process.platform==='win32')await run('explorer.exe',[tutorial]);else await run(process.platform==='darwin'?'open':'xdg-open',[tutorial]);}catch{console.log('Abra o tutorial pelo caminho acima.');}}
  return {...report,target};
 }catch(error){if(report){report.status='failed';report.error={step,message:error.message};await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n').catch(()=>{});}throw error;}
 finally{if(work)await fs.rm(work,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await installStudio(parseInstallArgs(process.argv.slice(2)));}catch(error){console.error(error.message);process.exitCode=1;}
}
