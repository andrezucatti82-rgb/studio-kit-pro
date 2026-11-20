import {clipMaxBytes,omniModel} from './clips.mjs';
import {fetchWithoutRedirects,hex} from './http.mjs';

const host='https://generativelanguage.googleapis.com';
const api=host+'/v1beta';
const providerIdPattern=/^[A-Za-z0-9_-]{1,160}$/;
const filePath=/^(?:\/v1beta\/)?files\/([a-z0-9-]{1,80})(?::download)?$/;
const requestFields=new Set([
  'model','input','input[0]','input[0].data','input[0].mime_type','input[1]','input[1].text',
  'response_format','response_format.duration','response_format.aspect_ratio','response_format.resolution',
  'response_format.delivery','store','background','stream',
]);

export function omniFileId(value) {
  if (typeof value!=='string' || value.length>400) throw new Error('Referência do arquivo do Google inválida.');
  const uri=new URL(value,host+'/');
  const filename=filePath.exec(uri.pathname.replace(/^\/(files\/)/,'$1'))?.[1];
  if (!filename || uri.origin!==host || uri.username || uri.password || uri.hash) throw new Error('Referência do arquivo do Google inválida.');
  return filename;
}

function headers(key) {
  return {'x-goog-api-key':key,'Api-Revision':'2026-05-20'};
}

async function boundedBody(response,limit,errorMessage) {
  if (!response.body || Number(response.headers.get('Content-Length'))>limit) {
    await response.body?.cancel();
    throw new Error(errorMessage);
  }
  const reader=response.body.getReader();
  const chunks=[];
  let length=0;
  try {
    for (;;) {
      const {value,done}=await reader.read();
      if (done) break;
      length+=value.length;
      if (length>limit) throw new Error(errorMessage);
      chunks.push(value);
    }
  } catch(error) {
    await reader.cancel().catch(()=>{});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes=new Uint8Array(length);
  let offset=0;
  for (const chunk of chunks) {
    bytes.set(chunk,offset);
    offset+=chunk.length;
  }
  return bytes;
}
const readMetadata=async response=>JSON.parse(new TextDecoder().decode(
  await boundedBody(response,256*1024,'O Google retornou metadados acima do limite.')));

async function rejectedSubmission(response) {
  const body=await readMetadata(response).catch(()=>null);
  const details=Array.isArray(body?.error?.details)?body.error.details:[];
  const fields=details.flatMap(item=>Array.isArray(item?.fieldViolations)?item.fieldViolations:[]);
  const field=fields.find(item=>requestFields.has(item?.field))?.field;
  return {rejected:true,status:response.status,...(field?{field}:{})};
}

export async function submitOmni({model,scope,frame},key,request=fetch) {
  if (model!==omniModel || !frame?.data || !frame.mime || !['9:16','16:9'].includes(scope?.aspect) ||
    !Number.isSafeInteger(scope.seconds) || scope.seconds<3 || scope.seconds>15) throw new Error('Configuração de clipe incompatível.');
  const response=await fetchWithoutRedirects(request,api+'/interactions',{
    method:'POST',signal:AbortSignal.timeout(180_000),headers:{...headers(key),'Content-Type':'application/json'},
    body:JSON.stringify({model,store:false,background:false,stream:false,
      input:[{type:'image',data:frame.data,mime_type:frame.mime},{type:'text',
        text:'Use o quadro fornecido como referência visual inicial. '+scope.direction}],
      response_format:{type:'video',duration:scope.seconds+'s',aspect_ratio:scope.aspect,resolution:'720p',delivery:'uri'}}),
  });
  if (!response.ok) {
    if (response.status>=500 || response.status===408) {
      await response.body?.cancel();
      throw new Error('Aceitação do Google sem confirmação.');
    }
    return rejectedSubmission(response);
  }
  const result=await readMetadata(response);
  const id=providerIdPattern.test(result?.id ?? '')?result.id:null;
  const video=(Array.isArray(result?.steps)?result.steps:[]).filter(item=>item?.type==='model_output')
    .flatMap(item=>Array.isArray(item.content)?item.content:[])
    .find(item=>item?.type==='video' && item.uri);
  let fileId=null;
  if (video) {
    try { fileId=omniFileId(video.uri); } catch {}
  }
  if (!id && !fileId) throw new Error('O Google retornou sem um comprovante utilizável.');
  return {id,fileId};
}

export async function omniFileState(fileId,key,request=fetch) {
  const id=omniFileId('files/'+fileId);
  const response=await request(api+'/files/'+id,{headers:headers(key),redirect:'manual',signal:AbortSignal.timeout(20_000)});
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('Não foi possível consultar o arquivo do Google.');
  }
  const {state}=await readMetadata(response);
  if (!['PROCESSING','ACTIVE','FAILED'].includes(state)) throw new Error('Estado do arquivo do Google desconhecido.');
  return state;
}

export async function downloadOmni(fileId,key,request=fetch) {
  const id=omniFileId('files/'+fileId);
  const signal=AbortSignal.timeout(90_000);
  let response=await request(api+'/files/'+id+':download?alt=media',{headers:headers(key),redirect:'manual',signal});
  if ([301,302,303,307,308].includes(response.status)) {
    const location=response.headers.get('Location');
    await response.body?.cancel();
    const destination=new URL(location || 'about:blank');
    if (destination.origin!=='https://storage.googleapis.com' || destination.username || destination.password) throw new Error('Destino de download do Google inválido.');
    response=await request(destination,{redirect:'manual',signal});
  }
  const declared=Number(response.headers.get('Content-Length'));
  if (!response.ok || !response.body || declared>clipMaxBytes || /^(?:text\/|application\/json)/i.test(response.headers.get('Content-Type') || '')) {
    await response.body?.cancel();
    throw new Error('Download do clipe indisponível.');
  }
  const bytes=await boundedBody(response,clipMaxBytes,'O vídeo ultrapassa o limite de 24 MiB.');
  if (bytes.length<12 || (declared>0 && declared!==bytes.length)) throw new Error('Download incompleto.');
  if (String.fromCharCode(...bytes.subarray(4,8))!=='ftyp') throw new Error('O arquivo recebido não é um MP4.');
  return {bytes,sha256:hex(await crypto.subtle.digest('SHA-256',bytes))};
}
