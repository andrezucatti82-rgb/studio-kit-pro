import fs from 'node:fs/promises';
import {digest} from './assets.mjs';
import {probe,run} from './process.mjs';
export const frameRate=raw=>{const [n,d=1]=String(raw).split('/').map(Number);return d>0?n/d:NaN;};
export async function validateVideo(file,plan,{signal}={}){
 const bytes=await fs.readFile(file);if(bytes.length===0)throw Error('Empty MP4');
 const metadata=await probe(file,{signal}),v=metadata.streams.find(s=>s.codec_type==='video'),a=metadata.streams.find(s=>s.codec_type==='audio');
 const duration=Number(metadata.format.duration),expected=plan.output.durationFrames/plan.output.fps;
 // FFprobe names full-range H.264 4:2:0 yuvj420p and limited-range 4:2:0 yuv420p.
 const checks={nonempty:true,duration:Math.abs(duration-expected)<=1/plan.output.fps+.05,resolution:v?.width===plan.output.width&&v?.height===plan.output.height,fps:Math.abs(frameRate(v?.r_frame_rate)-plan.output.fps)<.001,codec:v?.codec_name==='h264',audio:a?.codec_name==='aac',frames:Number(v?.nb_frames)===plan.output.durationFrames,pixelFormat:['yuv420p','yuvj420p'].includes(v?.pix_fmt)};
 if(Object.values(checks).some(ok=>!ok))throw Error(`Output does not match plan: ${JSON.stringify(checks)}`);
 await run('ffmpeg',['-hide_banner','-v','error','-xerror','-i',file,'-f','null','-'],{signal,timeout:120000});
 const {stderr}=await run('ffmpeg',['-hide_banner','-nostats','-i',file,'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json','-f','null','-'],{signal});
 const metrics=stderr.match(/\{\s*"input_i"[\s\S]*?\}/)?.[0];
 return {schemaVersion:1,status:'passed',sha256:digest(bytes),bytes:bytes.length,metadata,checks:{...checks,decode:true},loudness:metrics?JSON.parse(metrics):null,creativeReview:'review_pending',playback:'not_run',listening:'not_run',note:'Technical validation and extracted frames do not certify aesthetic or audio quality.'};
}
