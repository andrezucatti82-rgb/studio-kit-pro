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
test('presenter selection requires real speech and captions while color-only contributions remain independent',()=>{
 const p=plan([presenter]);const context={contextSha256:p.contextSha256,styles:[{id:styleId,presenterEditing:{narrationRequired:true}}],combination:{entries:[{styleId,contributions:[{aspect:'style_direction',scope:'film'}]}]},referenceManifest:{styles:[{styleId,frames:[{number:1}]}]}};
 assert.throws(()=>validateGraphPlan(p,assets,undefined,context),/actual speech/);
 p.scenes[0].layers[0].volume=1;p.captions=[{start:0,end:1,text:'Fala de teste'}];
 assert.throws(()=>validateGraphPlan(p,assets,undefined,context),/actual speech/);
 validateGraphPlan(p,[{...assets[0],hasAudio:true}],undefined,context);
 p.scenes[0].layers[0].volume=0;p.audio.tracks=[{assetId:'voice',role:'narration',fromFrame:0,durationFrames:60,sourceStartSeconds:0,volume:0,fadeFrames:0,loop:false}];const spokenAssets=[...assets,{id:'voice',kind:'audio',durationSeconds:2,hasAudio:true}];assert.throws(()=>validateGraphPlan(p,spokenAssets,undefined,context),/actual speech/);p.audio.tracks[0].volume=1;validateGraphPlan(p,spokenAssets,undefined,context);p.audio.tracks=[];
 p.scenes[0].layers[0].volume=0;p.captions=[];p.styleBindings[0].aspect='color';context.combination.entries[0].contributions[0].aspect='color';validateGraphPlan(p,assets,undefined,context);
});
test('social finishing is opt-in and rejects excessive grading, grain and glass controls',()=>{
 const p=plan([{id:'panel',type:'shape',shape:'rect',fill:'#FFFFFF',x:.1,y:.1,width:.3,height:.3,material:{type:'glass'}}]);
 assert.equal(p.finishing,undefined);assert.equal(p.scenes[0].layers[0].material.blurPixels,14);
 for(const finishing of [{grainAmount:.1},{saturation:2},{shadowLift:.1},{highlightCompression:.2},{brightness:1.2}])assert.throws(()=>graphPlanSchema.parse({...p,finishing}));
 assert.throws(()=>graphPlanSchema.parse({...p,scenes:[{...p.scenes[0],layers:[{...p.scenes[0].layers[0],material:{type:'soft-light',fillOpacity:.8}}]}]}));
});
test('Remotion actually blurs glass and applies repeatable, subtle social finishing', {timeout:120000},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'social-finish-'));
 try{
  const stripes=Array.from({length:32},(_,i)=>({id:'stripe'+i,type:'shape',shape:'rect',fill:i%2?'#FFFFFF':'#000000',x:i/32,y:0,width:1/32,height:1}));
  const panel=(y,blurPixels)=>({id:'glass'+Math.round(y*100),type:'shape',shape:'rect',fill:'#FFFFFF',x:.1,y,width:.8,height:.25,material:{type:'glass',fillOpacity:.15,blurPixels,borderOpacity:0,shadowOpacity:0}});
  const p=validateGraphPlan(plan([...stripes,panel(.1,0),panel(.6,28)]),[]);
  const serveUrl=await bundle({entryPoint:path.resolve('src/production/index.tsx'),outDir:path.join(root,'bundle')}),browserExecutable=process.env.CHROME_PATH||'/usr/bin/chromium';
  const render=async(p,name,frame=0)=>{const inputProps={plan:{...p,media:{},fontSources:[],renderAudio:[]}},composition=await selectComposition({serveUrl,id:'GdaGraph',inputProps,browserExecutable}),file=path.join(root,name+'.png');await renderStill({serveUrl,composition,inputProps,frame,output:file,imageFormat:'png',browserExecutable});return execFileSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],{maxBuffer:4000000});};
  const pixels=await render(p,'glass'),at=(buf,x,y)=>buf[(y*1280+x)*3];
  const sharp=Math.abs(at(pixels,580,150)-at(pixels,620,150)),blurred=Math.abs(at(pixels,580,500)-at(pixels,620,500));assert(sharp>200);assert(blurred<sharp*.6,`Backdrop blur must visibly reduce stripe contrast: sharp=${sharp}, blurred=${blurred}`);
  const flat=plan([{id:'flat',type:'shape',shape:'rect',fill:'#808080',x:0,y:0,width:1,height:1}]);
  const original=await render(flat,'original');flat.finishing=graphPlanSchema.parse({...flat,finishing:{brightness:1,contrast:1,saturation:1,shadowLift:0,highlightCompression:0,grainAmount:.04,seed:7}}).finishing;
  const a=await render(flat,'grain'),b=await render(flat,'repeat'),c=await render(flat,'next',4);assert.deepEqual(a,b);assert.notDeepEqual(a,c);
  let changed=0,max=0;for(let i=0;i<a.length;i+=30){const d=Math.abs(a[i]-original[i]);max=Math.max(max,d);if(d)changed++;}assert(changed>100);assert(max<=8,'Social grain must remain subtle');
  flat.finishing.grainAmount=0;assert.deepEqual(await render(flat,'no-grain'),original);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('265 presenter directions preserve the original collection, with 1060 distinct complete reference frames and honest requirements',async()=>{
 validateCatalog(catalog);assert.equal(catalog.styles.length,1425);assert.equal(catalog.families.length,30);
 const previous=JSON.parse(await fs.readFile(new URL('../style-atlas/records/presenter-20/previous-catalog.json',import.meta.url),'utf8'));
 assert.equal(digest(Buffer.from(JSON.stringify(catalog.styles.slice(0,1160)))),previous.stylesSha256);
 const rows=catalog.styles.filter(s=>s.family==='explicadores'),hashes=new Set();assert.equal(rows.length,265);
 for(const s of rows){assert.equal(s.preset.avatar,false);assert.equal(s.presenterEditing.automaticSegmentation,false);assert.equal(s.presenterEditing.automaticGestureTracking,false);assert.equal(s.sequence.conceptApproval,'pending_user_review');assert(!s.preview);assert(s.presenterEditing.presenterSources.includes('explicitly_selected_avatar'));
  const finish=s.presenterEditing.finishProfile;assert.equal(finish.target,'social_media_not_cinema');assert.equal(finish.environment.default,'preserve_recorded_environment');assert.equal(finish.environment.labelGeneratedSimulation,true);assert.equal(finish.socialFinishing.skipGrainOnAlreadyNoisyFootage,true);
  graphPlanSchema.parse({...plan([presenter]),finishing:finish.socialFinishing.controls});assert.equal(s.artDirection.actualFootageOverrides,true);assert.deepEqual(s.executionPlan.artDirection,s.artDirection);
  for(const f of s.sequence.frames){const data=await fs.readFile(new URL('../style-atlas/dist/'+f.src,import.meta.url));hashes.add(digest(data)+JSON.stringify(f.crop||null));}
  const prompt=AtlasWorkflow.buildPrompt({selectedStyles:[{...s,referenceFrame:AtlasWorkflow.referenceFrame(s),visualSequence:s.sequence}],topic:'Uma explicação',format:'9:16',targetDurationSeconds:30,fidelityContract:AtlasWorkflow.fidelityContract});assert(prompt.includes(s.presenterEditing.recipeId));assert(prompt.includes(s.requirements));
 }
 assert.equal(hashes.size,1060);
 const boards=JSON.parse(await fs.readFile(new URL('../style-atlas/records/presenter-60/art-directions.json',import.meta.url),'utf8'));assert.equal(boards.length,6);
 for(const board of boards){assert.equal(digest(await fs.readFile(new URL('../style-atlas/dist/'+board.path,import.meta.url))),board.sha256);assert.equal(board.status,'proposed_not_execution_proof');}
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
test('Remotion composites the actual transparent clip and moves the measured object across the presenter', {timeout:122000},async()=>{
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
