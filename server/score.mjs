import fs from 'node:fs/promises';
// Original procedural music/SFX. Based on the kit's event-envelope score approach,
// independent of previous voices, music files, generators or paid APIs.
export async function writeScore(file,plan){
 const sampleRate=48000,seconds=plan.output.durationFrames/plan.output.fps,n=Math.round(seconds*sampleRate),samples=new Float32Array(n);
 const notes=[220,261.63,329.63,392],beat=60/plan.audio.bpm;
 function event(start,duration,freq,amp){const offset=Math.round(start*sampleRate),count=Math.min(n-offset,Math.round(duration*sampleRate));for(let i=0;i<count;i++){const t=i/sampleRate,env=(1-Math.exp(-t*90))*Math.exp(-t/(duration*.24));samples[offset+i]+=amp*env*(Math.sin(2*Math.PI*freq*t)+.18*Math.sin(4*Math.PI*freq*t));}}
 for(let j=0;j*beat<seconds-.6;j++){event(j*beat,1.1,notes[j%4],.2);event(j*beat,.2,55,.12);}
 let cursor=0;for(const scene of plan.scenes){event(cursor+.6,.15,700,.13);cursor+=scene.durationFrames/plan.output.fps;}
 const pcm=Buffer.alloc(44+n*4);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(2,22);pcm.writeUInt32LE(sampleRate,24);pcm.writeUInt32LE(sampleRate*4,28);pcm.writeUInt16LE(4,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){const t=i/sampleRate,fade=Math.min(1,t/.1,(seconds-t)/.8),value=Math.round(Math.max(-.9,Math.min(.9,samples[i]*fade))*32767);pcm.writeInt16LE(value,44+i*4);pcm.writeInt16LE(value,46+i*4);}
 await fs.writeFile(file,pcm);
 return {origin:'original procedural composition',license:'MIT',bpm:plan.audio.bpm,sampleRate,durationSeconds:seconds,voice:'none'};
}
