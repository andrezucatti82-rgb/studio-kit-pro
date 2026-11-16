import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {probe} from './process.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const assetIdPattern=/^[a-f0-9-]{36}$/;
export class AssetStore {
 constructor(root){this.root=path.resolve(root);}
 async init(){await fs.mkdir(this.root,{recursive:true});}
 async import(bytes,{name='media',rights,signal}={}){
  if(!rights || typeof rights!=='string' || rights.trim().length<3)throw Error('Record media rights before upload');
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>100*1024*1024)throw Error('Media size must be 1 byte–100 MiB');
  const hash=digest(bytes);
  for(const file of await fs.readdir(this.root)){if(!file.endsWith('.json'))continue;const existing=JSON.parse(await fs.readFile(path.join(this.root,file),'utf8'));if(existing.sha256===hash&&existing.rights===rights.trim().slice(0,1000))return this.verify(existing.id);}
  if((await fs.readdir(this.root)).filter(f=>f.endsWith('.json')).length>=100)throw Error('Local asset quota reached (100); archive unused projects offline');
  const id=randomUUID(),file=path.join(this.root,`${id}.media`);
  await fs.writeFile(file,bytes,{flag:'wx'});
  try{
   const metadata=await probe(file,{signal}),streams=metadata.streams??[],video=streams.find(s=>s.codec_type==='video'),audio=streams.find(s=>s.codec_type==='audio');
   const format=metadata.format?.format_name??'';
   if(!/^(mov,mp4,m4a,3gp,3g2,mj2|matroska,webm|avi|wav|mp3|flac|ogg|png_pipe|jpeg_pipe|webp_pipe|image2)$/.test(format))throw Error('Unsupported media container');
   const image=video&&['png','mjpeg','webp'].includes(video.codec_name)&&!audio&&['png_pipe','jpeg_pipe','webp_pipe','image2'].includes(format);
   const kind=image?'image':video?'video':audio?'audio':null;
   const durationSeconds=Number(metadata.format?.duration??video?.duration??audio?.duration??0);
   if(!kind || (!image&&(!Number.isFinite(durationSeconds)||durationSeconds<=0||durationSeconds>3600)))throw Error('Unsupported media duration');
   if(video && (video.width>3840||video.height>3840||video.width<16||video.height<16))throw Error('Media dimensions outside 16–3840 pixels');
   const record={id,name:String(name).slice(0,180),kind,durationSeconds: image?0:durationSeconds,width:video?.width,height:video?.height,codec:video?.codec_name??audio?.codec_name,hasAudio:Boolean(audio),sha256:hash,bytes:bytes.length,rights:rights.trim().slice(0,1000),createdAt:new Date().toISOString()};
   await fs.writeFile(path.join(this.root,`${id}.json`),JSON.stringify(record,null,2));
   return record;
  }catch(error){await fs.rm(file,{force:true});throw error;}
 }
 async get(id){if(!assetIdPattern.test(id))throw Error('Invalid asset ID');return JSON.parse(await fs.readFile(path.join(this.root,`${id}.json`),'utf8'));}
 file(id){if(!assetIdPattern.test(id))throw Error('Invalid asset ID');return path.join(this.root,`${id}.media`);}
 async verify(id){const record=await this.get(id);if(digest(await fs.readFile(this.file(id)))!==record.sha256)throw Error('Input asset changed');return record;}
}
