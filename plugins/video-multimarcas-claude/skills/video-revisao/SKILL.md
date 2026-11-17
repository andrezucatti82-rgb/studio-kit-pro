---
name: video-revisao
description: Use when a rendered video, revised edit, representative sample, captions, identity, audio, delivery package, or claimed approval needs verification before delivery or publication.
---

# Revisão e entrega · 2.12.0

Avalie o arquivo exato contra o briefing e seus escopos. Receba MP4 candidato, hash, plano, originais, referências inspecionadas, legenda e registros de decisão. Leia [produção e qualidade](../video-multimarcas/references/production-and-qa.md), [identidade](../video-multimarcas/references/identity-preservation.md), [execução fiel](../video-multimarcas/references/execution-fidelity.md) e [aprovações](../video-multimarcas/references/universal-visual-approval.md).

## Evidências separadas

| Verificação | Evidência necessária |
|---|---|
| Técnica | Arquivo acessível/decodificável, dimensões, FPS, duração, streams e hash da versão |
| Visual | Referências e originais comparados: composição, produto/identidade, texto, contatos, oclusões, transições |
| Movimento | Reprodução contínua do trecho/filme aplicável, incluindo entradas, permanência, saídas e passagem difícil |
| Som | Escuta real: fala, sincronismo, cortes, trilha/SFX, clipping e final |
| Criativa | Decisão explícita da pessoa, ligada ao arquivo/versão/escopo; o agente não aprova por ela |

Marque `reviewed` somente com revisão aplicável realmente executada. Sem playback/escuta, registre quais verificações faltam e use `review_pending`/prévia. Testes de código, leitura de metadados, quadro bonito ou anotação de sucesso não substituem essas evidências. Aprovação de uma versão não aprova outro hash automaticamente.

## Critérios por pedido

Confira cada contribuição selecionada e seu escopo. Para apresentador: identidade, dentes/mandíbula quando relevantes, lábios/voz, mão/objeto, ancoragem, máscara e sincronismo. Uma imagem estática não prova esses itens. Para publicidade: SKU/material/rótulo, afirmações, oferta/CTA e fontes. Legendas precisam refletir a fala real, preservar texto e áreas seguras; gráficos mantêm unidades e relações corretas.

Use uma revisão consolidada do candidato, com lista concreta de falhas e correção localizada. Preserve partes aprovadas; revalide os itens corrigidos e os artefatos dependentes. Um pedido de som mantém aceites visuais válidos, mas exige escutar o áudio novo e conferir sincronismo. Não herde revisão do arquivo anterior.

## Entrega

Forneça vídeo acessível, duração medida, legenda, fonte/projeto editável, recursos/licenças, relatório do hash exato, limitações restantes e próxima ação. `npm run review`/`workflow-gate` validam registros; não criam fatos nem aprovações. Entregar o MP4 de avatar bruto como se fosse a edição final não satisfaz um pedido com interação/motion.

Publicação é um escopo próprio: revisão técnica ou aceite visual não autoriza subir vídeo em contas, publicar site, gastar novas tentativas ou executar merge. O projeto deve distinguir fonte no GitHub, pacote preparado, instalação carregada e domínio publicado.
