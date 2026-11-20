import {limits, isId} from '../style-atlas/dist/zapvideo-contract.mjs';
import {exactBody, hours, isExpired, isHash, json, now, readJson, reject, sql, uuid} from './http.mjs';
import {analysisBytes, mediaType} from './analysis-media.mjs';

const inProgress = "'creating','open'";
const reserved = "'creating','open','ready'";
const activeTTL = hours(24);
const partBytes = limits.uploadPartBytes;
const partCount = row => Math.ceil(row.bytes / partBytes);

async function find(env, project, id) {
  const row = await sql(env,'SELECT * FROM uploads WHERE project_id=? AND id=?',project,id).first();
  if (!row || isExpired(row)) reject(404,'Envio expirado ou inexistente.');
  return row;
}
async function summary(env, row) {
  const {results} = await sql(env,'SELECT part FROM upload_parts WHERE upload_id=? ORDER BY part',row.id).all();
  return {id:row.id, state:row.state, partBytes, parts:results.map(part => part.part)};
}
async function lock(env, row, action) {
  const key = uuid();
  const claimed = await sql(env,`UPDATE uploads SET lock_id=?,lock_until=? WHERE id=? AND state IN (${inProgress}) AND lock_until<=?`,
    key, now()+600,row.id,now()).run();
  if (!claimed.meta.changes) reject(409,'Envio em andamento. Aguarde e tente novamente.');
  try {
    return await action(key);
  } finally {
    await sql(env,'UPDATE uploads SET lock_id=NULL,lock_until=0 WHERE id=? AND lock_id=?',row.id,key).run();
  }
}

export async function startUpload(request, env, project, owner) {
  const input = await readJson(request,4096);
  const {materialId, bytes, sha256} = input ?? {};
  if (!isId(materialId) || !isHash(sha256)) reject(400,'Arquivo inválido.');
  const revision = await sql(env,'SELECT body FROM revisions WHERE project_id=? AND revision=?',project.id,project.revision).first();
  const material = JSON.parse(revision.body).materials.find(item => item.id === materialId && item.permission === 'process');
  if (!material || material.bytes !== bytes) reject(400,'Arquivo não autorizado na ficha.');
  const assemblyType=['broll','take','audio'].includes(material.kind) &&
    (material.kind!=='audio' || /\.(?:mp3|wav|m4a|aac)$/i.test(material.name));
  if (!['source','subtitle'].includes(material.kind) && !assemblyType && (!mediaType(material.name) || bytes>analysisBytes)) {
    reject(400,'Arquivo incompatível com a análise de materiais.');
  }
  const id = uuid(), key = `projects/${project.id}/input/${id}`;
  await sql(env,`INSERT OR IGNORE INTO uploads(id,project_id,material_id,kind,bytes,sha256,key,state,expires_at)
    SELECT ?,?,?,?,?,?,?,'creating',?
    WHERE (SELECT count(*) FROM uploads WHERE project_id=? AND state IN (${inProgress}))<4
      AND (SELECT coalesce(sum(u.bytes),0) FROM uploads u JOIN projects p ON p.id=u.project_id
        WHERE p.owner=? AND u.state IN (${reserved}))+?<=?
      AND (SELECT coalesce(sum(bytes),0) FROM uploads WHERE state IN (${reserved}))+?<=?`,
    id,project.id,material.id,material.kind,bytes,sha256,key,now()+activeTTL,project.id,owner,bytes,2*limits.videoBytes,bytes,8*limits.videoBytes).run();
  const row = await sql(env,'SELECT * FROM uploads WHERE project_id=? AND material_id=? AND sha256=?',project.id,material.id,sha256).first();
  if (!row) reject(429,'Limite de envios simultâneos ou armazenamento atingido.');
  if (isExpired(row) || row.bytes !== bytes || row.kind !== material.kind) reject(409,'Este envio expirou. Remova o material e escolha o arquivo novamente.');
  if (row.state !== 'creating') return json(await summary(env,row),200);
  return lock(env,row,async lockId => {
    const current = await find(env,project.id,row.id);
    if (current.state !== 'creating') return json(await summary(env,current));
    const multipart = await env.PRIVATE.createMultipartUpload(row.key,{httpMetadata:{contentType:'application/octet-stream'}});
    try {
      const result = await sql(env,"UPDATE uploads SET multipart=?,state='open' WHERE id=? AND lock_id=? AND state='creating'",
        multipart.uploadId,row.id,lockId).run();
      if (!result.meta.changes) reject(409,'Envio mudou. Tente novamente.');
    } catch (error) {
      await multipart.abort().catch(() => {});
      throw error;
    }
    return json(await summary(env,{...row,state:'open'}),201);
  });
}

export async function uploadRoute(request, env, projectId, id, action, number) {
  const row = await find(env,projectId,id);
  if (request.method === 'GET' && !action) return json(await summary(env,row));
  if (request.method === 'POST' && action === 'complete' && row.state === 'ready') return json(await summary(env,row));
  if (row.state !== 'open') reject(409,'Este envio não está aberto.');
  return lock(env,row,async lockId => {
    const active = await find(env,projectId,id);
    if (active.state !== 'open') reject(409,'Este envio não está aberto.');
    const multipart = env.PRIVATE.resumeMultipartUpload(active.key,active.multipart);
    if (request.method === 'PUT' && action === 'parts') {
      const part = Number(number), count = partCount(active);
      if (!Number.isSafeInteger(part) || part < 1 || part > count) reject(400,'Parte inválida.');
      const size = part === count ? active.bytes - (part-1)*partBytes : partBytes;
      // Clear previous ETag first so a completed R2 write with a lost DB response is resumable.
      await sql(env,'DELETE FROM upload_parts WHERE upload_id=? AND part=?',id,part).run();
      const {etag} = await multipart.uploadPart(part,exactBody(request,size));
      await sql(env,`INSERT INTO upload_parts(upload_id,part,etag)
        SELECT id,?,? FROM uploads WHERE id=? AND lock_id=?`,part,etag,id,lockId).run();
      return json({part});
    }
    if (request.method === 'POST' && action === 'complete') {
      let object = await env.PRIVATE.head(active.key);
      if (!object) {
        const {results} = await sql(env,'SELECT part AS partNumber,etag FROM upload_parts WHERE upload_id=? ORDER BY part',id).all();
        if (results.length !== partCount(active) || results.some((part,index) => part.partNumber !== index+1)) reject(409,'Ainda faltam partes do arquivo.');
        object = await multipart.complete(results);
      }
      if (object.size !== active.bytes) {
        await env.PRIVATE.delete(active.key);
        await sql(env,"UPDATE uploads SET state='failed' WHERE id=? AND lock_id=?",id,lockId).run();
        reject(400,'O tamanho final diverge da ficha.');
      }
      await sql(env,"UPDATE uploads SET state='ready',expires_at=? WHERE id=? AND lock_id=?",now()+hours(24*7),id,lockId).run();
      return json(await summary(env,{...active,state:'ready'}));
    }
    if (request.method === 'DELETE' && !action) {
      await multipart.abort().catch(async error => {
        if (!await env.PRIVATE.head(active.key)) throw error;
      });
      await env.PRIVATE.delete(active.key);
      await sql(env,'DELETE FROM uploads WHERE id=? AND lock_id=?',id,lockId).run();
      return new Response(null,{status:204});
    }
    reject(405,'Operação de envio inválida.');
  });
}
