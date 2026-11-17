import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {graphPlanSchema,validateGraphPlan} from '../server/scene-graph.mjs';
import {AssetStore,digest} from '../server/assets.mjs';
import {editGraph} from '../server/graph-editor.mjs';
import {run,probe} from '../server/process.mjs';
import {anchorPositionAt,layerVisibleAt} from '../src/production/presenter.mjs';
import {validateCatalog} from '../scripts/validate.mjs';
import {bundle} from '@remotion/bundler';
import {renderStill,selectComposition} from '@remotion/renderer';
import '../style-atlas/dist/workflow.js';
const catalog=JSON.parse(await fs.readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
const styleId='explicador-objeto-na-mao';
function plan(layers){return graphPlanSchema.parse({schemaVersion:2,provider:'agent',styleId,selectedStyleIds:[styleId],contextSha256:'a'.repeat(64),objective:'Explicar com o vídeo original',output:{format:'16:9',width:1280,height:720,fps:30,durationFrames:60,codec:'h264'},fidelity:{preserveOriginals:true,inventAngles:false,avatar:false},scenes:[{id:'shot',durationFrames:60,role:'body',background:'#123456',initialState:'Pessoa e objeto separados',action:'O objeto acompanha a palma medida',result:'Explicação legível',transition:{type:'cut',durationFrames:0,reason:'Um take contínuo'},layers}],audio:{proceduralScore:false,tracks:[]},captions:[],styleBindings:[{styleId,aspect:'style_direction',scope:'film',sceneIds:['shot'],decision:'Vídeo preservado e ponto da mão medido',implementation:'layers',referenceIds:[styleId+':frame:1']}],limitations:['Prova técnica; não é aprovação audiovisual']});}
const presenter={id:'presenter',type:'media',assetId:'original',sourceStartSeconds:0,x:0,y:0,width:1,height:1};
const shape={id:'object',type:'shape',shape:'rect',fill:'#FFCC00',x:.1,y:.1,width:.1,height:.1,anchorTrack:{sourceAssetId:'original',sourceStartSeconds:0,origin:'manual',space:'output-normalized',points:[{frame:0,x:.2,y:.5,confidence:1},{frame:59,x:.8,y:.5,confidence:1}]}};
const assets=[{id:'original',kind:'video',durationSeconds:2,width:192,height:108,hasAudio:false}];
test('20 original presenter directions append without changing any existing style, with 80 unique frames and honest requirements',async()=>{
 validateCatalog(catalog);assert.equal(catalog.styles.length,1180);assert.equal(catalog.families.length,30);
 const previous=JSON.parse(await fs.readFile(new URL('../style-atlas/records/presenter-20/previous-catalog.json',import.meta.url),'utf8'));
 assert.equal(digest(Buffer.from(JSON.stringify(catalog.styles.slice(0,1160)))),previous.stylesSha256);
 const rows=catalog.styles.filter(s=>s.family==='explicadores'),hashes=new Set();assert.equal(rows.length,20);
 for(const s of rows){assert.equal(s.preset.avatar,false);assert.equal(s.presenterEditing.automaticSegmentation,false);assert.equal(s.presenterEditing.automaticGestureTracking,false);assert.equal(s.sequence.conceptApproval,'pending_user_review');assert(!s.preview);assert(s.presenterEditing.presenterSources.includes('explicitly_selected_avatar'));
  for(const f of s.sequence.frames){const data=await fs.readFile(new URL('../style-atlas/dist/'+f.src,import.meta.url));hashes.add(digest(data));}
  const prompt=AtlasWorkflow.buildPrompt({selectedStyles:[{...s,referenceFrame:AtlasWorkflow.referenceFrame(s),visualSequence:s.sequence}],topic:'Uma explicação',format:'9:16',targetDurationSeconds:30,fidelityContract:AtlasWorkflow.fidelityContract});assert(prompt.includes(s.presenterEditing.recipeId));assert(prompt.includes(s.requirements));
 }
 assert.equal(hashes.size,80);
});
test('measured anchor uses registered original footage, rejects gaps, uncertain points, conflicting motion and offscreen results',()=>{
 const p=plan([presenter,shape]);validateGraphPlan(p,assets);assert.deepEqual(anchorPositionAt(p.scenes[0].layers[1].anchorTrack,29.5,.1,.1),{x:.45,y:.45});assert(layerVisibleAt({fromFrame:10,durationFrames:5},14));assert(!layerVisibleAt({fromFrame:10,durationFrames:5},15));
 for(const change of [p=>p.scenes[0].layers[1].anchorTrack.points[0].confidence=.2,p=>p.scenes[0].layers[1].anchorTrack.points[1].frame=30,p=>p.scenes[0].layers[1].anchorTrack.sourceAssetId='unknown',p=>p.scenes[0].layers[1].anchorTrack.points[1].x=1,p=>p.scenes[0].layers[1].animations=[{property:'x',keyframes:[{frame:0,value:0},{frame:59,value:.2}]}]]){const bad=structuredClone(p);change(bad);assert.throws(()=>validateGraphPlan(bad,assets));}
});
test('speech captions preserve every word and reject guessed overlapping timing or omitted text',()=>{
 const p=plan([{id:'words',type:'text',text:'Sua ideia aparece.',x:.1,y:.1,width:.8,height:.3,fontSize:60,color:'#FFFFFF',kinetic:'speech',speechWords:[{text:'Sua',fromFrame:0,toFrame:10},{text:'ideia',fromFrame:12,toFrame:30},{text:'aparece.',fromFrame:31,toFrame:55}]}]);validateGraphPlan(p,[]);
 for(const change of [p=>p.scenes[0].layers[0].speechWords.pop(),p=>p.scenes[0].layers[0].speechWords[1].fromFrame=5,p=>p.scenes[0].layers[0].speechWords[2].toFrame=61]){const bad=structuredClone(p);change(bad);assert.throws(()=>validateGraphPlan(bad,[]));}
});
test('a supplied mask creates genuine alpha video through FFmpeg without altering the source, including transparent source re-import',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-alpha-'));
 try{
  const video=path.join(root,'original.mp4'),mask=path.join(root,'mask.png');
  await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=red:s=192x108:r=30:d=2','-c:v','libx264','-pix_fmt','yuv420p',video]);
  await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=black:s=192x108,drawbox=x=0:y=0:w=96:h=108:color=white:t=fill','-frames:v','1','-threads','1',mask]);
  const store=new AssetStore(path.join(root,'assets'));await store.init();const original=await store.import(await fs.readFile(video),{rights:'Code-authored original synthetic test clip'}),matte=await store.import(await fs.readFile(mask),{rights:'Code-authored synthetic binary test mask'});
  const p=plan([{...presenter,assetId:original.id,maskAssetId:matte.id}]);const prepared=validateGraphPlan(p,[original,matte]);const edited=await editGraph(prepared,store,path.join(root,'work'));const media=edited.plan.media['shot:presenter'];assert.equal(media.transparent,true);assert.match(media.src,/\.webm$/);
  const file=path.join(edited.publicDir,media.src),info=await probe(file);assert.equal(String(info.streams[0].tags.alpha_mode),'1');
  const rgba=execFileSync('ffmpeg',['-v','error','-c:v','libvpx-vp9','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1']);assert.equal(rgba[(54*192+40)*4+3],255);assert.equal(rgba[(54*192+150)*4+3],0);
  assert.equal(digest(await fs.readFile(video)),original.sha256);
  const alpha=await store.import(await fs.readFile(file),{rights:'Original synthetic transparency test output'});assert(alpha.hasAlpha);const roundtrip=await editGraph(validateGraphPlan(plan([{...presenter,assetId:alpha.id}]),[alpha]),store,path.join(root,'roundtrip'));assert(roundtrip.plan.media['shot:presenter'].transparent);
  const wrong=structuredClone(matte);wrong.width=100;assert.throws(()=>validateGraphPlan(p,[original,wrong]),/dimensions/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Remotion composites the actual transparent clip and moves the measured object across the presenter', {timeout:120000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'presenter-render-'));
 try{
  const video=path.join(root,'original.mp4'),mask=path.join(root,'mask.png');
  await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=red:s=192x108:r=30:d=2','-c:v','libx264','-pix_fmt','yuv420p',video]);
  await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=black:s=192x108,drawbox=x=0:y=0:w=96:h=108:color=white:t=fill','-frames:v','1','-threads','1',mask]);
  const store=new AssetStore(path.join(root,'assets'));await store.init();const original=await store.import(await fs.readFile(video),{rights:'Original synthetic renderer test'}),matte=await store.import(await fs.readFile(mask),{rights:'Original synthetic renderer test mask'});
  const object=structuredClone(shape);object.anchorTrack.sourceAssetId=original.id;
  const words={id:'speech',type:'text',text:'FALA REAL',x:.6,y:.1,width:.35,height:.2,fontSize:50,color:'#FFFFFF',kinetic:'speech',speechWords:[{text:'FALA',fromFrame:0,toFrame:25},{text:'REAL',fromFrame:26,toFrame:60}],highlightColor:'#FFCC00'};
  const p=validateGraphPlan(plan([{...presenter,assetId:original.id,maskAssetId:matte.id},object,words]),[original,matte]);const edited=await editGraph(p,store,path.join(root,'work'));
  const serveUrl=await bundle({entryPoint:path.resolve('src/production/index.tsx'),publicDir:edited.publicDir,outDir:path.join(root,'bundle')}),inputProps={plan:edited.plan},browserExecutable=process.env.CHROME_PATH||'/usr/bin/chromium';
  const composition=await selectComposition({serveUrl,id:'GdaGraph',inputProps,browserExecutable}),files=[];
  for(const frame of [0,59]){const file=path.join(root,`frame-${frame}.png`);await renderStill({serveUrl,composition,inputProps,frame,output:file,imageFormat:'png',browserExecutable});files.push(file);}
  const pixel=(file,x,y)=>execFileSync('ffmpeg',['-v','error','-i',file,'-vf',`crop=2:2:${x}:${y},format=rgb24`,'-frames:v','1','-f','rawvideo','pipe:1']);
  const red=pixel(files[0],100,200),clear=pixel(files[0],1100,200);assert(red[0]>230&&red[1]<30);assert(Math.abs(clear[0]-18)<3&&Math.abs(clear[2]-86)<3);
  for(const [i,x]of [[0,256],[1,1024]]){const color=pixel(files[i],x,360);assert(color[0]>240&&color[1]>180&&color[2]<30,'Measured object must appear at its actual frame position');}
  assert(pixel(files[1],256,360)[1]<30,'Object must leave its previous position');
  if(process.env.PRESENTER_PROOF_OUTPUT){const out=path.resolve(process.env.PRESENTER_PROOF_OUTPUT);await fs.mkdir(out,{recursive:true});for(const file of files)await fs.copyFile(file,path.join(out,path.basename(file)));await fs.writeFile(path.join(out,'proof.json'),JSON.stringify({status:'engineering_frames_only',sourceSha256:original.sha256,originalUnchanged:digest(await fs.readFile(video))===original.sha256,frames:[0,59],alphaComposited:true,measuredAnchorMoved:true,creativeApproval:false,playback:'not_reviewed',listening:'not_run'},null,2));}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
