import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {probe,run} from '../server/process.mjs';

export const treatmentCapabilities=JSON.parse(await fs.readFile(new URL('../.agents/skills/video-multimarcas/references/skill-modules/video-tratamento/references/capabilities.json',import.meta.url),'utf8'));
const number=value=>value!==undefined&&value!==null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const known=value=>value&&value!=='unknown'&&value!=='unspecified'?value:null;
const positive=value=>{const n=number(value);return n>0?n:null;};
const rate=value=>{const [a,b='1']=String(value??'').split('/').map(Number);return Number.isFinite(a)&&Number.isFinite(b)&&a>0&&b>0?a/b:null;};
export function summarizeProbe(metadata){
 const videos=(metadata.streams||[]).filter(s=>s.codec_type==='video'&&!s.disposition?.attached_pic),audios=(metadata.streams||[]).filter(s=>s.codec_type==='audio');
 const videoStream=s=>({index:s.index??null,codec:s.codec_name??null,profile:s.profile??null,width:number(s.width),height:number(s.height),pixelFormat:s.pix_fmt??null,bitDepthReported:positive(s.bits_per_raw_sample)||positive(s.bits_per_sample),sampleAspectRatio:known(s.sample_aspect_ratio),displayAspectRatio:known(s.display_aspect_ratio),frameRate:rate(s.avg_frame_rate),nominalFrameRate:rate(s.r_frame_rate),frameRateRatio:s.avg_frame_rate??null,fieldOrder:known(s.field_order),bitrate:number(s.bit_rate),timeBase:s.time_base??null,startTime:number(s.start_time),color:{primaries:known(s.color_primaries),transfer:known(s.color_transfer),matrix:known(s.color_space),range:known(s.color_range)},timecode:s.tags?.timecode??null});
 const audioStream=s=>({index:s.index??null,codec:s.codec_name??null,sampleRate:number(s.sample_rate),sampleFormat:s.sample_fmt??null,bitDepthReported:positive(s.bits_per_raw_sample)||positive(s.bits_per_sample),channels:number(s.channels),channelLayout:known(s.channel_layout),bitrate:number(s.bit_rate),timeBase:s.time_base??null,startTime:number(s.start_time)});
 const video=videos[0]?videoStream(videos[0]):null,audio=audios[0]?audioStream(audios[0]):null,requirements=[];
 const need=(code,detail)=>{if(!requirements.some(x=>x.code===code))requirements.push({code,detail});};
 for(const s of videos){const v=videoStream(s);
  if(!v.color.primaries||!v.color.transfer||!v.color.matrix)need('unknown_color_interpretation','Confirmar interpretação de cor da fonte; metadados ausentes não autorizam assumir Rec.709.');
  if(v.color.transfer&&v.color.transfer!=='bt709'||v.color.primaries&&v.color.primaries!=='bt709'||v.color.matrix&&v.color.matrix!=='bt709')need('managed_color_conversion','Confirmar conversão de cor fora do ajuste global do grafo; PQ/HLG/Log e outros espaços não têm tratamento gerenciado nativo.');
  if(v.fieldOrder&&v.fieldOrder!=='progressive')need('scan_review','Conferir desentrelaçamento em ferramenta adequada antes de importar.');
  if(v.sampleAspectRatio&&v.sampleAspectRatio!=='1:1')need('pixel_aspect_review','Conferir DAR e normalizar pixels não quadrados sem distorcer a geometria.');
  if(v.width>3840||v.height>3840)need('source_dimensions_exceed_graph','A fonte excede o limite dimensional atual do importador; preparar intermediário adequado.');
  if(v.frameRate&&!([24,30].includes(v.frameRate)))need('frame_rate_conversion','O grafo atual entrega 24 ou 30 FPS; definir cadência de conversão e conferir movimento.');
 }
 if(audios.some(s=>s.channels>2))need('multichannel_route','O grafo converte áudio para estéreo; definir mix/layout em rota externa se multicanal for necessário.');
 if(videos.length>1||audios.length>1)need('stream_selection','Há múltiplos streams; confirmar seleção e idiomas antes da produção.');
 if(number(metadata.format?.duration)>3600)need('source_duration_exceeds_graph','A fonte excede 3600 s; preparar trecho/intermediário adequado ao importador.');
 if(number(metadata.format?.size)>100*1024*1024)need('source_size_exceeds_graph','A fonte excede 100 MiB; preparar intermediário adequado ao importador.');
 return {version:1,container:{format:metadata.format?.format_name??null,durationSeconds:number(metadata.format?.duration),bitrate:number(metadata.format?.bit_rate),timecode:metadata.format?.tags?.timecode??null},video,audio,streams:{video:videos.map(videoStream),audio:audios.map(audioStream)},requirements,review:{playback:'not_run',listening:'not_run',creativeApproval:'not_run'},compliance:'not_certified',limitations:['Tags não comprovam interpretação de cor, VFR, Dolby Vision, qualidade perceptual ou conformidade.','Bits ausentes permanecem desconhecidos; pixelFormat ajuda o diagnóstico, sem inventar precisão.','O relatório não transforma mídia nem aplica correções.']};
}
export async function inspectMedia(file,{measureAudio=false}={}){
 const absolute=path.resolve(file),stat=await fs.stat(absolute);if(!stat.isFile())throw Error('Source must be a local regular file');
 const sha=createHash('sha256');for await(const chunk of createReadStream(absolute))sha.update(chunk);
 const result={...summarizeProbe(await probe(absolute)),source:{name:path.basename(absolute),bytes:stat.size,sha256:sha.digest('hex')}};
 if(measureAudio&&result.audio){const {stderr}=await run('ffmpeg',['-hide_banner','-nostdin','-protocol_whitelist','file,pipe','-i',absolute,'-map',`0:${result.audio.index??'a:0'}`,'-vn','-sn','-dn','-af','loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json','-f','null','-'],{timeout:600000});const match=stderr.match(/\{\s*"input_i"[\s\S]*?\}/);if(!match)throw Error('Loudness measurement missing');const data=JSON.parse(match[0]);result.loudness=Object.fromEntries(['input_i','input_tp','input_lra','input_thresh'].map(k=>[k,data[k]]));result.loudness.note='Medição do primeiro stream; não é master corrigido nem certificação do destino.';}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i++){const key=args[i];if(key==='--measure-audio')options.measureAudio=true;else if(['--file','--out'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))options[key.slice(2)]=args[++i];else throw Error('Usage: node scripts/inspect-media.mjs --file LOCAL_MEDIA [--measure-audio] [--out NEW_REPORT.json]');}if(!options.file)throw Error('--file is required');const result=await inspectMedia(options.file,options),body=JSON.stringify(result,null,2)+'\n';if(options.out)await fs.writeFile(path.resolve(options.out),body,{flag:'wx'});else process.stdout.write(body);
 }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
