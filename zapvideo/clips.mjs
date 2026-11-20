import {isId,validClipSettings} from '../style-atlas/dist/zapvideo-contract.mjs';
import {detectType,mediaType,encodeBase64} from './analysis-media.mjs';
import {digest, googleDailyBudget, hex, isHash, json, now, readJson, reject, sql, uuid} from './http.mjs';
import {hasGeminiProvider} from './google-provider.mjs';

export const clipMaxBytes=24*1024**2;
export const clipFrameMaxBytes=2*1024**2;
export const omniModel='gemini-omni-1.2-flash';

export function clipMode(env) {
  if (env.ENVIRONMENT==='local' && env.GEMINI_MOCK==='1' && env.RENDER_LOCAL_URL==='http://127.0.0.1:4000') return 'mock';
  if (env.GEMINI_CLIP_VERIFIED==='1' && hasGeminiProvider(env) && env.RENDER_ENABLED==='1' && env.RENDERER &&
    dailyBudget(env)>0 && unitPrice(env)>0 && configuredModel(env)===omniModel) return 'gemini';
  return 'unavailable';
}
const micros=value=>typeof value==='string' && /^[0-9]{1,8}$/.test(value)?Number(value):0;
export const dailyBudget=env=>Math.min(micros(env.GEMINI_CLIP_DAILY_BUDGET_MICROS),googleDailyBudget(env));
const unitPrice=env=>micros(env.GEMINI_CLIP_RESERVE_MICROS_PER_SECOND);
const configuredModel=env=>env.GEMINI_CLIP_MODEL || '';
export const clipModel=(env,mode=clipMode(env))=>mode==='mock'?omniModel:configuredModel(env);
const reservedFor=(env,seconds,mode)=>mode==='mock'?0:unitPrice(env)*seconds;

export function clipScope(plan,{sceneId,shotId,frameId,aspect}) {
  const scene=plan.scenes.find(item=>item.id===sceneId);
  const shot=scene?.shots.find(item=>item.id===shotId);
  const frame=plan.materials.find(item=>item.id===frameId);
  const mime=frame && mediaType(frame.name)?.[1];
  if (plan.intent.mode!=='create' || !shot?.generateSupport || !validClipSettings({aspect,seconds:shot.seconds})) {
    reject(400,'Marque a geração neste plano e defina de 3 a 15 segundos inteiros.');
  }
  if (!frame || !['reference','frame'].includes(frame.kind) || !['image/jpeg','image/png','image/webp'].includes(mime) ||
    frame.bytes>clipFrameMaxBytes || frame.permission!=='process') reject(400,'Selecione uma imagem autorizada de até 2 MiB para este plano.');
  const linked=shot.layers.map(({kind,materialId})=>{
    const material=plan.materials.find(item=>item.id===materialId);
    return {kind,materialId,name:material?.name ?? null,bytes:material?.bytes ?? null};
  });
  return {sceneId,shotId,frameId,aspect,seconds:shot.seconds,mime,sourceBytes:frame.bytes,sourceName:frame.name,
    direction:shot.direction,narration:scene.narration,sceneTitle:scene.title,subject:plan.intent.subject,linked};
}

export function clipBasis(scope,mode,model,sha256) {
  return digest(JSON.stringify({scope,mode,model,sha256,resolution:'720p',audio:true,version:1}));
}

async function readFrame(env,project,scope,uploadId) {
  if (!isId(uploadId)) reject(400,'Envie o quadro apresentado antes de aprovar.');
  const row=await sql(env,`SELECT key,bytes,sha256 FROM uploads
    WHERE id=? AND project_id=? AND material_id=? AND state='ready' AND expires_at>?`,
    uploadId,project,scope.frameId,now()).first();
  if (!row || row.bytes!==scope.sourceBytes || !isHash(row.sha256)) reject(409,'O quadro apresentado precisa ser enviado novamente.');
  const object=await env.PRIVATE.get(row.key);
  if (!object || object.size!==scope.sourceBytes) reject(409,'O quadro apresentado está indisponível.');
  const bytes=new Uint8Array(await object.arrayBuffer());
  if (hex(await crypto.subtle.digest('SHA-256',bytes))!==row.sha256 || !detectType(bytes,scope.mime)) {
    reject(400,'A imagem enviada é inválida ou difere do quadro apresentado.');
  }
  return {sha256:row.sha256,bytes};
}

function scopeFromApproval(row) {
  return {sceneId:row.scene_id,shotId:row.shot_id,frameId:row.frame_id,aspect:row.aspect};
}
async function approvalFor(env,plan,owner,id,{withFrame=false}={}) {
  if (!isId(id)) reject(400,'Selecione uma aprovação visual.');
  const row=await sql(env,'SELECT * FROM clip_visual_approvals WHERE id=? AND project_id=? AND owner=?',id,plan.id,owner).first();
  if (!row) reject(404,'Aprovação visual indisponível.');
  const mode=clipMode(env);
  if (mode==='unavailable') reject(503,'Geração de clipes indisponível.');
  const model=clipModel(env,mode);
  const scope=clipScope(plan,scopeFromApproval(row));
  if (row.basis_sha256!==await clipBasis(scope,mode,model,row.frame_sha256)) reject(409,'O plano ou a configuração mudou. Apresente o quadro e aprove novamente.');
  const frame=await readFrame(env,plan.id,scope,row.frame_upload);
  if (frame.sha256!==row.frame_sha256) reject(409,'O quadro aprovado mudou. Apresente e aprove a nova imagem.');
  return {mode,model,scope,approval:row,frame:withFrame?{mime:scope.mime,data:encodeBase64(frame.bytes)}:undefined};
}

export async function clipRoute(request,env,plan,owner,action) {
  const body=(await readJson(request,4096)) ?? {};
  if (body.revision!==plan.revision) reject(409,'Abra a revisão atual.');
  const mode=clipMode(env), model=clipModel(env,mode);
  if (mode==='unavailable') reject(503,'Geração de clipes indisponível.');
  if (action==='approve') {
    const {message,seen,uploadId,presentedSha256}=body;
    if (seen!==true || typeof message!=='string' || !message.trim() || message.length>500 || !isHash(presentedSha256)) {
      reject(400,'Veja o quadro e registre sua aprovação visual explícita.');
    }
    const scope=clipScope(plan,body), frame=await readFrame(env,plan.id,scope,uploadId);
    if (frame.sha256!==presentedSha256) reject(409,'O arquivo recebido difere do quadro apresentado.');
    const id=uuid();
    const basis=await clipBasis(scope,mode,model,frame.sha256);
    const decidedAt=now();
    const result=await sql(env,`INSERT INTO clip_visual_approvals(id,project_id,revision,owner,scene_id,shot_id,
      frame_id,frame_upload,frame_sha256,aspect,basis_sha256,mode,model,message,decided_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND revision=?)
      AND (SELECT count(*) FROM clip_visual_approvals WHERE project_id=?)<200`,
      id,plan.id,plan.revision,owner,scope.sceneId,scope.shotId,scope.frameId,uploadId,frame.sha256,scope.aspect,basis,
      mode,model,message,decidedAt,plan.id,owner,plan.revision,plan.id).run();
    if (!result.meta.changes) reject(409,'A revisão mudou ou atingiu o limite de aprovações.');
    return json({id,revision:plan.revision,sha256:frame.sha256,sceneId:scope.sceneId,shotId:scope.shotId,decidedAt},201);
  }
  if (action==='quote') {
    const {scope,approval}=await approvalFor(env,plan,owner,body.approvalId);
    const reserve=reservedFor(env,scope.seconds,mode);
    if (mode==='gemini' && (reserve<=0 || reserve>dailyBudget(env))) reject(409,'Orçamento indisponível para este clipe.');
    const id=uuid(), expires=now()+900;
    const result=await sql(env,`INSERT INTO clip_quotes(id,project_id,revision,approval_id,reserved_micros,expires_at)
      SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND revision=?)
      AND (SELECT count(*) FROM clip_quotes WHERE project_id=? AND expires_at>?)<20`,
      id,plan.id,plan.revision,approval.id,reserve,expires,plan.id,owner,plan.revision,plan.id,now()).run();
    if (!result.meta.changes) reject(409,'A revisão mudou ou atingiu o limite de estimativas.');
    return json({id,mode,model,scene:scope.sceneTitle,direction:scope.direction,frameName:scope.sourceName,seconds:scope.seconds,aspect:scope.aspect,
      resolution:'720p',currency:'USD',reservedMicros:reserve,expires},201);
  }
  reject(404,'Rota de clipe indisponível.');
}

export async function authorizeClip(env,plan,owner,quoteId) {
  const quote=await sql(env,'SELECT * FROM clip_quotes WHERE id=? AND project_id=? AND revision=? AND expires_at>?',
    quoteId,plan.id,plan.revision,now()).first();
  if (!quote) reject(409,'A estimativa expirou ou a revisão mudou. Solicite outra.');
  const current=await approvalFor(env,plan,owner,quote.approval_id);
  if (quote.reserved_micros!==reservedFor(env,current.scope.seconds,current.mode)) reject(409,'A estimativa mudou. Solicite outra.');
  return {approvalId:quote.approval_id,mode:current.mode,model:current.model,reservedMicros:quote.reserved_micros};
}

export async function checkClipBeforeRun(env,plan,owner,selection) {
  const current=await approvalFor(env,plan,owner,selection.approvalId,{withFrame:true});
  if (selection.mode!==current.mode || selection.model!==current.model ||
    selection.reservedMicros!==reservedFor(env,current.scope.seconds,current.mode) ||
    (current.mode==='gemini' && selection.reservedMicros>dailyBudget(env))) {
    reject(409,'A configuração ou orçamento mudou. Solicite outra estimativa.');
  }
  return current;
}
