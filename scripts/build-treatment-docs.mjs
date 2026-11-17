// Render both human-readable copies from the canonical capability matrix.
import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),base='.agents/skills/video-tratamento/references/';
const data=JSON.parse(await fs.readFile(new URL(base+'capabilities.json',root),'utf8'));
const labels={integrated:'Integrado',fixed:'Fixo no runtime',partial:'Parcial',not_integrated:'Não integrado'};
let body="# Cobertura de tratamento · 2.12.0\n\nAuditoria iniciada em 17/11/2026 sobre o código da PR #20, quando o site ainda estava na 2.11.0. A PR foi integrada e a versão 2.12.0 está publicada; consulte [estado da entrega](https://github.com/andrezucatti82-rgb/studio-kit-pro/blob/main/docs/RELEASE-2.12.md). Esta matriz descreve implementação do repositório; não atribui ao produto todos os filtros que um FFmpeg instalado possa oferecer.\n\n**Integrado**: operador existente, com limites indicados. **Fixo**: valor usado pelo runtime, sem seletor. **Parcial**: apenas parte do pedido. **Não integrado**: exige desenvolvimento ou ferramenta externa verificada. A skill orienta e diagnostica; não implementa os processadores ausentes.\n\nO acabamento SocialFinish é opcional e específico da rota do grafo. A rota standalone `npm run render` tem composição 1080×1920 e não aplica esse acabamento nem o loudnorm do servidor. A medição técnica não certifica qualidade perceptual, HDR, broadcast ou DCP.\n\n";
for(const group of data.groups){
 body+=`## ${group.title}\n\n| Recurso | Situação | Alcance real / lacuna |\n|---|---|---|\n`;
 const items=data.items.filter(item=>item.group===group.id);
 for(const item of items){if(!labels[item.status])throw Error('Unknown capability status');for(const evidence of item.evidence)await fs.access(new URL(evidence,root));body+=`| ${item.title} | ${labels[item.status]} | ${item.notes} |\n`;}
 body+='\nFontes: '+[...new Set(items.flatMap(item=>item.evidence))].map(file=>'`'+file+'`').join(', ')+'.\n\n';
}
body+="## Diagnóstico e próximos incrementos\n\n`npm run video:inspect -- --file arquivo.mp4 --measure-audio --out projects/NOME/inspection.json` gera hash SHA-256, dimensões, codecs, SAR/DAR, cadência, varredura, tags de cor, streams/layout de áudio e medição opcional do primeiro stream. O relatório preserva campos desconhecidos, sinaliza conversões pendentes e mantém playback/escuta como não executados. O arquivo de saída deve ser novo; o comando não transforma a mídia. Não inclui tags privadas arbitrárias.\n\n1. Prioridade redes sociais: gerenciamento explícito de cor SDR/Log/HDR→SDR, correção de branco/exposição, denoise e EQ/de-esser/limiter com parâmetros validados, medição pós-exportação com tolerâncias, Full HD e perfis de destino configuráveis.\n2. Depois: estabilização, correção de lente, de-flicker e proxies/relink, com comparação antes/depois e prevenção de perda de detalhe.\n3. Trilhas especializadas: 10-bit/4:2:2 e masters, tracking/roto avançados, HDR, broadcast, DCP e áudio imersivo, cada uma com engine adequada e testes próprios. Não prometer todos como efeito de instalar uma skill.\n\nNenhuma API paga, geração de avatar, publicação ou merge faz parte desta auditoria.\n";
for(const file of [base+'coverage.md','docs/VIDEO-TREATMENT-AUDIT.md']){
 const target=new URL(file,root);
 if(process.argv.includes('--check')){if(await fs.readFile(target,'utf8')!==body)throw Error('Stale treatment coverage: '+file);}
 else await fs.writeFile(target,body);
}
