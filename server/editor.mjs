import fs from 'node:fs/promises';
import path from 'node:path';
import {repoRoot} from './skills.mjs';
import {run} from './process.mjs';
import {writeScore} from './score.mjs';
export async function editMedia(plan,store,work,{signal}={}){
 const publicDir=path.join(work,'public');await fs.mkdir(path.join(publicDir,'fonts'),{recursive:true});
 for(const font of ['Geist-Regular.ttf','Geist-Bold.ttf'])await fs.copyFile(path.join(repoRoot,'public/fonts',font),path.join(publicDir,'fonts',font));
 const media=[];
 for(const [i,scene] of plan.scenes.entries()){
  signal?.throwIfAborted();const asset=await store.verify(scene.assetId);
  const src=`shot-${i}.${asset.kind==='video'?'mp4':asset.codec==='png'?'png':asset.codec==='webp'?'webp':'jpg'}`;
  if(asset.kind==='image')await fs.copyFile(store.file(asset.id),path.join(publicDir,src));
  else await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-ss',String(scene.sourceStartSeconds),'-i',store.file(asset.id),'-t',String(scene.durationFrames/plan.output.fps),'-map','0:v:0','-map','0:a:0?','-vf',`fps=${plan.output.fps},scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1`,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-af','afade=t=in:d=0.025,areverse,afade=t=in:d=0.025,areverse','-movflags','+faststart',path.join(publicDir,src)],{signal});
  media.push({src,kind:asset.kind,hasAudio:asset.hasAudio});
 }
 const musicSrc='score.wav';let score;
 if(plan.audio.proceduralScore)score=await writeScore(path.join(publicDir,musicSrc),plan);
 else {await store.verify(plan.audio.musicAssetId);await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-stream_loop','-1','-i',store.file(plan.audio.musicAssetId),'-t',String(plan.output.durationFrames/plan.output.fps),'-vn','-af',`afade=t=in:d=0.2,afade=t=out:st=${plan.output.durationFrames/plan.output.fps-.8}:d=0.8`,'-ar','48000','-ac','2',path.join(publicDir,musicSrc)],{signal});score={origin:'user-supplied licensed track',assetId:plan.audio.musicAssetId};}
 return {plan:{...plan,media,musicSrc},publicDir,score};
}
