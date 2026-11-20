import {createServer} from 'node:http';
import {createReadStream, createWriteStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {renderEdit} from './renderer.mjs';
import {isId, limits, validateProject} from '../style-atlas/dist/zapvideo-contract.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(),'zapvideo-'));
const jobs = new Map();
const maxOutputBytes = 1024 ** 3;
const uploadSize = limits.videoBytes;

function json(res, status, body) {
  res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
}

async function readPlan(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 128*1024) throw new Error('Ficha excede o limite.');
    chunks.push(chunk);
  }
  return validateProject(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}

async function upload(req, job, id) {
  const bytes = Number(req.headers['content-length']);
  const sha = req.headers['zapvideo-sha256'];
  if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > uploadSize || !/^[a-f0-9]{64}$/.test(sha || '')) {
    throw new Error('Metadados de arquivo inválidos.');
  }
  const target = path.join(job.dir,id), temp = target + '.transfer';
  let total = 0;
  const hash = createHash('sha256');
  const verify = new Transform({transform(chunk, _, done) {
    total += chunk.length;
    hash.update(chunk);
    if (total > bytes) done(new Error('Arquivo acima do tamanho declarado.'));
    else done(null,chunk);
  }});
  try {
    await pipeline(req,verify,createWriteStream(temp,{flags:'wx'}),{signal:job.controller.signal});
    if (total !== bytes || hash.digest('hex') !== sha) throw new Error('Arquivo incompleto ou divergente.');
    await fs.rename(temp,target);
    job.inputs[id] = target;
  } finally {
    await fs.unlink(temp).catch(() => {});
  }
}

const server = createServer(async (req,res) => {
  try {
    const [, prefix, id, route, item, extra] = new URL(req.url,'http://renderer').pathname.split('/');
    if (prefix !== 'jobs' || !isId(id) || extra) return json(res,404,{error:'Rota indisponível.'});
    let job = jobs.get(id);
    if (!job && !route && req.method === 'DELETE') return json(res,200,{state:'removed'});
    if (!job && req.method === 'PUT' && route === 'inputs' && isId(item)) {
      if (jobs.size >= 2) return json(res,429,{error:'Renderizador ocupado.'});
      const dir = path.join(root,id);
      await fs.mkdir(dir,{recursive:true});
      job = {dir, inputs:Object.create(null), state:'pending', controller:new AbortController(), touched:Date.now()};
      jobs.set(id,job);
    }
    if (!job) return json(res,404,{error:'Processamento inexistente.'});
    job.touched = Date.now();
    if (route === 'inputs' && isId(item) && req.method === 'PUT' && job.state === 'pending') {
      if (!job.inputs[item]) await upload(req,job,item);
      else req.resume();
      return json(res,200,{state:'received'});
    }
    if (route === 'render' && !item && req.method === 'POST') {
      if (job.state !== 'pending') { req.resume(); return json(res,202,{state:job.state}); }
      const plan = await readPlan(req);
      job.state = 'working';
      job.work = renderEdit(plan,job.inputs,path.join(job.dir,'out'),
        AbortSignal.any([job.controller.signal,AbortSignal.timeout(15*60_000)])).then(report => {
        if (report.outputs.reduce((sum,file) => sum+file.bytes,0) > maxOutputBytes) throw new Error('Saídas acima do limite de entrega.');
        job.report=report; job.state='verified';
      }).catch(error => {
        job.state='failed';
        job.error=error.message;
      });
      return json(res,202,{state:'working'});
    }
    if (!route && req.method === 'GET') return json(res,200,{state:job.state,report:job.report,error:job.error});
    if (!route && req.method === 'DELETE') {
      job.controller.abort();
      await job.work;
      await fs.rm(job.dir,{recursive:true,force:true});
      jobs.delete(id);
      return json(res,200,{state:'removed'});
    }
    if (route === 'outputs' && req.method === 'GET' && job.state === 'verified') {
      const output = job.report.outputs.find(file => file.id === item);
      if (output) {
        res.writeHead(200,{'Content-Type':output.type,'Content-Length':output.bytes});
        return await pipeline(createReadStream(path.join(job.dir,'out',output.name)),res);
      }
    }
    return json(res,404,{error:'Rota indisponível.'});
  } catch (error) {
    if (res.headersSent) res.destroy();
    else json(res,400,{error:error.message});
  }
});
server.requestTimeout = 10*60_000;
server.listen(Number(process.env.PORT || 4000),process.env.RENDER_HOST || '127.0.0.1');
setInterval(() => {
  for (const [id,job] of jobs) {
    if (job.state === 'working' || Date.now()-job.touched < 20*60_000) continue;
    job.controller.abort();
    fs.rm(job.dir,{recursive:true,force:true}).then(() => jobs.delete(id)).catch(() => {});
  }
},60_000).unref();
