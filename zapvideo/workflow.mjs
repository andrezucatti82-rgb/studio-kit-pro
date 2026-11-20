import {WorkflowEntrypoint} from 'cloudflare:workers';
import {Container} from '@cloudflare/containers';
import {editOutputs} from '../style-atlas/dist/zapvideo-contract.mjs';
import {exactBody, isHash, now, sql} from './http.mjs';
import {readRevision, renderMode} from './jobs.mjs';
import {analyzeMaterials, proposeBrief} from './gemini.mjs';
import {getAnalysisInput} from './analysis-media.mjs';

export class ZapVideoRenderer extends Container {
  defaultPort = 4000;
  sleepAfter = '2m';
  enableInternet = false;
}

const getJob = (env,id) => sql(env,'SELECT * FROM jobs WHERE id=?',id).first();
const none = {retries:{limit:0,delay:'1 second'},timeout:'60 seconds'};
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

async function responseJson(response) {
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error('O renderizador não aceitou a operação.');
  }
  return response.json();
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
    if (started !== 'edit') return this.gemini(id,step);
    return this.edit(id,step);
  }

  async gemini(id,step) {
    const env = this.env;
    try {
      const result = await step.do('Consultar Gemini',none,async () => {
        const job = await getJob(env,id);
        const plan = await readRevision(env,job.project_id,job.revision);
        if (job.kind==='brief') return proposeBrief(plan.intent.subject,env);
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

  async edit(id,step) {
    const env = this.env;
    let error = 'O processamento falhou. Confira o formato do vídeo e os tempos da ficha.';
    try {
      await step.do('Entregar originais e iniciar FFmpeg',recoverable,async () => {
        const job = await getJob(env,id);
        if (job.state !== 'processing') return;
        const request = renderer(env,id);
        const state = await request();
        if (state.status !== 404 && (await responseJson(state)).state !== 'pending') return;
        await state.body?.cancel().catch(() => {});
        const plan = await readRevision(env,job.project_id,job.revision);
        for (const [material, upload] of Object.entries(JSON.parse(job.parameters))) {
          const row = await sql(env,"SELECT key,bytes,sha256 FROM uploads WHERE id=? AND project_id=? AND state='ready' AND expires_at>?",
            upload,job.project_id,now()).first();
          if (!row) throw new Error('Material indisponível.');
          const object = await env.PRIVATE.get(row.key);
          if (!object || object.size !== row.bytes) throw new Error('Material incompleto.');
          await responseJson(await request('/inputs/'+material,{method:'PUT',body:object.body,
            headers:{'Content-Length':String(object.size),'ZapVideo-SHA256':row.sha256}}));
        }
        await responseJson(await request('/render',{method:'POST',body:JSON.stringify(plan)}));
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
            const expected = editOutputs(plan), report = state.report;
            if (report?.project !== job.project_id || report.revision !== job.revision || report.outputs?.length !== expected.length) {
              throw new Error('Relatório incompatível.');
            }
            const total = report.outputs.reduce((sum,file) => sum+file.bytes,0);
            if (!Number.isSafeInteger(total) || total <= 0 || total > 1024 ** 3) throw new Error('Tamanho de entregas inválido.');
            const claimed = await sql(env,`UPDATE jobs SET output_bytes=? WHERE id=? AND state='processing'
              AND (SELECT coalesce(sum(output_bytes),0) FROM jobs WHERE id<>?)+?<=?
              AND (SELECT coalesce(sum(j.output_bytes),0) FROM jobs j JOIN projects p ON p.id=j.project_id
                WHERE j.id<>? AND p.owner=(SELECT owner FROM projects WHERE id=?))+?<=?`,
              total,id,id,total,4*1024**3,id,job.project_id,total,2*1024**3).run();
            if (!claimed.meta.changes) throw new Error('Armazenamento de entregas no limite.');
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
        try {
          const response = await renderer(env,id)('',{method:'DELETE'});
          await response.body?.cancel();
        } catch { /* Container inactivity and R2 retention also cover interruptions. */ }
      });
      await step.do('Limpar entregas incompletas',recoverable,async () => {
        const job = await getJob(env,id);
        if (!job?.output_bytes || job.state === 'verified' || job.state === 'processing') return;
        const plan = await readRevision(env,job.project_id,job.revision);
        await env.PRIVATE.delete(editOutputs(plan).map(({id}) => keyFor(job,id)));
        await sql(env,'UPDATE jobs SET output_bytes=0 WHERE id=?',id).run();
      });
    }
  }
}
