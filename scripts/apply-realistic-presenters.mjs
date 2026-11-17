// Reference atlas addressing only. Original generated PNGs remain unaltered.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),file=new URL('style-atlas/dist/catalog.json',root),catalog=JSON.parse(await fs.readFile(file,'utf8'));
const crops=[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]],manifest=[];
for(const s of catalog.styles.filter(s=>s.presenterEditing)){
 const record=JSON.parse(await fs.readFile(new URL(`style-atlas/records/presenter-realistic/${s.id}.json`,root),'utf8'));
 const bytes=await fs.readFile(new URL('style-atlas/dist/'+record.path,root));if(createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Reference source hash mismatch: '+s.id);
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Expected original PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),frameWidth=Math.round(width/2),frameHeight=Math.round(height/2);
 s.image={atlas:record.path,columns:1,rows:1,width:frameWidth,height:frameHeight,rect:crops[s.sequence.heroIndex??1],sourceKind:'image_gen',source:'Original generated photorealistic reference, complete independent panel; not executed video.'};
 s.sequence.frames=s.sequence.frames.map((frame,i)=>({...frame,src:record.path,thumbnail:record.path,crop:crops[i],sourceWidth:width,sourceHeight:height,width:frameWidth,height:frameHeight,alt:`${s.name}: referência fotorrealista fictícia, ${frame.label.toLowerCase()}. ${frame.action}`}));
 s.sequence.sourceKind='photorealistic_generated_reference';s.sequence.motionValidated=false;s.sequence.conceptApproval='pending_user_review';
 s.artDirection={path:record.path,objectPosition:50,status:'proposed',fictionalPeopleAndPlaces:true,actualFootageOverrides:true,use:'Objetivo visual realista específico deste estilo, com quatro enquadramentos completos. Pessoa e lugar fictícios; não comprova movimento nem fixa a identidade do usuário.'};
 s.executionPlan.artDirection=s.artDirection;s.edition='4.7';
 s.note='Referência fotorrealista fictícia do acabamento pretendido; não é vídeo executado, visita, caso clínico ou prova de gesto/sincronismo. O storyboard final depende do assunto, dos originais e de aprovação.';
 manifest.push({id:s.id,path:record.path,sha256:record.sha256,width,height,frames:crops.map((crop,i)=>({number:i+1,crop,width:frameWidth,height:frameHeight})),motionValidated:false,conceptApproval:'pending_user_review'});
}
if(manifest.length!==60)throw Error('All sixty realistic references are required');catalog.version='4.7';
await fs.writeFile(file,JSON.stringify(catalog,null,2)+'\n');
await fs.writeFile(new URL('style-atlas/records/presenter-realistic/manifest.json',root),JSON.stringify({version:1,catalogVersion:'4.7',images:manifest},null,2)+'\n');
console.log('60 original photorealistic boards / 240 independently addressed complete frames; no AI video produced.');
