# Edição, motion e áudio · 2.12.0

Execute o plano com mídia real e entregue arquivos editáveis e um MP4 candidato. A entrada inclui escolhas/escopos, plano atual, fontes registradas, relógio da fala e aprovações pertinentes. Leia [execução pelo runtime](../orchestrator-execution.md), [fidelidade de execução](../execution-fidelity.md), [acabamento natural](../natural-finish.md) e, quando aplicável, [operadores de apresentador](../presenter-interaction.md).

## Execução

1. Verifique runtime 2.12.0 compatível, Node/FFmpeg/Chromium, arquivos e ferramentas da sessão. Importe o pedido completo com `npm run video -- import --preset ARQUIVO --out projects/NOME`; leia `context` e o schema atual. O modelo da própria conversa escreve o plano, sem outra API de interpretação obrigatória.
2. Registre apenas mídia recebida, licenciada ou gerada com os aceites aplicáveis. Preserve os originais e hash; logo, rótulo, cor factual, identidade, cenário e cobertura são restrições. Não use o estilo fixo de `production:poc` para substituir uma seleção do usuário.
3. Ligue `styleId/aspect/scope` a planos e referências com `styleBindings`. Uma contribuição de detalhes não se estende ao filme. Defina durações por fala/ação real, transições motivadas e estados inicial/ação/resultado; não dividir o filme igualmente entre referências.
4. Construa grafismos e texto editáveis, legíveis e sincronizados. Use cortes e B-roll para demonstrar o assunto. Uma foto ampliada pode ilustrar um detalhe disponível, mas não prova nova vista, giro, gesto, geometria ou ação interna. Máscaras, tracks e tempos de palavra exigem insumos verificados; confira o contato e os limites do operador.
5. Mantenha pessoa/fala a 1×. A duração final acompanha a edição natural. Não acelerar, congelar, repetir ou cortar palavras para forçar um número. Se uma duração exata conflitar com a fala recebida, explique a diferença e resolva texto/take menor ou duração revista antes de afirmar atendimento ao pedido. Use a voz original uma vez; trilha/SFX registrados têm função, licença, fades e ducking pertinentes. O loudness nativo não substitui escuta.
6. Aplique luz gráfica/transparência e acabamento na intensidade que a fonte pede. Preservar pele e textura; reduzir efeito plástico com ajustes conservadores e grão opcional, desligando-o em material já ruidoso. Não chamar composição CSS de relighting/refração física.

## Ajuste local

Em um pedido somente de som, abra o projeto e os assets existentes. Preserve vídeo, roteiro, moodboard e decisões não afetadas; altere os intervalos/níveis/arquivos sonoros pertinentes. Atualize hashes, dependências e revisão necessária. Um ajuste sem geração IA não exige criar nova pessoa ou novo moodboard.

## Handoff

O tratamento técnico é responsabilidade da `video-tratamento` (referência incorporada na orquestradora): diagnóstico de fonte/saída, limites de cor/restauração, acabamento e perfil de exportação. Recursos descritos no catálogo não são processadores instalados.

Entregue plano/EDL, MP4 candidato acessível, legenda, projeto/fontes e relatório técnico para `video-tratamento` e depois `video-revisao`. Leia o status real de geração antes de repetir uma operação; não recrie job pago de resultado incerto. Falta de renderer ou de recurso prometido exige causa comprovada, etapa afetada, entregas existentes e alternativa explícita. Um esquema válido, quadro renderizado ou fonte de avatar isolada não é filme editado concluído.

Composição técnica por plano pertence a `video-vfx`: criação/correção de tracking, roto, key, cleanup, telas e CG/FX. Edição consome tracks/mattes/comps verificados, mantém motion gráfico editável, timing e áudio. Respeite manifesto de frames/cor/alpha e devolva falhas ao módulo; não prometer extração automática.

## Execução com ferramentas gratuitas

Consulte [toolchain gratuita](../free-toolchain.md), diagnostique esta máquina e reutilize a rota compatível com o plano. A biblioteca instalada inclui aplicativos, plugins, bibliotecas Python e modelos locais; não assumir que todos funcionam por constarem do manifesto. Use os comandos integrados para obter mídia/máscaras novas e evidências, mantendo os originais e o estado de revisão. Falha de hardware, modelo ou plataforma permanece explícita.
