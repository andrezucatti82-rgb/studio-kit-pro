import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm,stat,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {projectFormat, validateProject, editOutputs, parseTime} from '../style-atlas/dist/zapvideo-contract.mjs';
import {encryptHandoff} from '../style-atlas/dist/zapvideo-transfer.mjs';
import {parseHandoffLink,unpackHandoff} from '../scripts/retrieve-disteven-handoff.mjs';
import {assemblyPlan,assemblySampleFrames} from '../style-atlas/dist/zapvideo-assembly.mjs';
import {probeVideo,renderAssembly,renderEdit} from '../zapvideo/renderer.mjs';
import {readSrt,suggestCuts} from '../style-atlas/dist/zapvideo-captions.mjs';
import {analyzeMaterials,proposeBrief,readProduct} from '../zapvideo/gemini.mjs';
import {detectType,publicUrl} from '../zapvideo/analysis-media.mjs';
import {durations,makeBoard,styles} from '../style-atlas/dist/zapvideo-guided.mjs';

const source = {id:'source',kind:'source',name:'câmera original.mp4',permission:'local',bytes:1};
const subtitle = {id:'srt',kind:'subtitle',name:'legendas.srt',permission:'local',bytes:1};
const shot = (start,end,x,y) => ({start,end,x,y});
function plan() {
  return {format:projectFormat,version:1,id:'exemplo',revision:1,intent:{mode:'edit',subject:''},
    materials:[{...source},{...subtitle}],scenes:[],
    actions:{captions:'mp4+srt',cuts:[shot(0.2,1.2,0,0.5),shot(1,2,1,1),shot(2,3,0.5,0)],
      treatment:{brightness:0.02,contrast:1.02,saturation:1,balance:true,denoise:true}}};
}
const hasFfmpeg = spawnSync('ffmpeg',['-version']).status === 0 && spawnSync('ffprobe',['-version']).status === 0;

test('an integrated sample clips both sides of the chosen transition to exactly 150 frames', {skip:!hasFfmpeg}, async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'zapvideo-sample-'));
  try {
    const original=path.join(root,'original.mp4');
    execFileSync('ffmpeg',['-v','error','-nostdin','-f','lavfi','-i','testsrc=size=160x240:rate=30:duration=6',
      '-vcodec','libx264','-pix_fmt','yuv420p','-threads','2',original]);
    const media={...source,name:'original.mp4',permission:'process'};
    const makeScene=(id,seconds)=>({id,title:id,narration:'',shots:[{
      id:'shot-'+id,seconds,generateSupport:false,direction:'Mostrar a gravação.',layers:[{kind:'video',materialId:media.id}]
    }]});
    const project={format:projectFormat,version:1,id:'amostra',revision:1,intent:{mode:'create',subject:'Prova sintética'},
      materials:[media],actions:{},assembly:{aspect:'9:16',sampleSceneId:'opening'},scenes:[makeScene('opening',6),makeScene('closing',4)]};
    assert.deepEqual(assemblyPlan(project).sample,{start:105,end:255});
    assert.equal(assemblyPlan(project).totalFrames,300);
    assert.throws(()=>assemblyPlan({...project,scenes:[makeScene('opening',4)]}),/pelo menos cinco segundos/);
    const rendered=await renderAssembly(project,'sample',{[media.id]:original},path.join(root,'sample'));
    const video=await probeVideo(path.join(root,'sample',rendered.outputs[0].name));
    assert.equal(Number(video.video.nb_frames),assemblySampleFrames);
    assert.equal(video.duration,5);
  }finally {await rm(root,{recursive:true,force:true});}
});

test('production pilot expires and authenticates Gemini only in the private staging entrypoint',async()=>{
  const google='https://generativelanguage.googleapis.com';
  const active=String(now()+3600);
  const expired=String(now()-1);
  const source={ENVIRONMENT:'staging',GEMINI_BRIDGE_EXPIRES_AT:active,GEMINI_API_KEY:'synthetic-google-secret'};
  let upstreamCalls=0;
  async function provider(url,init) {
    upstreamCalls++;
    assert.equal(url,google+'/v1beta/interactions');
    assert.equal(init.headers['x-goog-api-key'],'synthetic-google-secret');
    assert.equal(init.headers.Cookie,undefined);
    assert.equal(init.redirect,'manual');
    return Response.json({model:'fixture'});
  }
  const binding={fetch(request){
    assert.equal(request.headers.has('x-goog-api-key'),false);
    return forwardGemini(request,source,provider);
  }};
  const live={ENVIRONMENT:'production',ZAPVIDEO_PILOT_EXPIRES_AT:active,GEMINI_PROVIDER:binding,
    GEMINI_TEST_DAILY_BUDGET_MICROS:'2500000'};
  assert.equal(hasGeminiProvider(live),true);
  assert.equal(googleDailyBudget(live),2500000);
  const closed={...live,ZAPVIDEO_PILOT_EXPIRES_AT:expired};
  assert.equal(hasGeminiProvider(closed),false);
  assert.equal(googleDailyBudget(closed),0);
  assert.equal((await geminiFetch(closed)(google+'/v1beta/interactions')).status,503);
  const answer=await geminiFetch(live)(google+'/v1beta/interactions',{
    method:'POST',body:'{}',headers:{'Content-Type':'application/json','x-goog-api-key':'untrusted',Cookie:'untrusted'},
  });
  assert.equal(answer.status,200);
  assert.equal((await forwardGemini(new Request('https://example.test/v1beta/files/frame'),source,provider)).status,404);
  assert.equal((await forwardGemini(new Request(google+'/v1beta/files/frame?key=untrusted'),source,provider)).status,404);
  assert.equal((await forwardGemini(new Request(google+'/v1beta/files/frame'),{...source,GEMINI_BRIDGE_EXPIRES_AT:expired},provider)).status,503);
  assert.equal(upstreamCalls,1);
});

test('portable plan combines captions, three vertical cuts and treatment without changing the original', () => {
  const input=plan();
  assert.equal(validateProject(input),input);
  assert.deepEqual(editOutputs(input).map(file=>file.id),['video','corte-1','corte-2','corte-3','legendas']);
  assert.equal(parseTime('01:02,123'),62.123);
  assert(Number.isNaN(parseTime('00:60')));
  assert.throws(()=>validateProject({...input,materials:[source]}),/Envie um SRT/);
  assert.throws(()=>validateProject({...input,materials:[{...source,name:'../segredo.mp4'},subtitle]}),/Material inválido/);
  assert.throws(()=>validateProject({...input,version:999}),/incompatível/);
  assert.throws(()=>validateProject({...input,actions:{cuts:[]} }),/pelo menos um/);
  assert.throws(()=>readSrt('1\n00:00:01,000 --> 00:00:09,000\nTeste.',3),/ordem e os tempos/);
  const cues=readSrt('1\n00:00:00,000 --> 00:00:01,000\nComeço.\n\n2\n00:00:02,000 --> 00:00:03,000\nOutro ponto.',3);
  assert.deepEqual(suggestCuts(cues).map(({start,end})=>[start,end]),[[0,1],[2,3]]);
});

test('encrypted packets round trip with exact origins, routes and a verified portable sheet', async () => {
  const file=new File(['a'],'câmera original.mp4');
  const {body,key}=await encryptHandoff(plan(),[{id:'source',file}],32768);
  const id='8'.repeat(48);
  for (const origin of ['https://videos.gerenciadordeanuncios.com.br/atlas-20261119200000/cloud-handoff-abcdef123456.php',
    'https://zapvideo.com.br/api/zapvideo/handoff']) {
    const parsed=parseHandoffLink(origin+'?id='+id+'#'+key);
    const bytes=new Uint8Array(await body.arrayBuffer());
    const files=await unpackHandoff(bytes,parsed.key);
    assert.equal(files[0].filename,'projeto-video.json');
    assert.equal(files[1].data.toString(),'a');
    await assert.rejects(unpackHandoff(bytes,Buffer.alloc(32)));
  }
  assert.throws(()=>parseHandoffLink('https://zapvideo.com.br.evil.test/api/zapvideo/handoff?id='+id+'#'+key));
  assert.throws(()=>parseHandoffLink('https://zapvideo.com.br/cloud-handoff.php?id='+id+'#'+key));
});

test('Gemini fail-closed capability, HTTP payload, structured validation and failures without network', async () => {
  const mock=await proposeBrief('Prévia', {ENVIRONMENT:'local',GEMINI_MOCK:'1'});
  assert.equal(mock.mode,'mock');
  assert.equal(mock.proposal.scenes[0].narration,'Prévia');
  let calls=0;
  const sample=async (_url,init)=>{
    calls++;
    assert.equal(init.redirect,'manual');
    assert.equal(JSON.parse(init.body).response_format.mime_type,'application/json');
    return new Response(JSON.stringify({id:'fake',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(mock.proposal)}]}]}));
  };
  const env={GEMINI_BRIEF_FREE_VERIFIED:'1',GEMINI_API_KEY:'synthetic',GEMINI_BRIEF_MODEL:'gemini-test'};
  await assert.rejects(proposeBrief('Prévia',{...env,GEMINI_BRIEF_FREE_VERIFIED:'0'},sample),/indisponível/);
  assert.equal(calls,0);
  assert.equal((await proposeBrief('Prévia',env,sample)).providerId,'fake');
  assert.equal(calls,1);
  assert.match((await proposeBrief('Prévia',env,async()=>Response.json({steps:[]}))).error,/sem uma proposta/);
  await assert.rejects(proposeBrief('Prévia',env,async()=>new Response(null,{status:503})),/Google pode ter aceitado/);
});

test('recipes bind the brief to a supported goal, style, aspect and duration without exposing materials',async()=>{
  const recipe={id:'avatar',goal:'explain',style:'presenter',duration:15};
  const project={...plan(),intent:{mode:'create',subject:'Como escolher café',recipe},actions:{},assembly:{aspect:'9:16'}};
  assert.equal(validateProject(project),project);
  for (const invalid of [{id:'arbitrary-mcp'}, {goal:'custom'}, {style:'arbitrary'}, {duration:45}, {id:'carrossel'}]) {
    assert.throws(()=>validateProject({...project,intent:{...project.intent,recipe:{...recipe,...invalid}}}),/Confira a receita/);
  }
  const settings={...recipe,aspect:'9:16'};
  const {proposal}=await proposeBrief(project.intent.subject,{ENVIRONMENT:'local',GEMINI_MOCK:'1'},undefined,settings);
  assert.equal(proposal.scenes.flatMap(scene=>scene.shots).reduce((sum,shot)=>sum+shot.seconds,0),15);
  const env={GEMINI_BRIEF_FREE_VERIFIED:'1',GEMINI_API_KEY:'synthetic',GEMINI_BRIEF_MODEL:'gemini-test'};
  const mockResponse=value=>Response.json({steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(value)}]}]});
  const result=await proposeBrief(project.intent.subject,env,async (_url,init)=>{
    const {input,system_instruction}=JSON.parse(init.body);
    const parsed=JSON.parse(input);
    assert.deepEqual(Object.keys(parsed),['subject','language','direction']);
    assert.equal(parsed.direction.style,'Pessoa em cena');
    assert.equal(parsed.direction.aspect,'9:16');
    assert.equal(parsed.direction.seconds,15);
    assert.match(system_instruction,/Não inclua prompts/);
    return mockResponse(proposal);
  },settings);
  assert.deepEqual(result.proposal,proposal);
  const wrongDuration=structuredClone(proposal);
  wrongDuration.scenes[0].shots[0].seconds+=1;
  assert.match((await proposeBrief(project.intent.subject,env,async()=>mockResponse(wrongDuration),settings)).error,/sem uma proposta válida/);
});

test('multimodal sources use checked formats and known source IDs without calling a provider', async()=>{
  const asset={type:'image',mime_type:'image/png',data:'synthetic'};
  assert(detectType(Uint8Array.of(137,80,78,71,13,10,26,10),'image/png'));
  assert(!detectType(new Uint8Array(8),'image/png'));
  assert.throws(()=>publicUrl('https://127.0.0.1/'));
  assert.throws(()=>publicUrl('https://site.com.br/?token=private'));
  const media={sources:[{id:'source',label:'Imagem.png'}],input:[asset]};
  assert.equal((await analyzeMaterials('Teste',media,{ENVIRONMENT:'local',GEMINI_MOCK:'1'})).mode,'mock');
  const env={GEMINI_ANALYSIS_FREE_VERIFIED:'1',GEMINI_API_KEY:'synthetic',GEMINI_ANALYSIS_MODEL:'gemini-test'};
  const answer=await analyzeMaterials('Teste',media,env,async(_url,init)=>{
    const payload=JSON.parse(init.body);
    assert.equal(payload.input[1].mime_type,'image/png');
    return Response.json({id:'fake',steps:[{type:'model_output',content:[{type:'text',text:'[{"id":"invented","note":"Teste"}]'}]}]});
  });
  assert.match(answer.error,/sem uma análise válida/);
});

test('product intake requires a verified lookup and a public source with successful retrieval',async()=>{
  const link='https://loja.com.br/cafe';
  const env={ENVIRONMENT:'staging',GEMINI_PRODUCT_URL_VERIFIED:'1',GEMINI_BRIEF_PAID_VERIFIED:'1',GEMINI_BRIEF_RESERVE_MICROS:'30000',
    GEMINI_TEST_DAILY_BUDGET_MICROS:'5000000',GEMINI_API_KEY:'synthetic',GEMINI_BRIEF_MODEL:'gemini-test'};
  const output={name:'Café',category:'Bebidas',description:'Em grãos',recommended:'sensory'};
  const model={type:'model_output',content:[{type:'text',text:JSON.stringify(output)}]};
  let calls=0;
  const mockFetch=async(_provider,init)=>{
    calls++;
    const payload=JSON.parse(init.body);
    assert.deepEqual(JSON.parse(payload.input),{url:link});
    assert.deepEqual(payload.tools,[{type:'url_context'}]);
    assert.equal(payload.store,false);
    return Response.json({steps:[{type:'url_context_result',result:[{status:'success',url:link}]},model]});
  };
  await assert.rejects(readProduct(link,{...env,GEMINI_PRODUCT_URL_VERIFIED:'0'},mockFetch),/indisponível/);
  assert.equal(calls,0);
  assert.deepEqual((await readProduct(link,env,mockFetch)).product,{url:link,...output});
  assert.equal(calls,1);
  for (const retrieval of [{url:link,status:'paywall'},{url:'https://outrasite.com.br/',status:'success'}]) {
    const response=()=>Response.json({steps:[{type:'url_context_result',result:[retrieval]},model]});
    assert.match((await readProduct(link,env,response)).error,/não retornou dados verificáveis/);
  }
});

test('each guided storyboard uses explicit supported clip durations and style-bound directions',()=>{
  let next=0;
  for (const style of Object.keys(styles)) for (const duration of durations) {
    const scenes=makeBoard({name:'Café $&',style,duration,objective:'sell'},()=>String(++next));
    const shots=scenes.flatMap(scene=>scene.shots);
    assert.equal(shots.reduce((sum,shot)=>sum+shot.seconds,0),duration);
    assert.ok(shots.every(shot=>shot.seconds>=3 && shot.seconds<=15 && shot.direction.includes('Café $&') && !shot.layers.length));
    assert.deepEqual(shots.map(shot=>shot.example),styles[style].frames);
  }
});

test('FFmpeg applies SRT and creates three decodable vertical previews, including rotated VFR without audio',
  {skip:!hasFfmpeg}, async () => {
    const temp=await mkdtemp(path.join(os.tmpdir(),'zapvideo teste ação '));
    const raw=path.join(temp,'câmera original.mp4'), video=path.join(temp,'rotacionado.mp4'), srt=path.join(temp,'legendas.srt');
    execFileSync('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=4',
      '-vf',"select=not(mod(n\\,4))+not(mod(n\\,7))",'-fps_mode','vfr','-c:v','libx264','-pix_fmt','yuv420p',raw]);
    execFileSync('ffmpeg',['-nostdin','-v','error','-i',raw,'-c','copy','-metadata:s:v:0','rotate=90',video]);
    if (!(await probeVideo(video)).video.side_data_list?.some(data=>Math.abs(data.rotation)===90)) {
      execFileSync('ffmpeg',['-nostdin','-v','error','-y','-display_rotation','90','-i',raw,'-c','copy',video]);
    }
    await writeFile(srt,'1\r\n00:00:00,300 --> 00:00:01,500\r\nAção já começou.\r\n');
    const input=plan();
    input.materials[0].bytes=(await stat(video)).size;
    input.materials[1].bytes=(await stat(srt)).size;
    const before=await readFile(video);
    const out=path.join(temp,'entrega');
    const result=await renderEdit(input,{source:video,srt},out);
    assert.equal(result.status,'review_pending');
    assert.equal(result.outputs.length,5);
    const full=await probeVideo(path.join(out,'video-previa.mp4'));
    assert.deepEqual([full.video.width,full.video.height],[180,320]);
    for (const file of result.outputs.slice(1,4)) {
      assert.deepEqual([file.width,file.height,file.audio],[720,1280,false]);
      assert(Math.abs(file.duration-1)<0.12);
    }
    assert.match(await readFile(path.join(out,'legendas.srt'),'utf8'),/Ação já começou/);
    assert.deepEqual(await readFile(video),before);
    const broken=path.join(temp,'quebrado.mp4');
    await writeFile(broken,Buffer.alloc(before.length));
    await assert.rejects(renderEdit(input,{source:broken,srt},path.join(temp,'rejeitar')));
  });
import {forwardGemini,geminiFetch,hasGeminiProvider} from '../zapvideo/google-provider.mjs';
import {googleDailyBudget,now} from '../zapvideo/http.mjs';
