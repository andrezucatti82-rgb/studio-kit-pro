import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import '../style-atlas/dist/guided.js';
import '../style-atlas/dist/workflow.js';
import {parseHandoffLink,unpackHandoff} from '../scripts/retrieve-disteven-handoff.mjs';

const W=AtlasWorkflow;
const catalog=JSON.parse(await readFile(new URL('../style-atlas/dist/catalog.json',import.meta.url),'utf8'));
const approvals={history:[],approvals:W.emptyApprovals(),preProductionApprovals:W.emptyPreProductionApprovals()};
approvals.preProductionApprovals.moodboard.status='approved';
const assignment=(id,kind,roles)=>({id,label:id+'.mp4',kind,roles,source:'declared',rights:{image:'authorized',voice:'pending'}});
const fromPrompt=text=>JSON.parse(text.split('\n').find(line=>line.startsWith('BRIEFING PARA PRODUÇÃO (dados): ')).slice('BRIEFING PARA PRODUÇÃO (dados): '.length));
function choice(selected,format,extra={}){
 return {topic:'Demonstrar um produto com os dados fornecidos',brand:'Marca',selectedStyles:selected.map(s=>({...s,referenceFrame:W.referenceFrame(s)})),
  styleContributions:Object.fromEntries(selected.map((s,i)=>[s.id,[{aspect:i?'lighting':'style_direction',scope:i?'closing':'film'}]])),
  guidedBrief:{objective:'product',subject:'Demonstrar um produto com os dados fornecidos',materials:['video'],complexity:'balanced'},
  format,targetDurationSeconds:30,typography:'auto',catalogVersion:catalog.version,projectState:structuredClone(approvals),...extra};
}
test('every catalogue family and format shares the final-video contract across text and JSON',()=>{
 const families=[...new Map(catalog.styles.map(style=>[style.family,style])).values()];
 for(const first of families)for(const format of ['9:16','16:9','1:1','4:5']){
  const c=choice([first],format);
  const bundle=W.portableBundle(c);
  assert.ok(bundle.request.startsWith(W.productionIntent.instruction));
  assert.doesNotMatch(bundle.request,/STATUS_PROJETO/);
  assert.equal(bundle.project.productionIntent.deliverable,'final_ai_video');
  const brief=fromPrompt(bundle.request);
  assert.deepEqual(brief,JSON.parse(JSON.stringify(bundle.brief.productionContract.productionBrief)));
  assert.deepEqual(brief.materials.assignments,[]);
  assert.equal(brief.materials.filesTransferred,false);
  assert.equal(brief.directions[0].styleId,first.id);
  assert.equal(brief.format,format);
  assert.equal(brief.objective,'product');
 }
 assert.ok(W.pagePrompt('https://example.org/catalog.json').startsWith(W.productionIntent.instruction));
 assert.doesNotMatch(W.pagePrompt('https://example.org/catalog.json'),/STATUS_PROJETO/);
});
test('multiple roles, original duration, scope, authorizations and prior approvals survive export and import',()=>{
 const materials=[assignment('presenca','video',['reference','incorporate']),assignment('logo','brand',['incorporate']),assignment('roteiro','script',['adapt']),assignment('foto','image',[])];
 const c=choice(catalog.styles.slice(0,2),'4:5',{durationMode:'source',targetDurationSeconds:null,materialAssignments:materials});
 const bundle=W.portableBundle(c),brief=fromPrompt(bundle.request),project=W.importProject(JSON.stringify(bundle.project),catalog.styles.map(s=>s.id));
 assert.equal(brief.targetDurationSeconds,null);
 assert.equal(brief.durationMode,'source');
 assert.equal(brief.directions[1].role,'complementar');
 assert.deepEqual(brief.directions[1].contributions.map(v=>[v.aspect,v.scope]),[['lighting','closing']]);
 assert.deepEqual(brief.materials.assignments,materials);
 assert.deepEqual(project.materialAssignments,materials);
 assert.deepEqual(project.preProductionApprovals,approvals.preProductionApprovals);
 assert.equal(project.referenceFrames.length,2);
 assert.throws(()=>W.validateMaterialAssignments([{...materials[0],roles:['invent']}]),/material/);
 assert.throws(()=>W.validateMaterialAssignments([materials[0],materials[0]]),/material/);
});
test('the retrieval tool opens only authentic encrypted packets and sanitizes their local file names',async()=>{
 const base='https://videos.gerenciadordeanuncios.com.br/atlas-20261119055322/cloud-handoff-123456abcdef.php?id='+'a'.repeat(48);
 const key=webcrypto.getRandomValues(new Uint8Array(32)),link=base+'#'+Buffer.from(key).toString('hex');
 assert.equal(parseHandoffLink(link).url.toString(),base);
 assert.throws(()=>parseHandoffLink(link.replace('videos.gerenciadordeanuncios.com.br','elsewhere.example')),/link temporário/);
 const project=Buffer.from('{"packageVersion":1}'),clip=Buffer.from('test clip');
 const header=Buffer.from(JSON.stringify({version:1,files:[{id:'project',name:'projeto-video.json',size:project.length},{id:'video',name:'../../original.mp4',size:clip.length}]}));
 const length=Buffer.alloc(4);length.writeUInt32BE(header.length);
 const iv=webcrypto.getRandomValues(new Uint8Array(12)),aes=await webcrypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt']);
 const ciphertext=await webcrypto.subtle.encrypt({name:'AES-GCM',iv},aes,Buffer.concat([length,header,project,clip]));
 const raw=Buffer.concat([iv,Buffer.from(ciphertext)]),files=await unpackHandoff(raw,key);
 assert.equal(files[1].filename,'video--.._.._original.mp4');
 assert.equal(files[1].data.toString(),'test clip');
 raw[raw.length-1]^=1;
 await assert.rejects(unpackHandoff(raw,key));
});
