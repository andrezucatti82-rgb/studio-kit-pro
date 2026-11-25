import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {assetOutputs,clipAspects,clipOutput,editOutputs, limits, validateProject,validClipSettings} from '../style-atlas/dist/zapvideo-contract.mjs';
import {readSrt} from '../style-atlas/dist/zapvideo-captions.mjs';
import {assemblyOutput,assemblyPlan} from '../style-atlas/dist/zapvideo-assembly.mjs';

const formats = new Set(['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2', 'matroska', 'webm']);
const tool = name => process.env[name.toUpperCase() + '_PATH'] || name;
const ffmpegInput = ['-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm'];

async function run(name, args, {cwd, signal, timeout = 12 * 60_000} = {}) {
  signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout);
  return new Promise((resolve, reject) => {
    const child = spawn(tool(name), args, {cwd, windowsHide: true, signal, stdio: ['ignore','pipe','pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-262144); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-8192); });
    child.on('error', error => reject(new Error(error.code === 'ENOENT' ?
      `${name} indisponível. Use o instalador do Studio Kit Pro.` :
      `${name} interrompido.`, {cause: error})));
    child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`${name} não conseguiu processar o arquivo.`, {cause: stderr})));
  });
}

function formatTime(value) {
  const parts = [value / 3600000, value / 60000 % 60, value / 1000 % 60].map(n => String(Math.floor(n)).padStart(2,'0'));
  return parts.join(':') + ',' + String(value % 1000).padStart(3,'0');
}

function writeSrt(cues, start = 0, end = Infinity) {
  return cues.filter(c => c.end > start && c.start < end).map((c, i) =>
    `${i + 1}\n${formatTime(Math.max(c.start, start) - start)} --> ${formatTime(Math.min(c.end, end) - start)}\n${c.text}\n`).join('\n');
}

export async function probeVideo(file, signal) {
  const raw = await run('ffprobe', ['-v','error',...ffmpegInput,'-show_streams','-show_format','-of','json',file], {signal, timeout: 30_000});
  const {streams, format} = JSON.parse(raw);
  const video = streams.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = streams.find(s => s.codec_type === 'audio');
  const duration = Number(video?.duration === 'N/A' || video?.duration === undefined ? format.duration : video.duration);
  if (!video || !format.format_name.split(',').some(name => formats.has(name)) || !Number.isFinite(duration) ||
    duration <= 0 || duration > limits.seconds + 0.1 || video.width < 2 || video.height < 2 ||
    video.width * video.height > 4096 * 2160 || Number(audio?.channels) > 8) {
    throw new Error('Vídeo incompatível. Confira formato, duração e resolução.');
  }
  return {video, audio, duration};
}

function videoFilters(cut, treatment, subtitles) {
  const filters = ['scale=w=trunc(iw*sar/2)*2:h=ih','setsar=1'];
  if (cut) {
    filters.push("scale=w=720:h=1280:force_original_aspect_ratio=increase:force_divisible_by=2",
      `crop=720:1280:(in_w-out_w)*${cut.x}:(in_h-out_h)*${cut.y}`);
  } else {
    filters.push('scale=w=trunc(iw/2)*2:h=trunc(ih/2)*2');
  }
  if (treatment) filters.push(`eq=brightness=${treatment.brightness}:contrast=${treatment.contrast}:saturation=${treatment.saturation}`);
  if (subtitles) filters.push("subtitles=legendas-temporarias.srt:force_style='FontName=Arial,FontSize=19,Outline=2,Alignment=2,MarginV=24'");
  filters.push('fps=30', 'format=yuv420p');
  return filters.join(',');
}

async function checksum(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function renderClipCandidate(settings, source, directory, signal) {
  if (!validClipSettings(settings)) throw new Error('Formato ou duração do clipe inválido.');
  const [width,height]=settings.aspect==='9:16'?[720,1280]:[1280,720];
  await fs.mkdir(directory);
  const output=path.join(directory,clipOutput.name);
  if (source) {
    await fs.copyFile(source,output);
  } else {
    await run('ffmpeg',['-nostdin','-v','error','-f','lavfi',
      '-i',`testsrc2=size=${width}x${height}:rate=24:duration=${settings.seconds}`,
      '-f','lavfi','-i',`sine=frequency=440:sample_rate=48000:duration=${settings.seconds}`,
      '-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-preset','ultrafast','-crf','24',
      '-c:a','aac','-movflags','+faststart','-shortest','-n',output],{signal,timeout:90_000});
  }
  const {video,audio,duration}=await probeVideo(output,signal);
  if (video.width!==width || video.height!==height || video.codec_name!=='h264' || video.pix_fmt!=='yuv420p' ||
    audio?.codec_name!=='aac' || Math.abs(duration-settings.seconds)>0.15 ||
    video.side_data_list?.some(item=>item.rotation)) throw new Error('O clipe não corresponde ao formato, ao áudio ou à duração solicitados.');
  await run('ffmpeg',['-nostdin','-v','error','-xerror','-threads','2',...ffmpegInput,'-i',output,'-map','0','-f','null','-'],
    {signal,timeout:60_000});
  return {status:'review_pending',outputs:[{...clipOutput,width,height,audio:true,duration,
    bytes:(await fs.stat(output)).size,sha256:await checksum(output)}]};
}

export async function verifyMediaAsset(settings,source,directory,signal) {
  const {kind,aspect}=settings;
  if (!Object.hasOwn(assetOutputs,kind) || (kind==='frame' && !clipAspects.includes(aspect))) throw new Error('Formato de material inválido.');
  const spec=assetOutputs[kind];
  const output=path.join(directory,spec.name);
  await fs.mkdir(directory);
  if (source) {
    await fs.copyFile(source,output);
  } else {
    const size=aspect==='9:16'?'720x1280':'1280x720';
    const filters=kind==='frame' ? ['-f','lavfi','-i',`testsrc2=size=${size}:rate=1`,'-frames:v','1','-q:v','4','-update','1'] :
      kind==='speech' ? ['-f','lavfi','-i','sine=frequency=420:sample_rate=24000:duration=3','-c:a','pcm_s16le'] :
        ['-f','lavfi','-i','sine=frequency=220:sample_rate=44100:duration=30',
          '-f','lavfi','-i','sine=frequency=329.63:sample_rate=44100:duration=30',
          '-filter_complex','amix=inputs=2:normalize=1','-ac','2','-c:a','libmp3lame','-b:a','96k'];
    await run('ffmpeg',['-nostdin','-v','error','-n','-threads','1',...filters,'-threads','1',output],{signal,timeout:60_000});
  }
  const input=['-protocol_whitelist','file,pipe','-format_whitelist',kind==='frame'?'jpeg_pipe,image2':kind==='speech'?'wav':'mp3'];
  const {streams,format}=JSON.parse(await run('ffprobe',['-v','error',...input,'-show_streams','-show_format','-of','json',output],
    {signal,timeout:20_000}));
  const [stream]=streams;
  const bytes=(await fs.stat(output)).size;
  let properties;
  if (kind==='frame') {
    const [w,h]=aspect.split(':').map(Number);
    if (streams.length!==1 || stream.codec_name!=='mjpeg' || stream.width<300 || stream.height<300 ||
      stream.width*stream.height>4096**2 || Math.abs((stream.width/stream.height)/(w/h)-1)>0.02 ||
      bytes>2*1024**2) throw new Error('Quadro incompatível com a proporção ou tamanho solicitado.');
    properties={width:stream.width,height:stream.height};
  } else {
    const duration=Number(format.duration);
    const expected=kind==='speech'?{codec:'pcm_s16le',rate:24000,channels:1}:{codec:'mp3',rate:44100,channels:2};
    if (streams.length!==1 || stream.codec_name!==expected.codec || Number(stream.sample_rate)!==expected.rate ||
      stream.channels!==expected.channels || !Number.isFinite(duration) || duration<=0 || duration>170 ||
      (kind==='music' && Math.abs(duration-30)>1) || bytes>8*1024**2) throw new Error('Áudio incompatível com o formato solicitado.');
    properties={duration,channels:stream.channels,sampleRate:expected.rate};
  }
  await run('ffmpeg',['-nostdin','-v','error','-xerror','-threads','1',...input,'-i',output,'-map','0','-f','null','-'],
    {signal,timeout:60_000});
  return {status:'review_pending',outputs:[{...spec,...properties,bytes,sha256:await checksum(output)}]};
}

const fps=30;
const seconds=frames=>frames/fps;
const milliseconds=frames=>Math.round(seconds(frames)*1000);
function escapeAss(value) {
  return value.replace(/[{}\\\r\n\x00-\x1f]/g,' ');
}
async function titleFile(directory,text,width,height) {
  const data=`[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Title,Arial,${Math.round(Math.min(width,height)*0.066)},&H00FFFFFF,&H00000000,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,1,3,1,8,38,38,65,1
[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
Dialogue: 0,0:00:00.00,0:10:00.00,Title,,0,0,0,,{\\fad(180,240)}${escapeAss(text)}
`;
  await fs.writeFile(path.join(directory,'title.ass'),data);
}
async function audioDuration(file,signal) {
  const {streams,format}=JSON.parse(await run('ffprobe',['-v','error','-protocol_whitelist','file,pipe',
    '-format_whitelist','wav,mp3,mov,aac','-show_streams','-show_format','-of','json',file],{signal,timeout:20_000}));
  const duration=Number(format.duration);
  if (!Number.isFinite(duration) || duration<=0 || duration>900 || !streams.some(stream=>stream.codec_type==='audio')) {
    throw new Error('Faixa de áudio incompatível.');
  }
  return duration;
}
const audioInput=['-protocol_whitelist','file,pipe','-format_whitelist','wav,mp3,mov,aac'];
async function stillInput(file) {
  const input=await fs.open(file,'r');
  const header=Buffer.alloc(12);
  try {await input.read(header);} finally {await input.close();}
  const codec=header[0]===255 && header[1]===216 && header[2]===255?'mjpeg':
    header[0]===137 && header.toString('ascii',1,4)==='PNG'?'png':
      header.toString('ascii',0,4)==='RIFF' && header.toString('ascii',8,12)==='WEBP'?'webp':null;
  if (!codec) throw new Error('Imagem da montagem incompatível.');
  return ['-protocol_whitelist','file,pipe','-pattern_type','none','-loop','1','-f','image2','-c:v',codec];
}

export async function renderAssembly(raw,phase,inputs,directory,signal) {
  if (!['sample','full'].includes(phase)) throw new Error('Fase de montagem inválida.');
  const timeline=assemblyPlan(raw);
  const span=phase==='sample'?timeline.sample:{start:0,end:timeline.totalFrames};
  const width=timeline.aspect==='9:16'?720:1280, height=timeline.aspect==='9:16'?1280:720;
  const total=span.end-span.start, duration=seconds(total);
  const lookup=async id=>{
    const file=inputs[id];
    if (!file || !(await fs.stat(file)).isFile()) throw new Error('Material ausente na montagem.');
    return path.resolve(file);
  };
  const out=path.resolve(directory);
  await fs.mkdir(out);
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'zapvideo-assembly-'));
  try {
    const parts=[];
    const localShots=timeline.shots.filter(shot=>shot.start+shot.frames>span.start && shot.start<span.end);
    for (const [index,shot] of localShots.entries()) {
      const source=await lookup(shot.id);
      const offset=Math.max(0,span.start-shot.start);
      const length=seconds(Math.min(shot.start+shot.frames,span.end)-shot.start-offset);
      const image=shot.type==='image';
      let audio;
      let videoIndex;
      if (!image) {
        const probe=await probeVideo(source,signal);
        audio=shot.audio?probe.audio:null;
        videoIndex=probe.video.index;
        if (probe.duration+0.045<seconds(shot.frames)) throw new Error('A tomada é mais curta que o tempo marcado no plano '+(index+1)+'.');
      }
      const filters=[`scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,'setsar=1'];
      if (shot.motion) filters.push(`zoompan=z='min(1.0012+(on+${offset})*0.0012,1.12)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${width}x${height}:fps=30`);
      filters.push('fps=30','format=yuv420p');
      if (shot.overlay) {
        await titleFile(work,shot.overlay,width,height);
        filters.push('subtitles=title.ass');
      }
      const name='part-'+index+'.mp4';
      const sourceInput=image?await stillInput(source):ffmpegInput;
      await run('ffmpeg',['-nostdin','-v','error','-xerror','-n','-threads','2','-filter_threads','2',...sourceInput,...(!image&&offset?['-ss',String(seconds(offset))]:[]),'-i',source,
        ...(!audio?['-f','lavfi','-i','anullsrc=r=48000:cl=stereo']:[]),
        '-t',String(length),'-map',image?'0:v:0':`0:${videoIndex}`,'-map',audio?`0:${audio.index}`:'1:a:0',
        '-vf',filters.join(','),'-af','aresample=48000,apad','-c:v','libx264','-preset','veryfast','-crf','20',
        '-threads','2','-c:a','aac','-ar','48000','-ac','2',name],{cwd:work,signal});
      parts.push(`file '${name}'`);
    }
    await fs.writeFile(path.join(work,'parts.txt'),parts.join('\n')+'\n');
    const args=['-nostdin','-v','error','-xerror','-n','-filter_threads','2','-filter_complex_threads','2',
      '-f','concat','-safe','1','-protocol_whitelist','file,pipe','-i','parts.txt'];
    const tracks=[];
    for (const track of timeline.narrations.filter(item=>item.start+item.frames>span.start&&item.start<span.end)) {
      const source=await lookup(track.id);
      const duration=await audioDuration(source,signal);
      if (duration>seconds(track.frames)+0.08) {
        throw new Error('A narração é mais longa que a cena. Ajuste os tempos antes de montar.');
      }
      const offset=Math.max(0,span.start-track.start);
      if (duration<=seconds(offset)) continue;
      args.push(...audioInput,...(offset?['-ss',String(seconds(offset))]:[]),'-i',source);
      tracks.push(`aresample=48000,adelay=${milliseconds(Math.max(0,track.start-span.start))}:all=1`);
    }
    if (timeline.music) {
      const source=await lookup(timeline.music);
      await audioDuration(source,signal);
      args.push(...audioInput,'-ss',String(seconds(span.start)),'-i',source);
      tracks.push('aresample=48000,volume=0.13');
    }
    const filters=tracks.map((filter,index)=>`[${index+1}:a:0]${filter}[a${index}]`);
    const labels=['[0:a:0]',...tracks.map((_,index)=>`[a${index}]`)].join('');
    if (tracks.length) filters.push(`${labels}amix=inputs=${tracks.length+1}:duration=first:normalize=0,alimiter=limit=0.9[aout]`);
    let captions='';
    if (timeline.captions) {
      const file=await lookup(timeline.captions);
      const cues=readSrt(new TextDecoder('utf-8',{fatal:true}).decode(await fs.readFile(file)),seconds(timeline.totalFrames));
      captions=writeSrt(cues,milliseconds(span.start),milliseconds(span.end));
    }
    if (captions) {
      await fs.writeFile(path.join(work,'assembly.srt'),captions);
      args.push('-vf',"subtitles=assembly.srt:force_style='FontName=Arial,FontSize=19,Outline=2,MarginV=26'",
        '-c:v','libx264','-preset','veryfast','-crf','20','-threads','2');
    } else args.push('-c:v','copy');
    if (filters.length) args.push('-filter_complex',filters.join(';'));
    const target=path.join(out,assemblyOutput.name);
    args.push('-map','0:v:0','-map',tracks.length?'[aout]':'0:a:0','-t',String(duration),
      '-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',target);
    await run('ffmpeg',args,{cwd:work,signal});
    const proof=await probeVideo(target,signal);
    if (proof.video.codec_name!=='h264' || proof.video.width!==width || proof.video.height!==height ||
      proof.audio?.codec_name!=='aac' || Math.abs(proof.duration-duration)>0.18 ||
      (phase==='sample' && Number(proof.video.nb_frames)!==total)) throw new Error('A montagem não corresponde à ficha.');
    await run('ffmpeg',['-nostdin','-v','error','-xerror','-threads','2',...ffmpegInput,'-i',target,'-map','0','-f','null','-'],{signal});
    return {status:'review_pending',phase,project:raw.id,revision:raw.revision,
      outputs:[{...assemblyOutput,width,height,audio:true,duration:proof.duration,bytes:(await fs.stat(target)).size,sha256:await checksum(target)}]};
  } finally {
    await fs.rm(work,{recursive:true,force:true});
  }
}

export async function renderEdit(raw, inputs, directory, signal) {
  const project = validateProject(raw);
  if (project.intent.mode !== 'edit') throw new Error('Esta operação exige uma ficha de edição.');
  for (const name of ['ffmpeg', 'ffprobe']) await run(name, ['-version'], {signal, timeout: 10_000});
  const resolveMaterial = async kind => {
    const material = project.materials.find(item => item.kind === kind);
    const file = inputs[material?.id];
    if (!file) throw new Error(kind === 'subtitle' ? 'Envie um SRT.' : 'Envie um vídeo original.');
    const resolved = path.resolve(file), stat = await fs.stat(resolved);
    if (!stat.isFile() || stat.size !== material.bytes) throw new Error('O arquivo não corresponde ao tamanho da ficha.');
    return resolved;
  };
  const source = await resolveMaterial('source');
  const {video, audio, duration} = await probeVideo(source, signal);
  const {cuts, captions, treatment} = project.actions;
  if (cuts.some(cut => cut.end > duration + 0.005)) throw new Error('Um corte termina depois do vídeo original.');
  const cues = captions ? readSrt(new TextDecoder('utf-8',{fatal:true})
    .decode(await fs.readFile(await resolveMaterial('subtitle'))), duration) : [];
  const out = path.resolve(directory);
  await fs.mkdir(out);
  const receipt = [];
  try {
    for (const output of editOutputs(project)) {
      signal?.throwIfAborted();
      const target = path.join(out, output.name);
      const cut = output.id.startsWith('corte-') ? cuts[Number(output.id.slice(-1)) - 1] : null;
      const start = Math.round((cut?.start ?? 0) * 1000);
      const end = cut ? Math.round(cut.end * 1000) : undefined;
      const subtitle = writeSrt(cues, start, end);
      if (output.id === 'legendas') {
        await fs.writeFile(target, subtitle, {flag:'wx'});
      } else {
        const temp = path.join(out, 'legendas-temporarias.srt');
        if (subtitle) await fs.writeFile(temp, subtitle);
        const filters = videoFilters(cut, treatment, Boolean(subtitle));
        const audioFilters = [];
        if (audio && treatment?.denoise) audioFilters.push('afftdn=nr=9:nf=-35');
        if (audio && treatment?.balance) audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=7');
        const args = ['-nostdin','-hide_banner','-v','error','-xerror','-n','-threads','2','-filter_threads','2',
          ...(cut ? ['-ss', String(cut.start)] : []), ...ffmpegInput,'-i',source,
          ...(cut ? ['-t',String(cut.end - cut.start)] : []),
          '-map',`0:${video.index}`, ...(audio ? ['-map',`0:${audio.index}`] : []),
          '-vf',filters, ...(audioFilters.length ? ['-af',audioFilters.join(',')] : []),
          '-map_metadata','-1','-map_chapters','-1','-c:v','libx264','-threads','2','-preset','veryfast','-crf','19',
          '-c:a','aac','-b:a','160k','-ar','48000','-ac','2','-movflags','+faststart',target];
        await run('ffmpeg', args, {cwd: out, signal});
        if (subtitle) await fs.unlink(temp);
        const result = await probeVideo(target, signal);
        if (result.video.codec_name !== 'h264' || result.video.pix_fmt !== 'yuv420p' ||
          Boolean(result.audio) !== Boolean(audio) || (result.audio && result.audio.codec_name !== 'aac') ||
          (cut && (result.video.width !== 720 || result.video.height !== 1280)) ||
          Math.abs(result.duration - (cut ? cut.end - cut.start : duration)) > 0.12) {
          throw new Error('O arquivo exportado não corresponde ao corte ou formato solicitado.');
        }
        await run('ffmpeg',['-nostdin','-v','error','-xerror','-threads','2',...ffmpegInput,'-i',target,'-map','0','-f','null','-'],{signal});
        Object.assign(output, {duration: result.duration, width: result.video.width, height: result.video.height, audio: Boolean(result.audio)});
      }
      receipt.push({...output, bytes:(await fs.stat(target)).size, sha256:await checksum(target)});
    }
    const result = {status:'review_pending', project:project.id, revision:project.revision, sourceDuration:duration, outputs:receipt};
    await fs.writeFile(path.join(out,'relatorio-tecnico.json'), JSON.stringify(result,null,2)+'\n', {flag:'wx'});
    return result;
  } catch (error) {
    for (const item of await fs.readdir(out)) await fs.unlink(path.join(out,item));
    await fs.rmdir(out);
    throw error;
  }
}
