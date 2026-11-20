import {isHash, now, sql} from './http.mjs';

export const analysisBytes = 8*1024**2;
const supported = {
  png:['image','image/png'],jpg:['image','image/jpeg'],jpeg:['image','image/jpeg'],webp:['image','image/webp'],
  pdf:['document','application/pdf'],mp3:['audio','audio/mp3'],wav:['audio','audio/wav'],
  mp4:['video','video/mp4'],mov:['video','video/quicktime'],webm:['video','video/webm'],
};
export const analysisTypes = Object.keys(supported);
export const mediaType = name => supported[name.split('.').at(-1).toLowerCase()] ?? null;

export function publicUrl(value) {
  if (typeof value !== 'string' || value.length>500 || !value.startsWith('https://')) throw new Error('Informe um endereço público HTTPS.');
  const url = new URL(value);
  if (url.username || url.password || url.port || url.search || url.hash ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname) ||
    /\.(?:local|internal|localhost|test|example|invalid)$/.test(url.hostname)) {
    throw new Error('Use um endereço público HTTPS sem senha, porta ou parâmetros.');
  }
  return url.href;
}

export function detectType(bytes,mime) {
  const ascii=(index,length)=>String.fromCharCode(...bytes.subarray(index,index+length));
  switch(mime) {
    case 'image/png': return bytes[0]===137 && ascii(1,7)==='PNG\r\n\x1a\n';
    case 'image/jpeg': return bytes[0]===255 && bytes[1]===216 && bytes[2]===255;
    case 'image/webp': return ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP';
    case 'application/pdf': return ascii(0,5)==='%PDF-';
    case 'audio/wav': return ascii(0,4)==='RIFF' && ascii(8,4)==='WAVE';
    case 'audio/mp3': return ascii(0,3)==='ID3' || (bytes[0]===255 && (bytes[1]&0xe0)===0xe0);
    case 'video/mp4':
    case 'video/quicktime': return ascii(4,4)==='ftyp';
    case 'video/webm': return bytes[0]===0x1a && bytes[1]===0x45 && bytes[2]===0xdf && bytes[3]===0xa3;
    default:return false;
  }
}
export function encodeBase64(bytes) {
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64();
  const pieces=[];
  for (let i=0;i<bytes.length;i+=24576) pieces.push(btoa(String.fromCharCode(...bytes.subarray(i,i+24576))));
  return pieces.join('');
}
export async function getAnalysisInput(env,project,selected) {
  const sources=[], input=[];
  let total=0;
  for (const [id, upload] of Object.entries(selected.uploads)) {
    const asset=project.materials.find(item=>item.id===id);
    const row=await sql(env,"SELECT key,bytes,sha256 FROM uploads WHERE id=? AND project_id=? AND material_id=? AND state='ready' AND expires_at>?",
      upload,project.id,id,now()).first();
    const match=asset && mediaType(asset.name);
    if (!match || !row || row.bytes!==asset.bytes || asset.permission!=='process' || !isHash(row.sha256)) throw new Error('Fonte indisponível.');
    total+=row.bytes;
    if (total>analysisBytes) throw new Error('Materiais acima do limite de análise.');
    const object=await env.PRIVATE.get(row.key);
    if (!object || object.size!==row.bytes) throw new Error('Arquivo incompleto.');
    const bytes=new Uint8Array(await object.arrayBuffer());
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    const actual=Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
    if (row.sha256!==actual || !detectType(bytes,match[1])) throw new Error('Arquivo divergente ou incompatível com a análise.');
    input.push({type:'text',text:'Fonte '+id+' ('+asset.name+')'});
    input.push({type:match[0],mime_type:match[1],data:encodeBase64(bytes)});
    sources.push({id,label:asset.name});
  }
  if (selected.url) sources.push({id:'public-url',label:publicUrl(selected.url)});
  return {sources,input,url:selected.url};
}
