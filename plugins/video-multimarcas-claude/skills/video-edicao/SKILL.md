---
name: video-edicao
description: Use when a video needs footage assembly, B-roll, editable motion graphics, captions, masks, verified tracks, transitions, audio mixing, natural finishing, or a scoped edit to existing media.
---

# Edição, motion e áudio · 2.12.0

Execute o plano com mídia real e entregue arquivos editáveis e um MP4 candidato. A entrada inclui escolhas/escopos, plano atual, fontes registradas, relógio da fala e aprovações pertinentes. Leia [execução pelo runtime](../video-multimarcas/references/orchestrator-execution.md), [fidelidade de execução](../video-multimarcas/references/execution-fidelity.md), [acabamento natural](../video-multimarcas/references/natural-finish.md) e, quando aplicável, [operadores de apresentador](../video-multimarcas/references/presenter-interaction.md).

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

Entregue plano/EDL, MP4 candidato acessível, legenda, projeto/fontes e relatório técnico para `video-revisao`. Leia o status real de geração antes de repetir uma operação; não recrie job pago de resultado incerto. Falta de renderer ou de recurso prometido exige causa comprovada, etapa afetada, entregas existentes e alternativa explícita. Um esquema válido, quadro renderizado ou fonte de avatar isolada não é filme editado concluído.
