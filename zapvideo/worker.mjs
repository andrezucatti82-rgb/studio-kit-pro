import {WorkerEntrypoint} from 'cloudflare:workers';
import {isId, limits, validateProject} from '../style-atlas/dist/zapvideo-contract.mjs';
import {analysisMode, briefMode, briefReserve, productMode} from './gemini.mjs';
import {analysisBytes, analysisTypes} from './analysis-media.mjs';
import {digest, exactBody, hours, HttpError, isExpired, isHash, json, now, objectResponse, person, productionPilotOpen, randomHex, readJson, reject, sql} from './http.mjs';
import {jobFiles,jobRoute, readRevision, renderMode, startJob} from './jobs.mjs';
import {clipMode,clipModel,clipRoute,clipFrameMaxBytes} from './clips.mjs';
import {mediaMode,quoteMedia} from './media-assets.mjs';
import {approveAssembly,assemblyMode} from './assembly.mjs';
import {startUpload, uploadRoute} from './uploads.mjs';
import {forwardGemini} from './google-provider.mjs';
export {ZapVideoRenderer, ZapVideoWorkflow} from './workflow.mjs';

export class ZapVideoGeminiProvider extends WorkerEntrypoint {
  fetch(request) { return forwardGemini(request,this.env); }
}

const API = '/api/zapvideo';
const handoffId = /^[a-f0-9]{48}$/;
const isGet = request => ['GET','HEAD'].includes(request.method);
function safetyHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('X-Frame-Options','DENY');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function catalog(request,env,url) {
  const pinned = url.searchParams.get('v');
  if (pinned !== null && !isHash(pinned)) reject(404,'Versão do catálogo indisponível.');
  const key = pinned ? 'catalog/'+pinned+'.json' : (await (await env.ASSETS.fetch(new URL('/catalog-version.json',url))).json()).key;
  const object = await env.PUBLIC.get(key,{onlyIf:request.headers});
  if (!object) reject(pinned ? 404 : 503,'Catálogo indisponível.');
  const headers = {'ETag':object.httpEtag,'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':env.ENVIRONMENT === 'production' ?
      (pinned ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate') : 'private, no-cache'};
  if (!('body' in object)) return new Response(null,{status:304,headers});
  return new Response(request.method === 'HEAD' ? null : object.body,{headers:{...headers,'Content-Length':String(object.size)}});
}

async function putProject(request,env,id,owner) {
  let plan;
  try { plan = validateProject(await readJson(request)); }
  catch (error) { if (error instanceof HttpError) throw error; reject(400,error.message); }
  if (plan.id !== id) reject(400,'A ficha não corresponde ao projeto.');
  const prior = await sql(env,'SELECT owner,revision FROM projects WHERE id=?',id).first();
  if (prior && prior.owner !== owner) reject(404,'Projeto indisponível.');
  if (prior && prior.revision > plan.revision) reject(409,'Já existe uma revisão mais recente.');
  const body = JSON.stringify(plan);
  await env.DB.batch([
    sql(env,`INSERT OR IGNORE INTO projects(id,owner,revision,created_at)
      SELECT ?,?,?,? WHERE (SELECT count(*) FROM projects WHERE owner=?)<20`,id,owner,plan.revision,now(),owner),
    sql(env,`INSERT OR IGNORE INTO revisions(project_id,revision,body,created_at)
      SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND revision<=?)
      AND (SELECT count(*) FROM revisions WHERE project_id=?)<100`,
      id,plan.revision,body,now(),id,owner,plan.revision,id),
    sql(env,`UPDATE projects SET revision=? WHERE id=? AND owner=? AND revision<?
      AND EXISTS(SELECT 1 FROM revisions WHERE project_id=? AND revision=? AND body=?)`,plan.revision,id,owner,plan.revision,id,plan.revision,body),
  ]);
  const current = await sql(env,'SELECT owner,revision FROM projects WHERE id=?',id).first();
  if (!current) reject(429,'Limite de projetos atingido.');
  if (current.owner !== owner) reject(404,'Projeto indisponível.');
  const saved = await sql(env,'SELECT body FROM revisions WHERE project_id=? AND revision=?',id,plan.revision).first();
  if (current.revision !== plan.revision || saved?.body !== body) reject(409,'A revisão diverge do que está salvo ou atingiu o limite.');
  return json({id,revision:plan.revision});
}

async function handoff(request,env,url) {
  if (isGet(request)) {
    const id = url.searchParams.get('id');
    if (url.searchParams.size !== 1 || !handoffId.test(id || '')) reject(404,'Pacote indisponível.');
    const row = await sql(env,'SELECT * FROM handoffs WHERE hash=? AND ready=1',await digest(id)).first();
    if (!row || isExpired(row)) reject(404,'Pacote indisponível ou expirado.');
    return objectResponse(request,env.PRIVATE,row.key,{name:'zapvideo-producao.enc',download:true});
  }
  if (request.method !== 'PUT') reject(405,'Operação indisponível.');
  const owner = await person(request,env);
  const id = randomHex(24), hash = await digest(id), bytes = Number(request.headers.get('Content-Length'));
  if (request.headers.get('Content-Type') !== 'application/octet-stream' || !Number.isSafeInteger(bytes) || bytes < 33) reject(400,'Pacote inválido.');
  if (bytes > limits.handoffBytes) reject(413,'O pacote excede 32 MiB.');
  const expires = now()+hours(2), key = 'handoff/'+hash;
  const reserve = await sql(env,`INSERT INTO handoffs(hash,owner,key,bytes,expires_at)
    SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM handoffs WHERE expires_at>? AND owner=?)<5
    AND (SELECT count(*) FROM handoffs WHERE expires_at>?)<24`,hash,owner,key,bytes,expires,now(),owner,now()).run();
  if (!reserve.meta.changes) reject(429,'Limite de pacotes temporários atingido.');
  try {
    const result = await env.PRIVATE.put(key,exactBody(request,bytes),{httpMetadata:{contentType:'application/octet-stream'}});
    if (result?.size !== bytes) reject(400,'Pacote incompleto.');
    await sql(env,'UPDATE handoffs SET ready=1 WHERE hash=?',hash).run();
    return json({id,expiresAt:expires},201);
  } catch (error) {
    await env.PRIVATE.delete(key);
    await sql(env,'DELETE FROM handoffs WHERE hash=?',hash).run();
    throw error;
  }
}

async function fileGrant(request,env,job,fileId,url) {
  const token = /(?:^|;\s*)zapvideo-file=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('Cookie') || '')?.[1];
  if (!isGet(request) || !isHash(token) || !isHash(job) || !isId(fileId)) reject(404,'Arquivo indisponível.');
  const row = await sql(env,`SELECT j.project_id,j.revision,j.kind,j.parameters,j.id AS job,g.file_id
    FROM grants g JOIN jobs j ON g.job_id=j.id JOIN people p ON g.owner=p.id
    WHERE g.hash=? AND g.job_id=? AND g.file_id=? AND g.expires_at>? AND j.expires_at>? AND p.expires_at>? AND p.revoked_at IS NULL AND j.state='verified'`,
    await digest(token),job,fileId,now(),now(),now()).first();
  if (!row) reject(404,'Arquivo indisponível ou link expirado.');
  const file = (await jobFiles(env,row)).find(item => item.id === row.file_id);
  if (!file) reject(404,'Arquivo indisponível.');
  return objectResponse(request,env.PRIVATE,`projects/${row.project_id}/jobs/${row.job}/${file.id}`,
    {name:file.name,download:url.searchParams.get('download') === '1'});
}

async function api(request,env,url) {
  const segments = url.pathname.slice(API.length).split('/').slice(1);
  const [resource,id,scope,item,action,number] = segments;
  if (segments.length === 1 && resource === 'capabilities' && request.method === 'GET') {
    const pilotAvailable=productionPilotOpen(env);
    let connected=false;
    if (pilotAvailable && request.headers.has('ZapVideo-Token')) {
      try { connected=Boolean(await person(request,env)); }
      catch (error) { if (!(error instanceof HttpError) || error.status!==401) throw error; }
    }
    const visible=pilotAvailable && !connected ? {ENVIRONMENT:'production'} : env;
    return json({
      pilotAvailable,render:renderMode(visible),brief:briefMode(visible),
      briefReservedMicros:briefMode(visible)==='gemini'?briefReserve(visible):0,
      product:productMode(visible),analysis:analysisMode(visible),analysisBytes,analysisTypes,
      transcript:false,videoAI:clipMode(visible)==='gemini',clip:clipMode(visible),clipModel:clipModel(visible),clipFrameMaxBytes,
      imageAI:mediaMode(visible,'frame')==='gemini',tts:mediaMode(visible,'speech')==='gemini',music:mediaMode(visible,'music')==='gemini',
      assets:Object.fromEntries(['frame','speech','music'].map(kind=>[kind,mediaMode(visible,kind)])),assembly:assemblyMode(visible),limits,
    });
  }
  if (segments.length === 1 && resource === 'handoff') return handoff(request,env,url);
  if (segments.length === 3 && resource === 'file') return fileGrant(request,env,id,scope,url);
  const owner = await person(request,env);
  if (resource === 'session' && segments.length === 1 && request.method === 'GET') return json({connected:true});
  if (resource !== 'projects' || !isId(id) || segments.length > 6) reject(404,'Rota indisponível.');
  if (segments.length === 2 && request.method === 'PUT') return putProject(request,env,id,owner);
  const project = await sql(env,'SELECT id,revision FROM projects WHERE id=? AND owner=?',id,owner).first();
  if (!project) reject(404,'Projeto indisponível.');
  if (segments.length === 2 && request.method === 'GET') return json(await readRevision(env,id,project.revision));
  if (scope === 'uploads' && !item && request.method === 'POST') return startUpload(request,env,project,owner);
  if (scope === 'uploads' && isId(item)) return uploadRoute(request,env,id,item,action,number);
  if (scope === 'jobs' && !item && request.method === 'POST') return startJob(request,env,project,owner);
  if (scope === 'jobs' && isId(item) && segments.length <= 5) return jobRoute(request,env,owner,id,item,action);
  if (scope==='clips' && segments.length===4 && request.method==='POST' && ['approve','quote'].includes(item)) {
    return clipRoute(request,env,await readRevision(env,id,project.revision),owner,item);
  }
  if (scope==='assets' && segments.length===4 && item==='quote' && request.method==='POST') {
    return quoteMedia(request,env,await readRevision(env,id,project.revision),owner);
  }
  if (scope==='assembly' && segments.length===4 && item==='approve' && request.method==='POST') {
    return approveAssembly(request,env,await readRevision(env,id,project.revision),owner);
  }
  reject(404,'Rota indisponível.');
}

async function purge(env) {
  const cutoff = now();
  await env.DB.batch([
    sql(env,"UPDATE jobs SET state='failed',error='Processamento interrompido.' WHERE kind IN ('edit','assembly') AND state IN ('queued','processing') AND created_at<?",cutoff-1800),
    sql(env,"UPDATE jobs SET state='failed',error='Pedido não iniciado.' WHERE kind IN ('brief','analysis','clip','asset') AND state='queued' AND created_at<?",cutoff-1800),
    sql(env,"UPDATE jobs SET state='uncertain',error='Sem confirmação do Gemini.' WHERE kind IN ('brief','analysis','clip','asset') AND state='processing' AND created_at<?",cutoff-1800),
    sql(env,'DELETE FROM clip_quotes WHERE expires_at<=?',cutoff),
    sql(env,'DELETE FROM asset_quotes WHERE expires_at<=?',cutoff),
  ]);
  await sql(env,'DELETE FROM grants WHERE expires_at<=?',cutoff).run();
  const jobs = (await sql(env,"SELECT id,project_id FROM jobs WHERE expires_at<=? AND NOT (kind IN ('brief','clip','asset') AND state='uncertain' AND reserved_micros>0) LIMIT 25",cutoff).all()).results;
  for (const job of jobs) {
    await env.PRIVATE.delete(['video','corte-1','corte-2','corte-3','legendas','clipe','clipe-original',
      'quadro','narracao','trilha','asset-original','montagem'].map(id => `projects/${job.project_id}/jobs/${job.id}/${id}`));
    await sql(env,'DELETE FROM jobs WHERE id=?',job.id).run();
  }
  const uploads = (await sql(env,`SELECT * FROM uploads u WHERE expires_at<=? AND lock_until<=? AND NOT EXISTS
    (SELECT 1 FROM jobs j WHERE u.project_id=j.project_id AND j.state IN ('queued','processing')) LIMIT 25`,cutoff,cutoff).all()).results;
  for (const upload of uploads) {
    if (upload.multipart && upload.state==='open') {
      await env.PRIVATE.resumeMultipartUpload(upload.key,upload.multipart).abort().catch(() => {});
    }
    await env.PRIVATE.delete(upload.key);
    await sql(env,'DELETE FROM uploads WHERE id=?',upload.id).run();
  }
  const links = (await sql(env,'SELECT hash,key FROM handoffs WHERE expires_at<=? LIMIT 25',cutoff).all()).results;
  for (const link of links) {
    await env.PRIVATE.delete(link.key);
    await sql(env,'DELETE FROM handoffs WHERE hash=?',link.hash).run();
  }
}
async function authorizeStage(request,env) {
  if (env.ENVIRONMENT !== 'staging') return true;
  if (!isHash(env.STAGING_ACCESS_SHA256)) return false;
  const provided = request.headers.get('Authorization') || '';
  return await digest(provided) === env.STAGING_ACCESS_SHA256;
}
export default {
  async fetch(request,env) {
    try {
      if (!await authorizeStage(request,env)) return new Response('Homologação privada.',{
        status:401,headers:{'WWW-Authenticate':'Basic realm="ZapVideo staging", charset="UTF-8"','Cache-Control':'no-store'},
      });
      const url = new URL(request.url);
      if (env.ENVIRONMENT === 'production' && (url.hostname === 'www.zapvideo.com.br' ||
        (url.hostname === 'zapvideo.com.br' && url.protocol === 'http:'))) {
        url.hostname='zapvideo.com.br'; url.protocol='https:'; return Response.redirect(url,308);
      }
      if (!isGet(request) && request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) reject(403,'Origem inválida.');
      let response;
      if (url.pathname === API || url.pathname.startsWith(API+'/')) response = await api(request,env,url);
      else if (/\.php(?:\/|$)/i.test(url.pathname)) reject(404,'Rota indisponível.');
      else if (url.pathname === '/catalog.json' && isGet(request)) response = await catalog(request,env,url);
      else if (isGet(request) && ['/','/catalogo'].includes(url.pathname)) {
        const target = url.pathname === '/' ? '/zapvideo.html' : '/index.html';
        response = await env.ASSETS.fetch(new Request(new URL(target,url),request));
      }
      else response = await env.ASSETS.fetch(request);
      return safetyHeaders(response);
    } catch (error) {
      return safetyHeaders(error instanceof HttpError ? json({error:error.message},error.status) :
        json({error:'Serviço temporariamente indisponível. Tente novamente.'},503));
    }
  },
  async scheduled(_event,env) { await purge(env); },
};
