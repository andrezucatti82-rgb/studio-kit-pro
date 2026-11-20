import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {editOutputs, limits, validateProject} from '../style-atlas/dist/zapvideo-contract.mjs';
import {readSrt} from '../style-atlas/dist/zapvideo-captions.mjs';

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
