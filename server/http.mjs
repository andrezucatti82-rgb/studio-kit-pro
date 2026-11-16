import http from 'node:http';
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {repoRoot} from './skills.mjs';
import {STYLE_ID} from './schema.mjs';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.wav':'audio/wav','.srt':'application/x-subrip','.ttf':'font/ttf','.woff2':'font/woff2','.ico':'image/x-icon'};
async function body(req,max){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('Request too large');chunks.push(chunk);}return Buffer.concat(chunks);}
async function sendFile(req,res,file,{download=false}={}){
 const stat=await fs.stat(file);if(!stat.isFile())throw Error('File not found');
 const headers={'Content-Type':mime[path.extname(file)]??'application/octet-stream','Accept-Ranges':'bytes','Content-Length':stat.size};
 if(download)headers['Content-Disposition']=`attachment; filename="${path.basename(file)}"`;
 const range=req.headers.range;
 if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);const start=Number(match?.[1]),end=match?.[2]?Number(match[2]):stat.size-1;if(!match||start>end||end>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);}
 else {res.writeHead(200,headers);if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);}
}
export function createProductionServer(orchestrator,{workflowFile}={}){
 const token=randomBytes(32).toString('hex'),atlas=path.join(repoRoot,'style-atlas/dist');
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','same-origin');res.setHeader('Referrer-Policy','no-referrer');
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   const port=server.address().port,allowedHosts=[`127.0.0.1:${port}`,`localhost:${port}`];
   if(!allowedHosts.includes(req.headers.host))return json(403,{error:'Invalid local host'});
   const origin=`http://${req.headers.host}`,url=new URL(req.url,origin);
   if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==origin))return json(403,{error:'Cross-origin requests are not allowed'});
   const authenticated=String(req.headers.cookie??'').split(';').some(v=>v.trim()===`gda_local=${token}`);
   if(url.pathname==='/api/health')return json(200,{local:true,provider:orchestrator.planner.name,supportedStyleIds:[STYLE_ID],productionApprovalsRequired:true});
   if(url.pathname==='/production-config.js'){
    if(!authenticated)return json(403,{error:'Open the local atlas first'});
    res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(`window.GDAProduction={enabled:true,token:${JSON.stringify(token)}};`);return;
   }
   if(url.pathname.startsWith('/api/')){
    if(!authenticated)return json(401,{error:'Local session required'});
    if(!['GET','HEAD'].includes(req.method)&&req.headers['x-gda-token']!==token)return json(403,{error:'Local request token required'});
    if(req.method==='POST'&&url.pathname==='/api/assets'){
     const bytes=await body(req,100*1024*1024);
     const asset=await orchestrator.store.import(bytes,{name:decodeURIComponent(String(req.headers['x-file-name']??'media')),rights:decodeURIComponent(String(req.headers['x-media-rights']??''))});return json(201,asset);
    }
    if(req.method==='POST'&&url.pathname==='/api/jobs'){
     const request=JSON.parse((await body(req,64*1024)).toString());const job=await orchestrator.submit(request,{workflowFile,idempotencyKey:req.headers['idempotency-key']});return json(202,publicJob(job));
    }
    if(req.method==='POST'&&url.pathname==='/api/plan')return json(200,await orchestrator.prepare(JSON.parse((await body(req,64*1024)).toString())));
    const match=/^\/api\/jobs\/([a-f0-9-]{36})(?:\/(cancel|candidate.mp4|edit-plan.json|technical-report.json|review.json|captions.srt|frame-\d+\.jpg))?$/.exec(url.pathname);
    if(match){const [,id,action]=match,job=orchestrator.get(id);
     if(req.method==='POST'&&action==='cancel')return json(200,publicJob(await orchestrator.cancel(id)));
     if(['GET','HEAD'].includes(req.method)){
      if(!action)return json(200,publicJob(job));
      if(!job.result||job.state!=='completed')return json(409,{error:'Result is not available'});
      if(action.startsWith('frame-')&&!job.result.frames.includes(Number(action.slice(6,-4))))return json(404,{error:'Unknown frame'});
      return await sendFile(req,res,path.join(orchestrator.directory(id),action),{download:url.searchParams.has('download')});
     }
    }
    return json(404,{error:'API route not found'});
   }
   if(!['GET','HEAD'].includes(req.method))return json(405,{error:'Method not allowed'});
   const rel=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html',file=path.resolve(atlas,rel);
   if(!file.startsWith(atlas+path.sep))return json(404,{error:'Not found'});
   if(rel==='index.html'){
    let html=await fs.readFile(file,'utf8');html=html.replace('</head>','<script src="/production-config.js"></script></head>');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Set-Cookie':`gda_local=${token}; HttpOnly; SameSite=Strict; Path=/`});res.end(req.method==='HEAD'?undefined:html);return;
   }
   return await sendFile(req,res,file);
  }catch(error){if(res.headersSent){res.destroy();return;}json(/not found|ENOENT/i.test(error.message)?404:400,{error:String(error.message).slice(0,2400)});}
 });
 server.requestTimeout=120000;server.headersTimeout=15000;return server;
}
function publicJob(job){const {authorization,...rest}=job;return {...rest,authorizationMode:authorization?.mode};}
