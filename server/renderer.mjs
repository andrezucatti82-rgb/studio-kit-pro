import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia,renderStill,makeCancelSignal} from '@remotion/renderer';
import {repoRoot} from './skills.mjs';
import {run} from './process.mjs';
export async function renderProduction(edited,work,{signal,onProgress=()=>{},concurrency=2,browserExecutable=process.env.CHROME_PATH}={}) {
 signal?.throwIfAborted();
 const serveUrl=await bundle({entryPoint:path.join(repoRoot,'src/production/index.tsx'),publicDir:edited.publicDir,outDir:path.join(work,'bundle')});
 signal?.throwIfAborted();
 const {cancel,cancelSignal}=makeCancelSignal();signal?.addEventListener('abort',cancel,{once:true});
 try{
  const inputProps={plan:edited.plan};
  const composition=await selectComposition({serveUrl,id:edited.plan.schemaVersion===2?'GdaGraph':'GdaProduction',inputProps,browserExecutable});
  signal?.throwIfAborted();
  const raw=path.join(work,'remotion.mp4'),output=path.join(work,'candidate.mp4');
  await renderMedia({serveUrl,composition,inputProps,outputLocation:raw,codec:'h264',audioCodec:'aac',enforceAudioTrack:true,pixelFormat:'yuv420p',crf:18,browserExecutable,concurrency,cancelSignal,onProgress:({progress})=>onProgress(progress)});
  signal?.throwIfAborted();
  await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',raw,'-map','0:v:0','-map','0:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar','48000','-t',String(composition.durationInFrames/composition.fps),'-movflags','+faststart',output],{signal});
  let start=0;const reviewFrames=new Set();
  for(const s of edited.plan.scenes){for(const frame of [start,start+Math.floor(s.durationFrames/2),start+s.durationFrames-1,start+s.transition.durationFrames])reviewFrames.add(frame);start+=s.durationFrames;}
  for(const frame of [...reviewFrames].filter(f=>f<composition.durationInFrames))await renderStill({serveUrl,composition,inputProps,output:path.join(work,`frame-${frame}.jpg`),frame,imageFormat:'jpeg',browserExecutable,cancelSignal});
  return {output,reviewFrames:[...reviewFrames].sort((a,b)=>a-b)};
 }finally{signal?.removeEventListener('abort',cancel);}
}
