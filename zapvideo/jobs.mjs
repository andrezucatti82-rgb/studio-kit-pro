import {editOutputs, isId, validateProject} from '../style-atlas/dist/zapvideo-contract.mjs';
import {analysisMode, briefMode} from './gemini.mjs';
import {analysisBytes, mediaType, publicUrl} from './analysis-media.mjs';
import {digest, hours, isExpired, json, now, randomHex, readJson, reject, sql} from './http.mjs';

const active = "'queued','processing'";
export function renderMode(env) {
  return env.ENVIRONMENT === 'local' && env.RENDER_LOCAL_URL === 'http://127.0.0.1:4000' ? 'local' :
    env.RENDER_ENABLED === '1' && env.RENDERER ? 'container' : 'unavailable';
}
export const readRevision = async (env, project, revision) => {
  const record = await sql(env,'SELECT body FROM revisions WHERE project_id=? AND revision=?',project,revision).first();
  if (!record) reject(404,'Revisão indisponível.');
  return validateProject(JSON.parse(record.body));
};
export const jobInfo = row => ({id:row.id, revision:row.revision, kind:row.kind, state:row.state, error:row.error,
  result:row.result ? JSON.parse(row.result) : null, currency:row.currency, reservedMicros:row.reserved_micros});

export async function startJob(request, env, project, owner) {
  const {kind, revision, inputs = {}, key, url:publicAddress} = (await readJson(request,8192)) ?? {};
  if (!isId(key) || !['edit','brief','analysis'].includes(kind) || !Number.isSafeInteger(revision)) reject(400,'Pedido de processamento inválido.');
  const plan = await readRevision(env,project.id,revision);
  const id = await digest(`${project.id}:${revision}:${kind}:${key}`);
  let job = await sql(env,'SELECT * FROM jobs WHERE id=?',id).first();
  // A replay uses the existing persisted request and never dispatches another provider call.
  if (!job) {
    if (revision !== project.revision) reject(409,'Abra a revisão atual.');
    if (kind!=='edit' && (kind==='brief' ? briefMode(env) : analysisMode(env))==='gemini') {
      const uncertain=await sql(env,"SELECT id FROM jobs WHERE project_id=? AND state='uncertain' AND kind IN ('brief','analysis') LIMIT 1",project.id).first();
      if (uncertain) reject(409,'Existe uma chamada ao Gemini sem confirmação. Concilie o pedido antes de iniciar outro.');
    }
    let selected = {};
    if (kind === 'edit') {
      if (plan.intent.mode !== 'edit') reject(400,'Use uma ficha de edição.');
      if (renderMode(env) === 'unavailable') reject(503,'Edição online indisponível. Salve a ficha para editar no computador.');
      const required = plan.materials.filter(item => item.kind === 'source' || (item.kind === 'subtitle' && plan.actions.captions));
      for (const item of required) {
        const row = await sql(env,"SELECT id,kind,bytes FROM uploads WHERE id=? AND project_id=? AND material_id=? AND expires_at>? AND state='ready'",
          isId(inputs?.[item.id]) ? inputs[item.id] : '',project.id,item.id,now()).first();
        if (item.permission !== 'process' || row?.bytes !== item.bytes || row.kind !== item.kind) reject(400,'Conclua o envio dos materiais autorizados.');
        selected[item.id] = row.id;
      }
    } else if (kind==='brief') {
      if (plan.intent.mode !== 'create') reject(400,'Use a opção Criar um vídeo com IA.');
      if (briefMode(env) === 'unavailable') reject(503,'Gemini indisponível. Você pode continuar o briefing manualmente.');
    } else {
      if (plan.intent.mode !== 'create' || analysisMode(env)==='unavailable') reject(503,'Análise de materiais indisponível.');
      if (!inputs || typeof inputs!=='object' || Array.isArray(inputs)) reject(400,'Selecione os arquivos para análise.');
      const entries=Object.entries(inputs);
      if (entries.length>4 || (!entries.length && !publicAddress)) reject(400,'Selecione até quatro arquivos ou um endereço público.');
      let url=null;
      try { if (publicAddress) url=publicUrl(publicAddress); }
      catch (error) { reject(400,error.message); }
      let total=0;
      const uploads={};
      for (const [assetId,uploadId] of entries) {
        const asset=plan.materials.find(item=>item.id===assetId && item.permission==='process');
        if (!asset || !isId(uploadId) || !mediaType(asset.name)) reject(400,'Selecione um tipo de arquivo compatível.');
        const row=await sql(env,"SELECT bytes FROM uploads WHERE id=? AND project_id=? AND material_id=? AND state='ready' AND expires_at>?",
          uploadId,project.id,asset.id,now()).first();
        if (row?.bytes!==asset.bytes) reject(400,'Conclua o envio do arquivo selecionado.');
        uploads[asset.id]=uploadId;
        total+=asset.bytes;
      }
      if (total>analysisBytes) reject(413,'A análise aceita até 8 MiB por pedido.');
      selected={uploads,url};
    }
    await sql(env,`INSERT OR IGNORE INTO jobs(id,project_id,revision,kind,state,parameters,created_at,expires_at)
      SELECT ?,?,?,?,'queued',?,?,?
      WHERE (SELECT count(*) FROM jobs WHERE state IN (${active})) < 2
        AND (SELECT count(*) FROM jobs j JOIN projects p ON j.project_id=p.id WHERE p.owner=? AND j.state IN (${active}))=0
        AND (SELECT count(*) FROM jobs j JOIN projects p ON j.project_id=p.id WHERE p.owner=? AND j.created_at>?)<12
        AND (SELECT count(*) FROM jobs WHERE created_at>?)<40`, id,project.id,revision,kind,JSON.stringify(selected),
      now(),now()+hours(24*7),owner,owner,now()-hours(24),now()-hours(24)).run();
    job = await sql(env,'SELECT * FROM jobs WHERE id=?',id).first();
    if (!job) reject(429,'Limite de processamentos atingido. Aguarde um trabalho terminar ou tente amanhã.');
  }
  if (job.state === 'queued') {
    try { await env.JOBS.create({id,params:{id}}); }
    catch {
      const existing = await env.JOBS.get(id).then(instance => instance.status()).catch(() => null);
      if (!existing || existing.status === 'unknown') reject(503,'Processamento aguardando início. Tente novamente com a mesma revisão.');
    }
  }
  return json(jobInfo(job),202);
}

export async function jobRoute(request, env, owner, projectId, jobId, action) {
  const row = await sql(env,'SELECT * FROM jobs WHERE id=? AND project_id=?',jobId,projectId).first();
  if (!row || isExpired(row)) reject(404,'Trabalho indisponível.');
  if (request.method === 'GET' && !action) return json(jobInfo(row));
  if (request.method === 'DELETE' && !action) {
    await sql(env,`UPDATE jobs SET state='cancelled' WHERE id=? AND state IN (${active}) AND (kind='edit' OR state='queued')`,jobId).run();
    const current = await sql(env,'SELECT * FROM jobs WHERE id=?',jobId).first();
    if (current.state !== 'cancelled') reject(409,'Este trabalho já saiu da fila e não pode ser cancelado.');
    return json(jobInfo(current));
  }
  if (request.method === 'POST' && action === 'grant') {
    const {file} = await readJson(request,2048);
    if (row.state !== 'verified' || row.kind !== 'edit') reject(409,'Saídas ainda indisponíveis.');
    const plan = await readRevision(env,projectId,row.revision);
    if (!editOutputs(plan).some(output => output.id === file)) reject(404,'Arquivo indisponível.');
    const token = randomHex(32), expires = now()+900;
    const result = await sql(env,`INSERT INTO grants(hash,owner,job_id,file_id,expires_at)
      SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM grants WHERE owner=? AND expires_at>?) < 30`,
      await digest(token),owner,row.id,file,expires,owner,now()).run();
    if (!result.meta.changes) reject(429,'Limite de links temporários atingido.');
    const path = `/api/zapvideo/file/${jobId}/${file}`;
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    const response = json({url:path,expires});
    response.headers.set('Set-Cookie',`zapvideo-file=${token}; Path=${path}; Max-Age=900; HttpOnly; SameSite=Strict${secure}`);
    return response;
  }
  reject(405,'Operação de trabalho inválida.');
}
