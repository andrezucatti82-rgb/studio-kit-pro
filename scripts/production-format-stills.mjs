import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {AssetStore} from '../server/assets.mjs';
import {editMedia} from '../server/editor.mjs';
import {validatePlan,dimensions} from '../server/schema.mjs';
import {repoRoot} from '../server/skills.mjs';
const args=process.argv.slice(2),arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
if(!args.includes('--root')||!args.includes('--job'))throw Error('Use --root projects/poc --job completed-job-id');
const root=path.resolve(arg('--root')),id=arg('--job');if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job ID');
const jobDir=path.join(root,'jobs',id),job=JSON.parse(await fs.readFile(path.join(jobDir,'job.json'),'utf8'));
if(job.state!=='completed')throw Error('Use a completed engineering job');
const plan=JSON.parse(await fs.readFile(path.join(jobDir,'edit-plan.json'),'utf8')),store=new AssetStore(path.join(root,'assets'));
const out=path.resolve(arg('--out',path.join(root,'format-qa'))),work=path.join(out,'work');await fs.mkdir(out,{recursive:true});
try{
 const edited=await editMedia(plan,store,work),serveUrl=await bundle({entryPoint:path.join(repoRoot,'src/production/index.tsx'),publicDir:edited.publicDir,outDir:path.join(work,'bundle')});
 const assets=await Promise.all(job.request.assetIds.map(id=>store.verify(id))),records=[];
 for(const [format,[width,height]]of Object.entries(dimensions)){
  const variant={...plan,output:{...plan.output,format,width,height}};validatePlan(variant,assets,{...job.request,format});
  const inputProps={plan:{...edited.plan,...variant}},browserExecutable=process.env.CHROME_PATH;
  const composition=await selectComposition({serveUrl,id:'DiStevenProduction',inputProps,browserExecutable});
  for(const frame of [90,792]){const file=`${format.replace(':','x')}-${frame}.jpg`;await renderStill({serveUrl,composition,inputProps,output:path.join(out,file),frame,imageFormat:'jpeg',browserExecutable});records.push({format,width,height,frame,file});}
 }
 await fs.writeFile(path.join(out,'format-results.json'),JSON.stringify({status:'stills_rendered',records,continuousPlayback:'not_run',listening:'not_run'},null,2)+'\n');console.log(JSON.stringify(records));
}finally{await fs.rm(work,{recursive:true,force:true});}
