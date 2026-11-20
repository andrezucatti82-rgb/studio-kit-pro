import {webcrypto} from 'node:crypto';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {limits,projectFormat,validateProject} from '../style-atlas/dist/zapvideo-contract.mjs';
const limit=64*1024*1024;
const endpointPath=/^\/(?:atlas-\d{14}\/)?cloud-handoff(?:-[a-f0-9]{12})?\.php$/;
const tokenPattern=/^[a-f0-9]{48}$/;
const cipherKeyPattern=/^[a-f0-9]{64}$/;

export function parseHandoffLink(value){
 const url=new URL(value),key=url.hash.slice(1);
 const legacy=url.origin==='https://videos.gerenciadordeanuncios.com.br'&&endpointPath.test(url.pathname);
 const worker=['https://zapvideo.com.br'].includes(url.origin)&&url.pathname==='/api/zapvideo/handoff';
 if((!legacy&&!worker)||url.username||url.password||
    url.searchParams.size!==1||!tokenPattern.test(url.searchParams.get('id'))||!cipherKeyPattern.test(key)){
  throw new Error('Use o link temporário gerado pelo ZapVideo.');
 }
 url.hash='';
 return {url,key:Buffer.from(key,'hex'),limit:worker?limits.handoffBytes:limit};
}

export async function unpackHandoff(bytes,key){
 if(bytes.byteLength<33||bytes.byteLength>limit)throw new Error('Tamanho de pacote inválido.');
 const cryptoKey=await webcrypto.subtle.importKey('raw',key,'AES-GCM',false,['decrypt']);
 const plain=Buffer.from(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:bytes.subarray(0,12)},cryptoKey,bytes.subarray(12)));
 if(plain.length<4)throw new Error('Pacote inválido.');
 const headerSize=plain.readUInt32BE(0),headerEnd=4+headerSize;
 if(headerSize<1||headerSize>32768||headerEnd>=plain.length)throw new Error('Cabeçalho inválido.');
 const header=JSON.parse(plain.subarray(4,headerEnd).toString('utf8'));
 if(header.version!==1||!Array.isArray(header.files)||header.files.length<1||header.files.length>101)throw new Error('Lista de arquivos inválida.');
 let offset=headerEnd;
 const ids=new Set();
 const files=header.files.map((record,index)=>{
  const {id,name,size}=record;
  const project=index===0;
  if(typeof id!=='string'||!/^[a-z0-9-]{1,64}$/.test(id)||ids.has(id)||project!==(id==='project')||
     typeof name!=='string'||!name.trim()||name.length>200||!Number.isSafeInteger(size)||size<1||offset+size>plain.length){
   throw new Error('Arquivo inválido no pacote.');
  }
  ids.add(id);
  const data=plain.subarray(offset,offset+size);
  offset+=size;
  return {id,name,data,filename:project?'projeto-video.json':id+'--'+name.replace(/[^a-zA-Z0-9._-]/g,'_')};
 });
 const project=JSON.parse(files[0].data.toString('utf8'));
 if(offset!==plain.length)throw new Error('Ficha inválida no pacote.');
 if(project?.format===projectFormat)validateProject(project);
 else if(project?.packageVersion!==1)throw new Error('Ficha inválida no pacote.');
 return files;
}

export async function retrieveHandoff(value,directory,request=fetch){
 if(!value||!directory)throw new Error('Use node scripts/retrieve-disteven-handoff.mjs LINK DIRETORIO_NOVO.');
 const {url,key,limit:maximum}=parseHandoffLink(value);
 const response=await request(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
 const length=Number(response.headers.get('content-length'));
 if(!response.ok||!length||length>maximum||response.headers.get('content-type')!=='application/octet-stream'){
  throw new Error('Pacote indisponível, expirado ou inválido. Peça a ficha e os originais pelo anexo da conversa.');
 }
 const buffer=new Uint8Array(length);
 let offset=0;
 for await(const chunk of response.body){
  if(offset+chunk.length>length)throw new Error('O tamanho recebido diverge do pacote.');
  buffer.set(chunk,offset);offset+=chunk.length;
 }
 if(offset!==length)throw new Error('Pacote incompleto.');
 const files=await unpackHandoff(buffer,key);
 const root=path.resolve(directory);
 await mkdir(root,{mode:0o700});
 try{
  for(const file of files)await writeFile(path.join(root,file.filename),file.data,{flag:'wx',mode:0o600});
  await writeFile(path.join(root,'arquivos-recebidos.json'),JSON.stringify(files.map(({id,name,filename})=>({id,name,filename})),null,2)+'\n',{flag:'wx',mode:0o600});
 }catch(error){await rm(root,{recursive:true,force:true});throw error;}
 return {directory:root,project:'projeto-video.json',materials:files.length-1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await retrieveHandoff(process.argv[2],process.argv[3])));}
 catch(error){console.error(error instanceof SyntaxError||error.name==='OperationError'?'Pacote inválido ou chave incorreta.':error.message);process.exitCode=1;}
}
