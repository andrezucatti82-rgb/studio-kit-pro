// Download-only release update. Never uploads index.html, scripts, styles or navigation.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const assets=['downloads/studio-kit-pro-installer.zip','installation.json','como-instalar.html'];
const sha=b=>createHash('sha256').update(b).digest('hex');
export function downloadTargets(html){
 const releases=new Set([...html.matchAll(/(?:href|src)=["']\/?(atlas-\d{14})\//g)].map(m=>m[1]));
 if(releases.size!==1)throw Error('Cannot identify exactly one active static release; no file modified');
 const release=[...releases][0];return assets.map(p=>release+'/'+p);
}
async function main(){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],apply=args.includes('--apply');
 const domain=get('--domain'),source=path.resolve(args.includes('--source')?get('--source'):'style-atlas/dist');
 if(domain!=='videos.gerenciadordeanuncios.com.br')throw Error('Only the authorized studio-kit-pro domain is allowed');
 const {CPANEL_HOST:host,CPANEL_USER:user,CPANEL_TOKEN:token}=process.env;
 if(!host||!user||!token||!/^[a-z0-9.-]+(?::2083)?$/i.test(host))throw Error('cPanel host, user and token required in environment');
 const base=`https://${host.replace(/:2083$/,'')}:2083`,headers={Authorization:`cpanel ${user}:${token}`};
 async function api(module,fn,params={}){
  const url=new URL(`/execute/${module}/${fn}`,base);for(const[k,v]of Object.entries(params))url.searchParams.set(k,String(v));
  const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(45000)}),raw=await r.json(),j=raw.result||raw;
  if(!r.ok||j.status!==1)throw Error(`cPanel ${module}/${fn} failed (HTTP ${r.status})`);return j.data;
 }
 async function upload(dir,name,bytes){
  const form=new FormData();form.set('dir',dir);form.set('overwrite','1');form.set('file-1',new Blob([bytes]),name);
  const r=await fetch(base+'/execute/Fileman/upload_files',{method:'POST',headers,body:form,redirect:'error',signal:AbortSignal.timeout(90000)}),raw=await r.json(),j=raw.result||raw;
  if(!r.ok||j.status!==1||j.data?.uploads?.[0]?.status!==1)throw Error('Upload failed: '+name);
 }
 async function publicBytes(rel=''){
  const r=await fetch(`https://${domain}/${rel}?freevfx=${Date.now()}`,{headers:{'Accept-Encoding':'identity','Cache-Control':'no-cache'},redirect:'error',signal:AbortSignal.timeout(45000)});
  if(r.status===404)return null;if(!r.ok)throw Error('Public read failed: '+rel+' HTTP '+r.status);return Buffer.from(await r.arrayBuffer());
 }
 const info=await api('DomainInfo','single_domain_data',{domain});
 const root=path.posix.normalize(info.documentroot||''),home=path.posix.normalize(info.homedir||'');
 if(info.domain!==domain||!home.startsWith('/home')||!root.startsWith(home+'/')||root===home+'/public_html')throw Error('Unverified or shared domain root');
 const meta=JSON.parse(await fs.readFile(path.join(source,'installation.json'),'utf8'));
 const zip=await fs.readFile(path.join(source,assets[0]));if(!meta.sourceReady||meta.download!==assets[0]||meta.sha256!==sha(zip)||meta.bytes!==zip.length)throw Error('Installer source/hash not ready');
 const payloads=await Promise.all(assets.map(p=>fs.readFile(path.join(source,p))));
 const backup=path.posix.join(home,'gda-toolchain-backups',new Date().toISOString().replace(/[^0-9]/g,''));
 const receipt={domain,kitVersion:meta.kitVersion,sourceRevision:meta.sourceRevision,scope:'installer/tutorial/metadata only; interface untouched',mode:apply?'apply':'inspect',releases:[],files:[]};
 // If a concurrent UI deployment changes the active release, update the new download route too.
 for(let attempt=0;attempt<3;attempt++){
  const before=await publicBytes(),targets=downloadTargets(before.toString('utf8')),release=targets[0].split('/')[0];
  if(receipt.releases.includes(release))break;
  const old=await Promise.all(targets.map(p=>publicBytes(p)));
  if(!apply){console.log(JSON.stringify({...receipt,targets,interfaceSha256:sha(before)},null,2));return;}
  for(let i=0;i<assets.length;i++){
   const rel=targets[i];if(!assets.some(a=>rel===release+'/'+a))throw Error('Non-download path rejected');
   if(old[i])await upload(path.posix.join(backup,path.posix.dirname(rel)),path.posix.basename(rel),old[i]);
   await upload(path.posix.join(root,path.posix.dirname(rel)),path.posix.basename(rel),payloads[i]);
   const found=await publicBytes(rel);if(!found||sha(found)!==sha(payloads[i]))throw Error('Download readback mismatch: '+rel);
   receipt.files.push({path:rel,sha256:sha(found),previousSha256:old[i]?sha(old[i]):null});
  }
  receipt.releases.push(release);const after=await publicBytes();
  if(sha(before)===sha(after)){receipt.interfaceUnchangedDuringUpdate=true;break;}
  receipt.concurrentInterfaceChangeObserved=true;
 }
 if(!receipt.interfaceUnchangedDuringUpdate)throw Error('Interface kept changing; downloads were updated but active release needs a new readback');
 await fs.mkdir('deployment-backup',{recursive:true});await fs.writeFile('deployment-backup/free-toolchain-downloads.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
