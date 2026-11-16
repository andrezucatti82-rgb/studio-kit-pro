import fs from 'node:fs/promises';
import path from 'node:path';
import {repoRoot} from './skills.mjs';
import {run} from './process.mjs';
import {digest} from './assets.mjs';
import {writeScore} from './score.mjs';

export async function editGraph(plan,store,work,{signal}={}){
 const publicDir=path.join(work,'public');await fs.mkdir(path.join(publicDir,'fonts'),{recursive:true});
 const fontManifest=JSON.parse(await fs.readFile(path.join(repoRoot,'style-atlas/dist/fonts.json'),'utf8'));
 const fonts=[],fontKeys=new Set(plan.scenes.flatMap(s=>s.layers.filter(l=>l.type==='text').map(l=>`${l.font}:${l.weight}`)));
 fontKeys.add('Geist:400');fontKeys.add('Geist:700');
 fontKeys.add(`${plan.captionFont}:400`);
 for(const key of fontKeys){const [family,weightText]=key.split(':'),weight=Number(weightText);let source,file;
  if(family==='Geist'){file=`Geist-${weight===700?'Bold':'Regular'}.ttf`;source=path.join(repoRoot,'public/fonts',file);}
  else{const entry=fontManifest.files[key];if(!entry)throw Error(`Font file/license must be supplied explicitly: ${key}`);file=path.basename(entry.file);source=path.join(repoRoot,'style-atlas/dist',entry.file);if(digest(await fs.readFile(source))!==entry.sha256)throw Error('Font integrity mismatch');}
  await fs.copyFile(source,path.join(publicDir,'fonts',file));fonts.push({family,weight,src:`fonts/${file}`});
 }
 const media={};let n=0;
 for(const scene of plan.scenes)for(const layer of scene.layers){if(layer.type!=='media')continue;signal?.throwIfAborted();const a=await store.verify(layer.assetId),src=`media-${n++}.${a.kind==='video'?'mp4':a.codec==='png'?'png':a.codec==='webp'?'webp':'jpg'}`;
  if(a.kind==='image')await fs.copyFile(store.file(a.id),path.join(publicDir,src));
  else await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-protocol_whitelist','file,pipe','-ss',String(layer.sourceStartSeconds),'-i',store.file(a.id),'-t',String(scene.durationFrames/plan.output.fps),'-map','0:v:0','-map','0:a:0?','-vf',`fps=${plan.output.fps},scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1`,'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',path.join(publicDir,src)],{signal});
  media[`${scene.id}:${layer.id}`]={src,kind:a.kind};
 }
 const audio=[];for(const [i,track]of plan.audio.tracks.entries()){await store.verify(track.assetId);const src=`audio-${i}.wav`;await run('ffmpeg',['-v','error','-y','-protocol_whitelist','file,pipe',...(track.loop?['-stream_loop','-1']:[]),'-ss',String(track.sourceStartSeconds),'-i',store.file(track.assetId),'-t',String(track.durationFrames/plan.output.fps),'-vn','-ar','48000','-ac','2',path.join(publicDir,src)],{signal});audio.push({...track,src});}
 // Always supply an audio stream; explicitly silent when the approved plan has no sound.
 let score={origin:'approved audio tracks',tracks:plan.audio.tracks.map(t=>({assetId:t.assetId,role:t.role}))},musicSrc;
 if(plan.audio.proceduralScore){musicSrc='score.wav';score=await writeScore(path.join(publicDir,musicSrc),plan);}
 else if(!audio.length&&!plan.scenes.some(s=>s.layers.some(l=>l.type==='media'&&l.volume>0))){musicSrc='silence.wav';await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',String(plan.output.durationFrames/plan.output.fps),path.join(publicDir,musicSrc)],{signal});score={origin:'explicitly silent approved plan'};}
 return {publicDir,score,plan:{...plan,media,renderAudio:audio,fontSources:fonts,musicSrc}};
}
