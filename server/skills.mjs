import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {STYLE_ID} from './schema.mjs';
import '../style-atlas/dist/workflow.js';
export const repoRoot=fileURLToPath(new URL('../',import.meta.url));
const references=['creative-direction.md','production-and-qa.md','advertising-and-fidelity.md','style-execution.md','execution-fidelity.md','identity-preservation.md','natural-finish.md','universal-visual-approval.md'];
export async function loadSkill(styleId=STYLE_ID,{allowAgent=false,selectedStyleIds=[styleId]}={}) {
 const catalogFile=path.join(repoRoot,'style-atlas/dist/catalog.json'),raw=await fs.readFile(catalogFile,'utf8'),catalog=JSON.parse(raw);
 const style=catalog.styles.find(s=>s.id===styleId);
 if (!style || !allowAgent&&styleId!==STYLE_ID) throw Error('Style has no tested local executor');
 const styles=selectedStyleIds.map(id=>{const item=catalog.styles.find(s=>s.id===id);if(!item)throw Error('Unknown selected style');return item;});
 const files=[...AtlasWorkflow.skillSystem.skills.map(s=>`.agents/skills/${s.id}/SKILL.md`),...references.map(s=>`.agents/skills/video-multimarcas/references/${s}`),'.agents/skills/video-tratamento/references/capabilities.json','.agents/skills/video-tratamento/references/coverage.md','style-atlas/records/motion-campaign/scene.js'];
 const records=await Promise.all(files.map(async file=>{const content=await fs.readFile(path.join(repoRoot,file),'utf8');return {file,sha256:createHash('sha256').update(content).digest('hex'),content};}));
 return {catalogVersion:catalog.version,catalogSha256:createHash('sha256').update(raw).digest('hex'),style,styles,records,
   rules:{preserveOriginals:true,inventAngles:false,avatar:false,fit:'contain'},
   interpretation:allowAgent?style.motion:'Palavras periféricas cedem espaço; a frase se reorganiza em máscara; o traço liga a conclusão. Mídia preservada em janela, não tratada como novo ângulo.',
   limitations:allowAgent?['O agente precisa implementar as características selecionadas em camadas ou obter mídia compatível; resolver o catálogo não comprova técnica nem qualidade.','Geração de imagens, clipes, avatares e voz depende de ferramentas verificadas, direitos, aprovações e aviso prévio de custo.']:['Executor inicial editorial 2D/2.5D; não implementa geometria 3D, tracking ou geração de vídeo.','O catálogo pede locução; esta prova sem voz usa textos sincronizados à trilha e não valida a locução do estilo.']};
}
