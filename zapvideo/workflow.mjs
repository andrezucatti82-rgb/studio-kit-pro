import {WorkflowEntrypoint} from 'cloudflare:workers';
import {Container} from '@cloudflare/containers';
import {assetOutputs,clipOutput,editOutputs} from '../style-atlas/dist/zapvideo-contract.mjs';
import {assemblyOutput} from '../style-atlas/dist/zapvideo-assembly.mjs';
import {exactBody, isHash, now, sql} from './http.mjs';
import {readRevision, renderMode} from './jobs.mjs';
import {analyzeMaterials, briefReserve, proposeBrief} from './gemini.mjs';
import {getAnalysisInput} from './analysis-media.mjs';
import {checkClipBeforeRun,clipMaxBytes} from './clips.mjs';
import {downloadOmni,omniFileState,submitOmni} from './omni.mjs';
import {checkMediaSelection,frameMaxBytes,generateMedia,mediaMaxBytes} from './media-assets.mjs';

export class ZapVideoRenderer extends Container {
  defaultPort = 4000;
  sleepAfter = '2m';
  enableInternet = false;

  async onActivityExpired() {
    if (this.container.running) await this.destroy();
  }
}

const getJob = (env,id) => sql(env,'SELECT * FROM jobs WHERE id=?',id).first();
const none = {retries:{limit:0,delay:'1 second'},timeout:'60 seconds'};
const singleRequest = {retries:{limit:0,delay:'1 second'},timeout:'4 minutes'};
const recoverable = {retries:{limit:2,delay:'3 seconds'},timeout:'3 minutes'};
const keyFor = (row,file) => `projects/${row.project_id}/jobs/${row.id}/${file}`;

function renderer(env, id) {
  const base = `/jobs/${id}`;
  if (renderMode(env) === 'local') return (suffix = '',init) => fetch(env.RENDER_LOCAL_URL+base+suffix,init);
  if (renderMode(env) === 'container') {
    const instance = env.RENDERER.getByName(id);
    return (suffix = '',init) => instance.fetch(new Request('http://renderer'+base+suffix,init));
  }
  throw new Error('Renderizador indisponível.');
}

async function releaseRenderer(env,id) {
  if (env.RENDERER) {
    // Each job owns one Container. Its verified outputs have already been copied to R2.
    await env.RENDERER.getByName(id).destroy();
  } else if (renderMode(env)==='local') {
    await (await renderer(env,id)('',{method:'DELETE'})).body?.cancel();
  }
}

async function responseJson(response,operation='operação') {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('O renderizador recusou '+operation+' (HTTP '+response.status+').');
  }
  return response.json();
}

async function reserveOutput(env,job,total) {
  const claimed=await sql(env,`UPDATE jobs SET output_bytes=? WHERE id=? AND state='processing'
      AND (SELECT coalesce(sum(output_bytes),0) FROM jobs WHERE id<>?)+?<=?
      AND (SELECT coalesce(sum(j.output_bytes),0) FROM jobs j JOIN projects p ON p.id=j.project_id
        WHERE j.id<>? AND p.owner=(SELECT owner FROM projects WHERE id=?))+?<=?`,
    total,job.id,job.id,total,4*1024**3,job.id,job.project_id,total,2*1024**3).run();
  if (!claimed.meta.changes) throw new Error('Armazenamento de entregas no limite.');
}

class InvalidGeneratedMedia extends Error {}
async function verifyGenerated(env,id,step,{spec,output,maximum,original,route,settings,extra}) {
  await step.do('Iniciar verificação da mídia',recoverable,async ()=>{
    const job=await getJob(env,id);
    if (job.state!=='processing') return;
    const request=renderer(env,id);
    if (spec.mode==='gemini') {
      const current=await request();
      if (current.status===404) await current.body?.cancel();
      else if ((await responseJson(current)).state!=='pending') return;
      const source=await env.PRIVATE.get(keyFor(job,original));
      const sha256=source?.customMetadata?.sha256;
      if (!source || !isHash(sha256) || source.size>maximum) {
        await source?.body.cancel();
        throw new Error('Arquivo do provedor indisponível.');
      }
      await responseJson(await request('/inputs/candidate',{method:'PUT',
        headers:{'Content-Length':String(source.size),'ZapVideo-SHA256':sha256},body:source.body}));
    }
    await responseJson(await request('/'+route+(spec.mode==='mock'?'-fixture':'-verify'),{
      method:'POST',body:JSON.stringify(settings),
    }));
  });
  for (let poll=0;poll<50;poll++) {
    const current=await step.do('Consultar verificação da mídia '+poll,recoverable,async ()=>{
      const job=await getJob(env,id);
      if (job.state==='cancelled') return {state:'cancelled'};
      return responseJson(await renderer(env,id)());
    });
    if (current.state==='cancelled') return;
    if (current.state==='failed') throw new InvalidGeneratedMedia('Falha na verificação de formato e decodificação.');
    if (current.state==='verified') {
      await step.do('Liberar mídia verificada',recoverable,async ()=>{
        const job=await getJob(env,id), report=current.report, file=report?.outputs?.[0];
        if (!file || file.id!==output.id || file.name!==output.name || file.type!==output.type || !isHash(file.sha256) ||
          !Number.isSafeInteger(file.bytes) || file.bytes<=0 || file.bytes>maximum) throw new Error('Relatório da mídia incompatível.');
        await reserveOutput(env,job,file.bytes);
        const response=await renderer(env,id)('/outputs/'+file.id);
        if (!response.ok) {await response.body?.cancel();throw new Error('Entrega indisponível.');}
        const saved=await env.PRIVATE.put(keyFor(job,file.id),exactBody(response,file.bytes),
          {sha256:file.sha256,httpMetadata:{contentType:file.type}});
        if (saved?.size!==file.bytes) throw new Error('Arquivo incompleto.');
        await sql(env,"UPDATE jobs SET state='verified',result=? WHERE id=? AND state='processing'",
          JSON.stringify({...report,project:job.project_id,revision:job.revision,mode:spec.mode,...extra}),id).run();
      });
      return;
    }
    await step.sleep('Aguardar verificação da mídia '+poll,'5 seconds');
  }
  throw new Error('Verificação da mídia expirou.');
}

async function cleanGenerated(env,id,step,needsRenderer,original,output) {
  await step.do('Limpar mídia temporária',recoverable,async ()=>{
    const job=await getJob(env,id);
    if (needsRenderer) {
      try {await releaseRenderer(env,id);}
      catch { /* O Container tem expiração própria. */ }
    }
    await env.PRIVATE.delete(keyFor(job,original));
    if (job.output_bytes && job.state!=='verified' && job.state!=='processing') {
      await env.PRIVATE.delete(keyFor(job,output));
      await sql(env,'UPDATE jobs SET output_bytes=0 WHERE id=?',id).run();
    }
  });
}

export class ZapVideoWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const {id} = event.payload, env = this.env;
    const started = await step.do('Iniciar trabalho',recoverable,async () => {
      await sql(env,"UPDATE jobs SET state='processing' WHERE id=? AND state='queued'",id).run();
      const job = await getJob(env,id);
      return job?.state === 'processing' ? job.kind : null;
    });
    if (!started) return;
    if (started==='clip') return this.clip(id,step);
    if (started==='asset') return this.asset(id,step);
    if (started==='assembly') return this.edit(id,step,true);
    if (started !== 'edit') return this.gemini(id,step);
    return this.edit(id,step);
  }

  async clip(id,step) {
    const env=this.env;
    let needsRenderer=false;
    let failure='Não foi possível preparar ou verificar o clipe. Confira o plano e o quadro.';
    let confirmedFailure=false;
    try {
      const spec=await step.do('Conferir aprovação do clipe',recoverable,async ()=>{
        const job=await getJob(env,id);
        if (job.state!=='processing') return null;
        const person=await sql(env,`SELECT p.owner FROM projects p JOIN people u ON p.owner=u.id
          WHERE p.id=? AND u.revoked_at IS NULL AND u.expires_at>?`,job.project_id,now()).first();
        if (!person) throw new Error('Código de acesso expirado.');
        const plan=await readRevision(env,job.project_id,job.revision);
        const {mode,scope}=await checkClipBeforeRun(env,plan,person.owner,JSON.parse(job.parameters));
        return {project:plan.id,revision:plan.revision,owner:person.owner,mode,aspect:scope.aspect,
          seconds:scope.seconds,sceneId:scope.sceneId,shotId:scope.shotId};
      });
      if (!spec) return;
      if (spec.mode==='gemini') {
        const submission=await step.do('Enviar uma vez ao Google',singleRequest,async ()=>{
          const job=await getJob(env,id);
          if (job.provider_file_id) return {fileId:job.provider_file_id};
          const plan=await readRevision(env,job.project_id,job.revision);
          const request=await checkClipBeforeRun(env,plan,spec.owner,JSON.parse(job.parameters));
          const claim=await sql(env,`UPDATE jobs SET provider_claim_at=? WHERE id=? AND state='processing'
            AND provider_claim_at IS NULL
            AND EXISTS(SELECT 1 FROM people WHERE id=? AND revoked_at IS NULL AND expires_at>?)`,now(),id,spec.owner,now()).run();
          if (!claim.meta.changes) throw new Error('Aceitação anterior sem confirmação.');
          const sent=await submitOmni(request,env.GEMINI_API_KEY);
          if (sent.rejected) return sent;
          await sql(env,'UPDATE jobs SET provider_id=?,provider_file_id=? WHERE id=?',sent.id,sent.fileId,id).run();
          return {fileId:sent.fileId};
        });
        if (submission.rejected) {
          confirmedFailure=true;
          const diagnostic=Number.isInteger(submission.status)
            ? ' (HTTP '+submission.status+(submission.field?', campo '+submission.field:'')+')':'';
          failure='O Google recusou o clipe'+diagnostic+'.';
          throw new Error(failure);
        }
        if (!submission.fileId) throw new Error('Arquivo do Google pendente de conciliação.');
        let ready=false;
        for (let poll=0;poll<60;poll++) {
          const state=await step.do('Consultar clipe do Google '+poll,recoverable,
            ()=>omniFileState(submission.fileId,env.GEMINI_API_KEY));
          if (state==='ACTIVE') { ready=true; break; }
          if (state==='FAILED') {
            confirmedFailure=true;
            failure='O Google informou que o clipe falhou.';
            throw new Error(failure);
          }
          await step.sleep('Aguardar clipe do Google '+poll,'5 seconds');
        }
        if (!ready) throw new Error('O Google ainda não disponibilizou o clipe.');
        await step.do('Guardar MP4 para verificação',recoverable,async ()=>{
          const job=await getJob(env,id);
          const received=await downloadOmni(submission.fileId,env.GEMINI_API_KEY);
          const saved=await env.PRIVATE.put(keyFor(job,'clipe-original'),received.bytes,
            {sha256:received.sha256,customMetadata:{sha256:received.sha256},httpMetadata:{contentType:'video/mp4'}});
          if (saved?.size!==received.bytes.length) throw new Error('O arquivo recebido está incompleto.');
        });
      }
      needsRenderer=true;
      await verifyGenerated(env,id,step,{spec,output:clipOutput,maximum:clipMaxBytes,original:'clipe-original',route:'clip',
        settings:{aspect:spec.aspect,seconds:spec.seconds},extra:{sceneId:spec.sceneId,shotId:spec.shotId}});
    } catch(error) {
      if (error instanceof InvalidGeneratedMedia) {
        failure='O clipe falhou na verificação de formato, duração, áudio ou decodificação.';
        confirmedFailure=true;
      }
      await step.do('Registrar interrupção do clipe',recoverable,async ()=>{
        const job=await getJob(env,id);
        const uncertain=job.provider_claim_at && !confirmedFailure;
        await sql(env,"UPDATE jobs SET state=?,error=? WHERE id=? AND state='processing'",
          uncertain?'uncertain':'failed',uncertain?'Resultado sem confirmação. Concilie no Google antes de repetir.':failure,id).run();
      });
    } finally {
      await cleanGenerated(env,id,step,needsRenderer,'clipe-original',clipOutput.id);
    }
  }

  async asset(id,step) {
    const env=this.env;
    let needsRenderer=false, output;
    let rejection;
    try {
      const spec=await step.do('Conferir configuração da mídia',recoverable,async ()=>{
        const job=await getJob(env,id);
        if (job.state!=='processing') return null;
        const person=await sql(env,`SELECT p.owner FROM projects p JOIN people u ON p.owner=u.id
          WHERE p.id=? AND u.revoked_at IS NULL AND u.expires_at>?`,job.project_id,now()).first();
        if (!person) throw new Error('Código de acesso expirado.');
        return {...checkMediaSelection(env,JSON.parse(job.parameters)),owner:person.owner};
      });
      if (!spec) return;
      const {scope}=spec;
      output=assetOutputs[scope.kind];
      const maximum=scope.kind==='frame'?frameMaxBytes:mediaMaxBytes;
      if (spec.mode==='gemini') {
        const accepted=await step.do('Solicitar mídia uma vez',singleRequest,async ()=>{
          const job=await getJob(env,id);
          if (job.provider_claim_at && await env.PRIVATE.head(keyFor(job,'asset-original'))) return {};
          const claim=await sql(env,`UPDATE jobs SET provider_claim_at=? WHERE id=? AND provider_claim_at IS NULL AND state='processing'
            AND EXISTS(SELECT 1 FROM people WHERE id=? AND expires_at>? AND revoked_at IS NULL)`,now(),id,spec.owner,now()).run();
          if (!claim.meta.changes) throw new Error('Aceitação anterior sem confirmação.');
          const result=await generateMedia(checkMediaSelection(env,spec),env.GEMINI_API_KEY);
          if (result.rejected) return {error:'O Google recusou o pedido de mídia.'};
          await sql(env,'UPDATE jobs SET provider_id=? WHERE id=?',result.id,id).run();
          if (result.error) return {error:result.error};
          const saved=await env.PRIVATE.put(keyFor(job,'asset-original'),result.bytes,{
            sha256:result.sha256,customMetadata:{sha256:result.sha256},httpMetadata:{contentType:output.type},
          });
          if (saved?.size!==result.bytes.length) throw new Error('Arquivo incompleto.');
          return {};
        });
        rejection=accepted.error;
        if (rejection) throw new Error(rejection);
      }
      needsRenderer=true;
      await verifyGenerated(env,id,step,{spec,output,maximum,original:'asset-original',route:'asset',
        settings:{kind:scope.kind,aspect:scope.aspect},extra:{
          mediaKind:scope.kind,sceneId:scope.sceneId,shotId:scope.shotId,aspect:scope.aspect,voice:scope.voice,
        }});
    } catch(error) {
      await step.do('Registrar interrupção da mídia',recoverable,async ()=>{
        const job=await getJob(env,id);
        const uncertain=job.provider_claim_at && !rejection && !(error instanceof InvalidGeneratedMedia);
        await sql(env,"UPDATE jobs SET state=?,error=? WHERE id=? AND state='processing'",
          uncertain?'uncertain':'failed',uncertain?'Resultado sem confirmação. Concilie no Google antes de repetir.':
            (rejection || 'A mídia falhou na verificação ou no processamento.'),id).run();
      });
    } finally {
      if (output) await cleanGenerated(env,id,step,needsRenderer,'asset-original',output.id);
    }
  }

  async gemini(id,step) {
    const env = this.env;
    try {
      const result = await step.do('Consultar Gemini',none,async () => {
        const job = await getJob(env,id);
        const plan = await readRevision(env,job.project_id,job.revision);
        if (job.kind==='brief') {
          if (job.reserved_micros!==briefReserve(env)) return {error:'A configuração da reserva mudou.',providerId:null};
          if (job.reserved_micros>0) {
            const claim=await sql(env,`UPDATE jobs SET provider_claim_at=?
              WHERE id=? AND state='processing' AND provider_claim_at IS NULL`,now(),id).run();
            if (!claim.meta.changes) throw new Error('Aceitação anterior sem confirmação.');
          }
          return proposeBrief(plan.intent.subject,env);
        }
        let media;
        try { media=await getAnalysisInput(env,plan,JSON.parse(job.parameters)); }
        catch { return {error:'Confira formato real, tamanho e acesso aos arquivos selecionados.',providerId:null}; }
        return analyzeMaterials(plan.intent.subject,media,env);
      });
      await step.do('Registrar proposta',recoverable,async () => {
        await sql(env,"UPDATE jobs SET state=?,result=?,error=?,provider_id=? WHERE id=? AND state='processing'",
          result.error?'failed':'verified',result.error?null:JSON.stringify({mode:result.mode,proposal:result.proposal,analysis:result.analysis}),
          result.error ?? null,result.providerId,id).run();
      });
    } catch {
      await step.do('Registrar resposta incerta',recoverable,async () => {
        await sql(env,"UPDATE jobs SET state='uncertain',error=? WHERE id=? AND state='processing'",
          'Sem confirmação do Gemini. Confira no provedor antes de repetir. O briefing manual continua disponível.',id).run();
      });
    }
  }

  async edit(id,step,assembly=false) {
    const env = this.env;
    let error = 'O processamento falhou. Confira o formato do vídeo e os tempos da ficha.';
    try {
      await step.do('Entregar originais e iniciar FFmpeg',recoverable,async () => {
        const job = await getJob(env,id);
        if (job.state !== 'processing') return;
        const request = renderer(env,id);
        const state = await request();
        if (state.status !== 404 && (await responseJson(state,'a consulta do estado inicial')).state !== 'pending') return;
        await state.body?.cancel().catch(() => {});
        const plan = await readRevision(env,job.project_id,job.revision);
        const selected=JSON.parse(job.parameters);
        for (const [material,upload] of Object.entries(assembly?selected.files:selected)) {
          const row=assembly?upload:await sql(env,"SELECT key,bytes,sha256 FROM uploads WHERE id=? AND project_id=? AND state='ready' AND expires_at>?",
            upload,job.project_id,now()).first();
          if (!row) throw new Error('Material indisponível.');
          const object = await env.PRIVATE.get(row.key);
          if (!object || object.size !== row.bytes) throw new Error('Material incompleto.');
          await responseJson(await request('/inputs/'+material,{method:'PUT',body:object.body,
            headers:{'Content-Length':String(object.size),'ZapVideo-SHA256':row.sha256}}),'o envio do material');
        }
        const renderPlan=assembly?{plan,phase:selected.phase}:plan;
        await responseJson(await request(assembly?'/render-assembly':'/render',{method:'POST',body:JSON.stringify(renderPlan)}),'o início do processamento');
      });
      for (let poll = 0; poll < 100; poll++) {
        const state = await step.do('Consultar FFmpeg '+poll,recoverable,async () => {
          const job = await getJob(env,id);
          if (job.state === 'cancelled') return {state:'cancelled'};
          return responseJson(await renderer(env,id)());
        });
        if (state.state === 'cancelled') return;
        if (state.state === 'failed') {
          error = typeof state.error === 'string' ? state.error.slice(0,240) : error;
          throw new Error(error);
        }
        if (state.state === 'verified') {
          await step.do('Gravar e liberar entregas verificadas',recoverable,async () => {
            const job = await getJob(env,id);
            if (job.state !== 'processing') return;
            const plan = await readRevision(env,job.project_id,job.revision);
            const expected=assembly?[assemblyOutput]:editOutputs(plan), report=state.report;
            if (report?.project !== job.project_id || report.revision !== job.revision || report.outputs?.length !== expected.length) {
              throw new Error('Relatório incompatível.');
            }
            if (assembly) {
              const selection=JSON.parse(job.parameters);
              if (report.phase!==selection.phase) throw new Error('Fase de montagem incompatível.');
              report.basis=selection.basis;
            }
            const total = report.outputs.reduce((sum,file) => sum+file.bytes,0);
            if (!Number.isSafeInteger(total) || total <= 0 || total > 1024 ** 3) throw new Error('Tamanho de entregas inválido.');
            await reserveOutput(env,job,total);
            const request = renderer(env,id);
            for (const item of expected) {
              const output = report.outputs.find(file => file.id === item.id);
              if (!isHash(output?.sha256) || output.name !== item.name || !Number.isSafeInteger(output.bytes) ||
                output.bytes <= 0 || output.bytes > 1024 ** 3) throw new Error('Entrega incompatível.');
              const response = await request('/outputs/'+item.id);
              if (!response.ok) { await response.body?.cancel(); throw new Error('Entrega indisponível.'); }
              const data = await env.PRIVATE.put(keyFor(job,item.id),exactBody(response,output.bytes),
                {sha256:output.sha256,httpMetadata:{contentType:item.type}});
              if (data?.size !== output.bytes) throw new Error('Entrega incompleta.');
            }
            await sql(env,"UPDATE jobs SET state='verified',result=? WHERE id=? AND state='processing'",JSON.stringify(report),id).run();
          });
          return;
        }
        await step.sleep('Aguardar FFmpeg '+poll,'10 seconds');
      }
      throw new Error('Prazo de processamento excedido.');
    } catch {
      await step.do('Registrar falha de edição',recoverable,async () => {
        await sql(env,"UPDATE jobs SET state='failed',error=? WHERE id=? AND state='processing'",error,id).run();
      });
    } finally {
      await step.do('Liberar espaço do renderizador',none,async () => {
        try {await releaseRenderer(env,id);}
        catch { /* Container inactivity and R2 retention also cover interruptions. */ }
      });
      await step.do('Limpar entregas incompletas',recoverable,async () => {
        const job = await getJob(env,id);
        if (!job?.output_bytes || job.state === 'verified' || job.state === 'processing') return;
        const plan = await readRevision(env,job.project_id,job.revision);
        const outputs=assembly?[assemblyOutput]:editOutputs(plan);
        await env.PRIVATE.delete(outputs.map(({id}) => keyFor(job,id)));
        await sql(env,'UPDATE jobs SET output_bytes=0 WHERE id=?',id).run();
      });
    }
  }
}
