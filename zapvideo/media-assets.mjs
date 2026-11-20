import {assetOutputs,clipAspects,isId} from '../style-atlas/dist/zapvideo-contract.mjs';
import {detectType} from './analysis-media.mjs';
import {boundedBytes,fetchWithoutRedirects,googleDailyBudget,hex,json,now,readJson,reject,sql,uuid} from './http.mjs';

export const mediaMaxBytes=8*1024**2;
export const frameMaxBytes=2*1024**2;
export const models=Object.freeze({frame:'gemini-nano-banana-2.1',speech:'gemini-3.8-flash-tts',music:'lyria-3-clip-preview'});
const voices=['Kore','Charon','Zephyr'];
const micros=value=>typeof value==='string' && /^[0-9]{1,8}$/.test(value)?Number(value):0;
export const mediaBudget=env=>Math.min(micros(env.GEMINI_ASSET_DAILY_BUDGET_MICROS),googleDailyBudget(env));
const unit=(env,kind)=>micros(env['GEMINI_'+kind.toUpperCase()+'_RESERVE_MICROS']);
const configured=(env,kind)=>env['GEMINI_'+kind.toUpperCase()+'_MODEL'];
export const isMediaKind=kind=>typeof kind==='string' && Object.hasOwn(models,kind);

export function mediaMode(env,kind) {
  if (!isMediaKind(kind)) return 'unavailable';
  if (env.ENVIRONMENT==='local' && env.GEMINI_MOCK==='1' && env.RENDER_LOCAL_URL==='http://127.0.0.1:4000') return 'mock';
  if (env['GEMINI_'+kind.toUpperCase()+'_VERIFIED']==='1' && env.GEMINI_API_KEY && env.RENDER_ENABLED==='1' && env.RENDERER &&
    configured(env,kind)===models[kind] && unit(env,kind)>0 && mediaBudget(env)>=unit(env,kind)) return 'gemini';
  return 'unavailable';
}

export function mediaScope(plan,{kind,sceneId,shotId,aspect,voice,prompt}) {
  if (plan.intent.mode!=='create' || !isMediaKind(kind)) reject(400,'Escolha um material para um projeto de criação.');
  if (kind==='music') {
    if (typeof prompt!=='string' || !prompt.trim() || prompt.length>500) reject(400,'Descreva a trilha instrumental.');
    return {kind,input:prompt,seconds:30};
  }
  const scene=plan.scenes.find(s=>s.id===sceneId);
  if (!scene) reject(400,'Escolha a cena do material.');
  if (kind==='speech') {
    if (!scene.narration.trim() || !voices.includes(voice)) reject(400,'Confira a fala e escolha uma voz do catálogo.');
    return {kind,sceneId,scene:scene.title,voice,input:scene.narration};
  }
  const shot=scene.shots.find(s=>s.id===shotId);
  if (!shot || !clipAspects.includes(aspect)) reject(400,'Escolha o plano e a proporção do quadro.');
  return {kind,sceneId,shotId,scene:scene.title,aspect,input:shot.direction};
}

export async function quoteMedia(request,env,plan,owner) {
  const body=(await readJson(request,4096)) ?? {};
  if (body.revision!==plan.revision) reject(409,'Abra a revisão atual.');
  const scope=mediaScope(plan,body), mode=mediaMode(env,scope.kind);
  if (mode==='unavailable') reject(503,'Este gerador está indisponível.');
  const reserve=mode==='mock'?0:unit(env,scope.kind);
  const id=uuid(),expires=now()+900;
  const selection={scope,mode,model:models[scope.kind],reservedMicros:reserve};
  const result=await sql(env,`INSERT INTO asset_quotes(id,project_id,revision,parameters,reserved_micros,expires_at)
    SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND revision=?)
      AND (SELECT count(*) FROM asset_quotes WHERE project_id=? AND expires_at>?)<20`,
    id,plan.id,plan.revision,JSON.stringify(selection),reserve,expires,plan.id,owner,plan.revision,plan.id,now()).run();
  if (!result.meta.changes) reject(409,'A revisão mudou ou atingiu o limite de estimativas.');
  return json({id,revision:plan.revision,expires,currency:'USD',...selection},201);
}

export function checkMediaSelection(env,selection) {
  const kind=selection.scope?.kind;
  const mode=mediaMode(env,kind);
  if (mode==='unavailable' || mode!==selection.mode || selection.model!==models[kind] ||
    selection.reservedMicros!==(mode==='mock'?0:unit(env,kind))) reject(409,'A configuração ou o valor mudou. Solicite outra estimativa.');
  return selection;
}

export async function authorizeMedia(env,plan,quoteId) {
  if (!isId(quoteId)) reject(400,'Confirme a estimativa apresentada.');
  const quote=await sql(env,'SELECT * FROM asset_quotes WHERE id=? AND project_id=? AND revision=? AND expires_at>?',
    quoteId,plan.id,plan.revision,now()).first();
  if (!quote) reject(409,'A estimativa expirou ou a revisão mudou.');
  return checkMediaSelection(env,JSON.parse(quote.parameters));
}

export function mediaRequest({model,scope}) {
  const {kind,input,aspect,voice}=scope;
  if (!isMediaKind(kind) || model!==models[kind]) throw new Error('Modelo de mídia incompatível.');
  const base={model,store:false,stream:false};
  if (kind==='frame') return {...base,input:'Crie um quadro conceitual único para este plano. '+input,
    response_format:{type:'image',mime_type:'image/jpeg',aspect_ratio:aspect,image_size:'1K'}};
  if (kind==='speech') return {...base,input:[{type:'user_input',content:[{type:'text',text:input}]}],
    response_format:{type:'audio'},generation_config:{speech_config:[{voice}]}};
  return {...base,input:input+'\nTrilha instrumental de fundo, sem vozes ou locução.',response_format:{type:'audio'}};
}

export async function generateMedia(selection,key,request=fetch) {
  const response=await fetchWithoutRedirects(request,'https://generativelanguage.googleapis.com/v1beta/interactions',{
    method:'POST',signal:AbortSignal.timeout(180_000),
    headers:{'x-goog-api-key':key,'Api-Revision':'2026-05-20','Content-Type':'application/json'},
    body:JSON.stringify(mediaRequest(selection)),
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status>=500 || response.status===408) throw new Error('Aceitação sem confirmação.');
    return {rejected:true};
  }
  const result=JSON.parse(new TextDecoder().decode(await boundedBytes(response,12*1024**2,'Resposta de mídia acima do limite.')));
  const id=typeof result?.id==='string' && /^[\x21-\x7E]{1,512}$/.test(result.id)?result.id:null;
  const output=assetOutputs[selection.scope.kind];
  const parts=(Array.isArray(result?.steps)?result.steps:[]).filter(step=>step?.type==='model_output')
    .flatMap(step=>Array.isArray(step.content)?step.content:[])
    .filter(block=>block?.type===output.type.split('/')[0] && typeof block.data==='string');
  if (!id && result?.status!=='completed' && parts.length!==1) throw new Error('O Google não retornou comprovante utilizável.');
  if (result?.status && result.status!=='completed') return {id,error:'O Google não confirmou a conclusão da mídia.'};
  if (parts.length!==1) return {id,error:'O Google não retornou um único arquivo neste formato.'};
  const content=parts[0];
  if (content.data.length>(Math.ceil(mediaMaxBytes/3)*4)) return {id,error:'O arquivo do Google ultrapassou o limite.'};
  let bytes;
  try {
    bytes=typeof Uint8Array.fromBase64==='function'?Uint8Array.fromBase64(content.data):
      Uint8Array.from(atob(content.data),char=>char.charCodeAt(0));
  } catch { return {id,error:'O arquivo retornou com codificação inválida.'}; }
  const maximum=selection.scope.kind==='frame'?frameMaxBytes:mediaMaxBytes;
  const format=output.type==='audio/mpeg'?'audio/mp3':output.type;
  const declared=content.mime_type?.toLowerCase();
  if (bytes.length>maximum || (declared && ![format,output.type].includes(declared)) || !detectType(bytes,format)) {
    return {id,error:'O formato ou tamanho retornado é incompatível com a entrega.'};
  }
  return {id,bytes,sha256:hex(await crypto.subtle.digest('SHA-256',bytes))};
}
