import {assemblyOutput} from '../style-atlas/dist/zapvideo-assembly.mjs';
import {isHash, json, now, objectResponse, randomHex, readJson, reject, sql} from './http.mjs';

const tokenPattern = '[a-f0-9]{48}';
const publicPath = new RegExp('^/entrega/('+tokenPattern+')(?:/(video\\.mp4)?)?$');
const validToken = new RegExp('^'+tokenPattern+'$');
const deliveryHeaders = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; font-src 'self'; img-src 'self'; media-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};
const linkUrl = token => '/entrega/'+token+'/';
const mediaKey = (project, job, file) => `projects/${project}/jobs/${job}/${file}`;
const eligible = `state='verified' AND expires_at>? AND (
  kind='edit' OR (kind='assembly' AND json_extract(parameters,'$.phase')='full'
    AND json_extract(result,'$.phase')='full'))`;

function videoOutputs(job) {
  const outputs = JSON.parse(job.result)?.outputs ?? [];
  return outputs.filter(file => file.type==='video/mp4' && isHash(file.sha256) &&
    (job.kind==='assembly' ? file.id===assemblyOutput.id : /^(?:video|corte-[1-3])$/.test(file.id)));
}

const videoLabel = id => id.startsWith('corte-') ? 'Corte '+id.slice(6) : 'Vídeo final';
const shareInfo = (token, expiresAt) => ({url:linkUrl(token),expiresAt});

export async function manageDeliveries(request, env, project, token) {
  if (request.method==='GET' && !token) {
    const clock = now();
    const {results:jobs} = await sql(env,`WITH newest AS (
      SELECT id FROM jobs WHERE project_id=? AND ${eligible} ORDER BY created_at DESC, rowid DESC LIMIT 1
    ) SELECT j.*, j.id=(SELECT id FROM newest) AS latest FROM jobs j
      WHERE j.project_id=? AND j.expires_at>? AND (j.id=(SELECT id FROM newest)
        OR EXISTS(SELECT 1 FROM delivery_links WHERE job_id=j.id))
      ORDER BY j.created_at DESC, j.rowid DESC`,project,clock,project,clock).all();
    const {results:links} = await sql(env,`SELECT d.* FROM delivery_links d JOIN jobs j ON d.job_id=j.id
      WHERE j.project_id=? AND j.expires_at>?`,project,clock).all();
    return json({deliveries:jobs.map(job => {
      const outputs = videoOutputs(job).map(file => {
        const link = links.find(row => row.job_id===job.id && row.file_id===file.id && row.sha256===file.sha256);
        return {id:file.id,sha256:file.sha256,label:videoLabel(file.id),expiresAt:job.expires_at,
          link:link ? shareInfo(link.token,job.expires_at) : null};
      }).filter(file => job.latest || file.link);
      return {jobId:job.id,revision:job.revision,latest:Boolean(job.latest),outputs};
    }).filter(job => job.outputs.length)});
  }
  if (request.method==='POST' && !token) {
    const {jobId,fileId,sha256} = (await readJson(request,2048)) ?? {};
    if (!isHash(jobId) || typeof fileId!=='string' || !isHash(sha256)) reject(400,'Selecione o MP4 revisado.');
    const job = await sql(env,`SELECT * FROM jobs WHERE id=? AND project_id=? AND ${eligible}`,jobId,project,now()).first();
    const file = job && videoOutputs(job).find(output => output.id===fileId && output.sha256===sha256);
    if (!file) reject(404,'Vídeo final indisponível.');
    const object = await env.PRIVATE.head(mediaKey(project,jobId,fileId));
    if (!object || object.size!==file.bytes || object.httpMetadata?.contentType!=='video/mp4') reject(404,'Arquivo indisponível.');
    await sql(env,`INSERT INTO delivery_links(token,job_id,file_id,sha256,created_at)
      SELECT ?,id,?,?,? FROM jobs WHERE id=? AND project_id=? AND expires_at>?
      ON CONFLICT(job_id,file_id) DO NOTHING`,randomHex(24),fileId,sha256,now(),jobId,project,now()).run();
    const link = await sql(env,'SELECT token FROM delivery_links WHERE job_id=? AND file_id=? AND sha256=?',jobId,fileId,sha256).first();
    if (!link) reject(409,'O vídeo expirou. Atualize a etapa Entrega.');
    return json(shareInfo(link.token,job.expires_at));
  }
  if (request.method==='DELETE' && validToken.test(token ?? '')) {
    const result = await sql(env,`DELETE FROM delivery_links WHERE token=?
      AND job_id IN (SELECT id FROM jobs WHERE project_id=?)`,token,project).run();
    if (!result.meta.changes) reject(404,'Link indisponível.');
    return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}});
  }
  reject(405,'Operação de entrega indisponível.');
}

function deliveryPage(label, url) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>${label} | ZapVideo</title>
<link rel="icon" href="/assets/zapvideo-icon.svg">
<link rel="stylesheet" href="/zapvideo-workspace.css">
</head>
<body>
<header class="site-header"><a href="/" aria-label="ZapVideo, início"><img width="138" height="29" src="/assets/zapvideo-logo.svg" alt="ZapVideo"></a></header>
<main class="delivery-page">
  <section>
    <h1>${label}</h1>
    <a class="primary delivery-download" href="${url}video.mp4?download=1" download>Baixar MP4</a>
  </section>
  <video controls playsinline preload="metadata" src="${url}video.mp4" aria-label="${label}"></video>
</main>
</body>
</html>`;
}

export async function publicDelivery(request, env, url) {
  const unavailable = () => new Response(request.method==='HEAD'?null:'Entrega indisponível ou expirada.',{
    status:404,headers:deliveryHeaders,
  });
  const match = publicPath.exec(url.pathname);
  if (!match || !['GET','HEAD'].includes(request.method)) return unavailable();
  const [,token,isVideo] = match;
  const row = await sql(env,`SELECT j.project_id,j.id AS job,d.file_id FROM delivery_links d
    JOIN jobs j ON j.id=d.job_id JOIN projects p ON p.id=j.project_id JOIN people o ON o.id=p.owner
    WHERE d.token=? AND j.expires_at>? AND j.state='verified' AND o.revoked_at IS NULL`,token,now()).first();
  if (!row) return unavailable();
  const key = mediaKey(row.project_id,row.job,row.file_id);
  if (isVideo) return objectResponse(request,env.PRIVATE,key,{
    name:row.file_id.startsWith('corte-')?row.file_id+'.mp4':'video-final.mp4',
    download:url.searchParams.get('download')==='1',metadata:deliveryHeaders,
  });
  if (!await env.PRIVATE.head(key)) return unavailable();
  return new Response(request.method==='HEAD'?null:deliveryPage(videoLabel(row.file_id),linkUrl(token)),{
    headers:{...deliveryHeaders,'Content-Type':'text/html; charset=utf-8'},
  });
}
