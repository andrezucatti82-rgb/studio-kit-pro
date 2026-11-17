import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {run} from '../server/process.mjs';
import '../style-atlas/dist/workflow.js';
const W=globalThis.AtlasWorkflow,inspectorFile=new URL('../scripts/inspect-media.mjs',import.meta.url);
async function inspector(){assert(await fs.access(inspectorFile).then(()=>true,()=>false),'Missing technical finishing inspector');return import(inspectorFile.href);}
test('finishing has a dedicated registered module before final review',()=>{
 assert(W.skillSystem.skills.some(s=>s.id==='video-tratamento'),'Missing dedicated treatment skill');const r=W.skillRouting({selectedStyles:[]});assert(r.modules.indexOf('video-tratamento')>r.modules.indexOf('video-edicao'));assert(r.modules.indexOf('video-tratamento')<r.modules.indexOf('video-revisao'));
});
test('coverage distinguishes integrated processors, fixed output and unintegrated capabilities',async()=>{
 execFileSync('node',['scripts/build-treatment-docs.mjs','--check'],{stdio:'pipe'});
 const {treatmentCapabilities}=await inspector();const c=treatmentCapabilities;assert.equal(c.groups.length,6);assert(c.items.length>=65);assert.equal(c.items.find(x=>x.id==='hdr').status,'not_integrated');assert.equal(c.items.find(x=>x.id==='grain').status,'integrated');assert.equal(c.items.find(x=>x.id==='master_codecs').status,'not_integrated');assert.equal(c.items.find(x=>x.id==='loudness').status,'partial');
});
test('source inspection preserves metadata uncertainty and flags managed conversions',async()=>{
 const {summarizeProbe}=await inspector();const metadata={format:{format_name:'mov,mp4,m4a,3gp,3g2,mj2',duration:'3'},streams:[{codec_type:'video',codec_name:'hevc',width:3840,height:2160,pix_fmt:'yuv420p10le',color_transfer:'arib-std-b67',color_primaries:'bt2020',sample_aspect_ratio:'1:1',field_order:'progressive',r_frame_rate:'30000/1001',avg_frame_rate:'30000/1001'},{codec_type:'audio',codec_name:'pcm_s24le',sample_rate:'96000',channels:6,channel_layout:'5.1',bits_per_sample:24}]};
 const r=summarizeProbe(metadata);assert.equal(r.video.color.transfer,'arib-std-b67');assert.equal(r.audio.channels,6);assert.equal(r.audio.sampleRate,96000);assert(r.requirements.some(x=>x.code==='managed_color_conversion'));assert(r.requirements.some(x=>x.code==='multichannel_route'));assert.equal(r.review.playback,'not_run');
 delete metadata.streams[0].color_transfer;delete metadata.streams[0].color_primaries;assert.equal(summarizeProbe(metadata).video.color.transfer,null);assert(summarizeProbe(metadata).requirements.some(x=>x.code==='unknown_color_interpretation'));
 metadata.format.size=String(101*1024*1024);metadata.format.duration='3601';const oversized=summarizeProbe(metadata);assert(oversized.requirements.some(x=>x.code==='source_size_exceeds_graph'));assert(oversized.requirements.some(x=>x.code==='source_duration_exceeds_graph'));
 const unknown=summarizeProbe({streams:[{codec_type:'video',bits_per_raw_sample:'0'},{codec_type:'audio',codec_name:'aac',bits_per_sample:0}]});assert.equal(unknown.audio.bitDepthReported,null);assert.equal(unknown.video.bitDepthReported,null);assert.equal(unknown.video.frameRate,null);
});
test('actual probe and loudness inspection leave source bytes intact and make no compliance claim',{timeout:30000},async()=>{
 const {inspectMedia}=await inspector(),root=await fs.mkdtemp(path.join(os.tmpdir(),'treatment-inspect-'));try{const file=path.join(root,'source.mp4');await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=gray:s=320x180:r=30:d=3','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=3','-c:v','libx264','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-x264-params','colorprim=bt709:transfer=bt709:colormatrix=bt709','-c:a','aac','-shortest',file]);const before=await fs.readFile(file);const r=await inspectMedia(file,{measureAudio:true});assert.equal(r.video.codec,'h264');assert.equal(r.video.width,320);assert.equal(r.video.color.primaries,'bt709');assert.equal(r.audio.sampleRate,48000);assert(r.loudness?.input_i);assert.equal(r.compliance,'not_certified');assert.deepEqual(await fs.readFile(file),before);
  const out=path.join(root,'inspection.json');execFileSync('node',['scripts/inspect-media.mjs','--file',file,'--out',out],{stdio:'pipe'});assert.equal(JSON.parse(await fs.readFile(out,'utf8')).source.sha256,r.source.sha256);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
