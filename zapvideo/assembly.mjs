import {assemblyPlan} from '../style-atlas/dist/zapvideo-assembly.mjs';
import {isId} from '../style-atlas/dist/zapvideo-contract.mjs';
import {detectType,mediaType} from './analysis-media.mjs';
import {digest,hex,isHash,json,now,productionPilotOpen,readJson,reject,sql,uuid} from './http.mjs';

export function assemblyMode(env) {
  if (env.ENVIRONMENT==='local' && env.RENDER_LOCAL_URL==='http://127.0.0.1:4000') return 'local';
  return env.ASSEMBLY_ENABLED==='1' && env.RENDER_ENABLED==='1' && env.RENDERER &&
    (env.ENVIRONMENT!=='production' || productionPilotOpen(env)) ? 'container' : 'unavailable';
}
const findSample=(env,project,id)=>sql(env,`SELECT * FROM jobs WHERE id=? AND project_id=? AND kind='assembly'
  AND state='verified' AND expires_at>?`,id,project,now()).first();

async function uploaded(env,plan,id,upload) {
  const item=plan.materials.find(material=>material.id===id && material.permission==='process');
  if (!item || !isId(upload)) reject(400,'Autorize e envie os materiais selecionados.');
  if (item.origin?.mode==='mock' && env.ENVIRONMENT!=='local') reject(400,'Use materiais reais para esta montagem.');
  const row=await sql(env,`SELECT key,bytes,sha256 FROM uploads WHERE id=? AND project_id=? AND material_id=?
    AND state='ready' AND expires_at>?`,upload,plan.id,id,now()).first();
  if (!row || row.bytes!==item.bytes || !isHash(row.sha256)) reject(409,'Um material da montagem está indisponível.');
  return row;
}

async function snapshot(env,plan,inputs) {
  let timeline;
  try {timeline=assemblyPlan(plan);} catch(error) {reject(400,error.message);}
  const files={};
  let size=0;
  for (const source of timeline.materials) {
    if (source.kind==='generated') {
      const row=await sql(env,`SELECT result FROM jobs WHERE id=? AND project_id=? AND kind='clip'
        AND state='verified' AND expires_at>?`,source.id,plan.id,now()).first();
      const output=row&&JSON.parse(row.result)?.outputs?.[0];
      const mode=row&&JSON.parse(row.result).mode;
      if (!output || output.sha256!==source.sha256 || mode!==source.mode || (mode==='mock' && env.ENVIRONMENT!=='local')) {
        reject(409,'Um clipe vinculado está indisponível.');
      }
      files[source.id]={key:`projects/${plan.id}/jobs/${source.id}/clipe`,bytes:output.bytes,sha256:output.sha256};
    } else files[source.id]=await uploaded(env,plan,source.id,inputs?.[source.id]);
    size+=files[source.id].bytes;
  }
  if (size>1024**3) reject(413,'A montagem aceita até 1 GiB somando os insumos.');
  const basis=await digest(JSON.stringify({version:1,timeline,files:Object.entries(files).map(([id,{bytes,sha256}])=>({id,bytes,sha256}))}));
  return {files,basis};
}

export async function authorizeAssembly(env,plan,owner,{phase,inputs,approvalId}) {
  if (assemblyMode(env)==='unavailable') reject(503,'Montagem indisponível neste ambiente.');
  if (!['sample','full'].includes(phase)) reject(400,'Escolha a amostra ou a montagem completa.');
  const selected=await snapshot(env,plan,inputs);
  if (phase==='full') {
    const approval=isId(approvalId)&&await sql(env,`SELECT * FROM assembly_approvals WHERE id=? AND project_id=?
      AND owner=? AND basis_sha256=?`,approvalId,plan.id,owner,selected.basis).first();
    if (!approval) reject(409,'A montagem completa exige a aprovação da prancha, do animatic e da amostra desta versão.');
    const sample=await findSample(env,plan.id,approval.sample_job);
    if (!sample || JSON.parse(sample.result).outputs?.[0]?.sha256!==approval.sample_sha256) reject(409,'A amostra aprovada expirou.');
  }
  return {...selected,phase,...(phase==='full'?{approvalId}:{})};
}

async function checkEvidence(env,plan,evidence,type) {
  if (!evidence || !isHash(evidence.presentedSha256)) reject(400,'Apresente a prancha e o animatic para revisão.');
  const {id,uploadId,presentedSha256}=evidence;
  const material=plan.materials.find(item=>item.id===id);
  const mime=material&&mediaType(material.name)?.[1];
  if (type==='image' ? !mime?.startsWith('image/') : !['take','broll','source'].includes(material?.kind)) {
    reject(400,type==='image'?'Escolha uma prancha em PNG, JPG ou WebP.':'Escolha o vídeo do animatic.');
  }
  const row=await uploaded(env,plan,id,uploadId);
  if (row.sha256!==presentedSha256) reject(409,'A evidência difere do arquivo apresentado.');
  const stored=await env.PRIVATE.head(row.key);
  if (!stored || stored.size!==row.bytes) reject(409,'A evidência está indisponível.');
  if (type==='image') {
    if (row.bytes>2*1024**2) reject(413,'A prancha pode ter até 2 MiB.');
    const object=await env.PRIVATE.get(row.key);
    if (!object) reject(409,'A prancha está indisponível.');
    const bytes=new Uint8Array(await object.arrayBuffer());
    if (hex(await crypto.subtle.digest('SHA-256',bytes))!==row.sha256 || !detectType(bytes,mime)) reject(409,'A prancha é inválida ou mudou.');
  }
  return row.sha256;
}

export async function approveAssembly(request,env,plan,owner) {
  const data=(await readJson(request,4096)) ?? {};
  if (data.revision!==plan.revision || data.seen!==true || typeof data.message!=='string' ||
    !data.message.trim() || data.message.length>500 || !isHash(data.sampleJob) || !isHash(data.sampleSha256)) {
    reject(400,'Confirme o aceite explícito da revisão e dos materiais apresentados.');
  }
  const sample=await findSample(env,plan.id,data.sampleJob);
  const report=sample&&JSON.parse(sample.result);
  if (report?.phase!=='sample' || report.outputs?.[0]?.sha256!==data.sampleSha256 || !isHash(report.basis)) {
    reject(409,'Selecione a amostra verificada e apresentada ao projeto.');
  }
  const refs=JSON.parse(sample.parameters).inputIds;
  const current=await snapshot(env,plan,refs);
  if (current.basis!==report.basis) reject(409,'O plano ou os materiais mudaram desde a amostra.');
  const storyboard=await checkEvidence(env,plan,data.storyboard,'image');
  const animatic=await checkEvidence(env,plan,data.animatic,'video');
  const id=uuid();
  const stored=await sql(env,`INSERT INTO assembly_approvals(id,project_id,revision,owner,sample_job,sample_sha256,
    storyboard_sha256,animatic_sha256,basis_sha256,message,decided_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE id=? AND owner=? AND revision=?)
    AND (SELECT count(*) FROM assembly_approvals WHERE project_id=?)<100`,id,plan.id,plan.revision,owner,data.sampleJob,
    data.sampleSha256,storyboard,animatic,current.basis,data.message,now(),plan.id,owner,plan.revision,plan.id).run();
  if (!stored.meta.changes) reject(409,'A revisão mudou ou atingiu o limite de aprovações.');
  return json({id,revision:plan.revision},201);
}
