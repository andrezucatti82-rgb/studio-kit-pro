// Synthetic FFmpeg inputs and temporary credentials for the isolated Wrangler emulator.
import {execFileSync} from 'node:child_process';
import {createHash, randomBytes} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const data = '.cache/zapvideo', fixtures = 'projects/zapvideo-prova';
await Promise.all([mkdir(data,{recursive:true}),mkdir(fixtures,{recursive:true})]);
execFileSync('ffmpeg',['-nostdin','-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=25:duration=6',
  '-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=6',
  '-f','lavfi','-i','anoisesrc=seed=4:amplitude=0.012:duration=6',
  '-filter_complex','[1:a][2:a]amix=inputs=2:normalize=0[a]','-map','0:v','-map','[a]','-c:v','libx264',
  '-pix_fmt','yuv420p','-c:a','aac','-shortest',path.join(fixtures,'câmera sintética.mp4')]);
await writeFile(path.join(fixtures,'legendas.srt'),'1\n00:00:00,250 --> 00:00:02,000\nEdição com acentuação.\n\n2\n00:00:02,500 --> 00:00:05,000\nSegunda legenda.\n');
const hash = text => createHash('sha256').update(text).digest('hex');
const expires = Math.floor(Date.now()/1000)+86400;
const people = Array.from({length:2},(_,i)=>({id:'fixture-'+i,token:randomBytes(32).toString('hex')}));
await writeFile(path.join(data,'fixture-access.json'),JSON.stringify(people),{mode:0o600});
await writeFile(path.join(data,'fixture-access.sql'),people.map(({id,token})=>
  `INSERT INTO people (id,token_hash,expires_at) VALUES ('${id}','${hash(token)}',${expires})
   ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at;`).join('\n'),{mode:0o600});
const basic = 'Basic '+Buffer.from('staging:'+randomBytes(24).toString('hex')).toString('base64');
try {
  await writeFile('.dev.vars.staging','STAGING_ACCESS_SHA256='+hash(basic)+'\n',{mode:0o600,flag:'wx'});
  await writeFile(path.join(data,'stage-access.txt'),basic,{mode:0o600});
} catch(error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.dev.vars.staging já existe. Preserve a credencial definida para esse ambiente.');
}
