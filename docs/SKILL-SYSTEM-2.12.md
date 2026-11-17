# Studio Kit Pro — sistema de skills 2.12.0 (candidato)

## Objetivo e escopo

Uma instalação completa oferece `video-multimarcas` como orquestradora e cinco módulos: `video-planejamento`, `video-explicador-interativo`, `video-publicidade`, `video-edicao` e `video-revisao`. A identidade dos plugins existentes é preservada. Runtime 2.12.0; catálogo 4.6, 1.220 estilos, 60 explicadores em 17 segmentos. Nenhuma publicação/merge faz parte desta entrega; atualizar PR #20 para revisão.

Codex e Claude Code executam com runtime verificado. ChatGPT/Claude sem execução recebem o contrato completo, fazem as etapas disponíveis e explicam o recurso real ausente. O site prepara pedido/JSON e continua sem receber originais ou renderizar remotamente. A instalação não transfere contas, créditos, mídia ou consentimentos.

## Contrato

O roteamento considera contribuições e escopos efetivos, preservando IDs e decisões. `presenterEditing` em uma referência usada somente para cor não ativa a receita de apresentador. Publicidade e explicador podem participar do mesmo vídeo com seus papéis explícitos. As especialidades alimentam planejamento → edição → revisão, sob uma única coordenação; módulos não são prova de agentes paralelos.

O prompt começa com assunto, referência principal, características de cada complemento, aplicação narrativa e fluxo escolhido. O JSON leva o mesmo roteamento. A importação recalcula a rota com catálogo/contribuições validados; metadados do cliente não autorizam escolher código, trocar estilo ou conceder aprovação. Pedidos antigos sem rota continuam importáveis.

O explicador distingue 20 mecanismos de interação e 60 receitas setoriais. Fala, gesto, elemento, âncora, oclusão e resposta são planejados juntos. Tempos, máscaras e trajetórias precisam de dados verificados. Expressividade reduzida é um pedido ao provedor; não há garantia de controle anatômico dos dentes ou de cada gesto. Nenhum extrator automático é declarado instalado por criar uma skill.

## Distribuição e continuidade

As cinco skills especializadas têm fontes próprias e usam as referências comuns da orquestradora no pacote completo. O empacotador incorpora cópias geradas das instruções dos módulos em `references/skill-modules/` para manter o pacote mínimo da orquestradora utilizável em hosts com uma única skill. Cópias de distribuição são geradas, nunca mantidas manualmente. Cada link local deve resolver após extração.

O instalador atualiza somente os seis IDs pertencentes ao kit, preserva outras skills, faz backup e verifica fontes antes de substituir. Runtime e plugins carregam as mesmas versões/arquivos. Aprovações válidas são reutilizadas por escopo/hash; ajustes locais renovam somente as dependências afetadas. Projetos pessoais e credenciais ficam fora dos pacotes.

## Evidência esperada

Roteamento principal e parcial; seleção mista; pedido antigo; metadado adulterado; todas as 60 receitas; instalação nova/atualização com outra skill presente; links nos ZIPs e cópias canônicas; briefing real com copiar/download/retomada para ambos os destinos; telefone e desktop; acesso público relatado separadamente. Testes de software não aprovam um vídeo nem demonstram compreensão perfeita de qualquer modelo.

## Integração do briefing e verificações

O link `#briefSection` abre a produção guiada quando não há seleção e retoma o briefing quando há uma escolha válida. A revisão mostra o principal, complementares, características e aplicações narrativas. O explicador inclui a dependência de filmagem original ou avatar escolhido, a conferir na conversa.

Foram examinados o prompt e o JSON realmente baixados do site público 2.11.0: a seleção já era preservada, mas não havia `intentSummary`/`skillRouting`, e a âncora não abria o briefing. O acesso HTTP simples retornou 406; no Chromium houve resposta 200 e inspeção interativa. O candidato foi verificado separadamente em Chromium local, sem publicação. Os destinos ChatGPT/Claude abrem as páginas corretas; abrir o link não envia o pedido automaticamente.

Pedidos antigos sem rota continuam importáveis. Contextos válidos anteriores ao roteamento, com fonte e dados centrais iguais, mantêm seus bytes/hash e artefatos; `effectiveSkillRouting` é fornecido fora do contexto imutável. Uma alteração real continua exigindo revisão. A atualização das seis skills tem backup/rollback; uma falha ao preparar o backup não deve deixar instalação parcial nem arquivos de staging.

As verificações registradas são de contrato, instruções, arquivo, instalação temporária e navegador. Não representam geração de um novo vídeo, instalação em contas externas, compreensão perfeita de qualquer modelo ou revisão audiovisual de uma produção do usuário.

Resultados: **183 testes JavaScript + 9 Python**, typecheck, validador e integridade dos pacotes passaram. Instalação/atualização em projetos temporários, rollback e retomada com hash legado foram verificados. Navegador: copiar/download/retomada em 375/1440 px; regressões guiadas e galeria 320–1920 px. [Registro estruturado](validation/skill-system-2.12.json) · [Prévia do briefing no celular](assets/skill-system-2.12/brief-mobile.png).

A retomada também preserva o formato 4:5; o erro anterior de retorno a 9:16 foi reproduzido e corrigido com regressão de persistência/prompt.
