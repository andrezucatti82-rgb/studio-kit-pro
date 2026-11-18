# VFX, responsabilidades e fidelidade dos prompts

Auditoria e implementação: 18/11/2026. Árvore candidata do kit 2.12.0, catálogo 4.8, rota v3. Preparar esta integração não publica o site, não instala skills em contas externas e não valida criativamente vídeos.

> Registro da etapa VFX anterior à consolidação. A arquitetura atual registra uma skill pública com sete módulos internos; veja [entrada única](SINGLE-ENTRY.md). As referências a oito skills e cópias geradas abaixo descrevem o estado auditado naquela etapa.

## Resultado

Havia cobertura parcial de VFX: o runtime consome máscaras fornecidas, trajetórias medidas e camadas; edição organiza motion e composição; tratamento diagnostica cor/acabamento; revisão compara a saída. Faltava um responsável pelo breakdown, criação/correção de tracking, roto, key, cleanup, telas, CG/FX, passes e QA técnico por plano.

A VFX Effects 1.0.0 fornecida pelo usuário foi lida com suas seis referências e dois templates. Sua integração original declarava que não havia roteador automático e exigia instalação separada. O kit incorpora uma adaptação canônica `video-vfx`, com proveniência registrada, sem modificar nem sobrescrever a skill externa `vfx-effects`. Isso evita colisão em instalações pessoais. A bibliografia importada é referência de conhecimento; suas fontes não foram reconsultadas e os softwares citados não foram instalados/testados nesta tarefa.

## Uma responsabilidade por entrega

| Skill canônica | Responsabilidade própria | Interface que evita repetição |
| --- | --- | --- |
| video-multimarcas | Coordenação, decisões, versões, orçamento, gates e entrega | Mantém um único contrato e histórico |
| video-planejamento | Pesquisa, materiais, roteiro, direção, moodboard e storyboard | Incorpora propostas técnicas nos mesmos planos |
| video-explicador-interativo | Fala, atuação, gesto e intenção da explicação | Pede VFX para criar/corrigir insumos técnicos; não repete comp |
| video-publicidade | Argumento, fatos, demonstração, oferta e CTA | Conserva invariantes e evidências comerciais |
| video-edicao | Montagem, timing, motion gráfico editável, legenda e áudio | Integra tracks/mattes/comps entregues e conferidos |
| video-vfx | Tracking, roto, key, cleanup, telas, CG/FX e cor/alpha/passes da composição | Entrega comp, manifesto de frames/cor/alpha e QA por plano |
| video-tratamento | Inspeção, cor/textura/áudio globais e destino final | Respeita manifesto VFX para evitar conversão duplicada |
| video-revisao | Verificação do candidato integrado e pacote final | Consolida QA VFX e revisão audiovisual do hash exato |

Todas as oito fontes foram lidas e suas interfaces ajustadas. Uma responsabilidade não significa outro agente/processo. Não há alegação de revisão independente. Skills pessoais/externas, como video-b-roll e video-pro, não são fontes do kit e não foram alteradas nem acrescentadas como orquestradoras concorrentes.

## O que é acionado

Planejamento, edição, tratamento e revisão constituem a base disponível do projeto. Publicidade, explicador e VFX são condicionais à seleção e aos escopos. A rota lista responsabilidades; `run_only_pending_or_affected_stages` impede interpretar essa lista como reinício obrigatório de todas as etapas. Um ajuste sonoro pode usar somente edição, tratamento e revisão.

VFX participa quando `masks`/`effects` forem escolhidos ou a direção pertinente exigir técnica indicada nos campos positivos da receita. A detecção usa identidade/direção/recursos e inputs técnicos da referência, incluindo rotas de máscara/track. Não procura comandos ou palavras soltas no briefing, notas genéricas ou avisos de ausência de ferramentas. Paleta, tipografia, cor ou som isolados não importam os efeitos da referência. A identificação é uma proposta de breakdown, complementada pela inspeção da mídia e por pedidos explícitos na conversa; não é uma classificação universal de qualquer efeito possível.

No diagnóstico do catálogo completo, a orquestradora e a base participam das 1.425 direções; explicador participa de 306, publicidade de 440 e VFX de 365. Há receitas de avatar fora da categoria dos 265 explicadores, portanto 306 não representa novo inventário de estilos dessa categoria. Contagens se sobrepõem em escolhas mistas. O relatório por ID e hash de prompt está em [vfx-style-prompts.json](validation/vfx-style-prompts.json).

`productionContract.vfxInput` mantém as contribuições e escopos que motivam o trabalho. A importação prepara `vfx-plan.json` e `vfx-review.json` apenas quando pertinente, sem sobrescrever registros existentes nem conceder revisão/aprovação. Efeitos solicitados depois são decisões versionadas da coordenadora; não se modifica o contexto importado para fingir que o pedido original já os continha.

## Superfícies de prompt e continuidade

| Superfície | Origem e verificação |
| --- | --- |
| Pedido mostrado e copiado | `AtlasApp.prompt` → `AtlasWorkflow.buildPrompt` |
| Download TXT | `starterFiles/pedido.txt`, igual ao pedido copiado |
| JSON portátil | `portableBundle`: request, projeto, briefing, referências, rota e intenção coerentes |
| Retomada e ajuste guiados | Mesmo prompt completo, acrescido da etapa/alteração; decisões e escopos preservados |
| Page embutida / Chat about this | `pagePrompt` + modelContent atual; recuperar catálogo e recalcular rota |
| Template de explicador | `presenter-prompt.txt`, com VFX condicional e prioridade da seleção sobre preferências genéricas |
| Codex / Claude Code | Importação recalcula seleção/rota a partir do catálogo validado, autoria pelo modelo da conversa e runtime verificado |
| ChatGPT / Claude em chat | Mesmo contrato; execução depende de ferramentas e arquivos realmente disponíveis |

Abrir ChatGPT/Claude não envia prompt, JSON ou mídia automaticamente. Os destinos usam o mesmo contrato, com diferenças apenas de encaminhamento. A existência de uma skill em uma conta não a instala na outra. O snapshot técnico do runtime inclui fontes do kit para rastreabilidade; armazenar uma fonte não é executar todas as responsabilidades.

Rotas v1/v2 válidas recebem as adições registradas pertinentes na rota efetiva. Contextos antigos continuam com bytes/hash e artefatos preservados. Metadados adulterados e módulos desconhecidos são recusados. A migração não cria consentimento nem herda revisão de outro arquivo.

## Distribuição e função dos recursos

| Recurso | Função e fonte de manutenção |
| --- | --- |
| `.agents/skills/` | Oito fontes canônicas; editar aqui |
| `.claude/skills/` | Pontes de descoberta para as mesmas fontes |
| `references/skill-modules/` | Cópias geradas para hosts de uma skill; incluem referências e templates próprios |
| `plugins/`, `dist/` e downloads | Distribuições geradas; não manter regras manualmente nessas cópias |
| `workflow.js` | Contrato puro compartilhado pelo navegador e Node: seleção, escopos, prompt e rota |
| `catalog.json`, imagens e sequências | Referências e intenção de cada estilo, com estado conceitual explícito |
| `server/`, `src/`, `scripts/` | Validação, importação, produção, render, diagnóstico, gates e empacotamento |
| `style-atlas/records/` e `docs/validation/` | Fontes de construção, pesquisa, histórico e evidências; não são instruções para executar todas as receitas |
| `templates/` e templates de skills | Estruturas iniciais; campos vazios não comprovam produção ou aprovação |
| `tests/` e exemplos | Regressão e demonstração técnica identificada; não aprovam produção de cliente |
| `projects/` | Trabalho privado ignorado; mídia e credenciais não entram nos pacotes |

O empacotador antes só copiava `references/` de especialistas. Foi ampliado para incluir `templates/`, tornando o módulo VFX utilizável também no pacote compacto. Os links Markdown internos dos três arquivos de distribuição foram conferidos recursivamente, sem referências quebradas. Os plugins Codex/Claude e o runtime usam as mesmas fontes. O instalador obtém a quantidade de skills do contrato, preserva outras skills e faz backup/rollback.

O painel de produção local ainda é uma demonstração de um único executor (`campanha-frase-que-reorganiza-o-quadro`). Sua mensagem foi corrigida para orientar produção com o pedido/JSON completos, preservando o estilo escolhido; não pede trocar de estilo para adaptar-se ao executor.

## Evidência e limite da promessa visual

Foram verificados automaticamente 1.425 prompts completos/TXT/JSON e 25.650 combinações parciais de características/escopos. As regressões adicionais cobrem VFX técnico, exclusão por paleta/tipografia/som, combinações, importação condicional dos registros, continuidade v2 e rejeição de metadados adulterados. A suíte completa passou: **227 testes JavaScript + 9 Python**, typecheck e validador. O navegador verificou clipboard e downloads reais para ChatGPT/Claude em 375/1440 px, rota VFX, exclusão por paleta, persistência e ajuste de efeitos. A Page embutida também passou por salvamento ordenado, troca de destino, aviso de limite e download de continuidade sem localStorage; o teste foi atualizado para abrir o briefing pelo botão visível do Fólio. Registros de navegador: [vfx-browser.json](validation/vfx-browser.json).

Os 1.425 registros do catálogo têm `sequence.conceptOnly:true` e `motionValidated:false`; 1.419 estão em `visual_reference` e seis em `sample_review_pending`. Portanto nenhuma alteração de prompt pode certificar previamente uma entrega audiovisual perfeita para todos os estilos e agentes. Esta tarefa não gerou vídeos nem fez playback/escuta de produções novas.

Para uma produção atender ao visual escolhido, a coordenadora precisa inspecionar quadros, ligar cada contribuição a planos e critérios observáveis, confirmar ferramentas e cobertura de mídia, obter os aceites aplicáveis, produzir a amostra integrada do trecho mais difícil e comparar movimento/som antes de escalar. Sem técnica ou cobertura suficiente, deve registrar a dependência e resolver a rota com o usuário; não entregar outro estilo silenciosamente. `review_pending` permanece até revisão real. VFX não instala solve, roto, compositor, simulação, ASR ou geração universal de vídeo.

Merge, publicação, revisão imutável do instalador e instalação nas contas destino são etapas distintas da preparação desta candidata. O instalador só pode ficar disponível depois que seus hashes corresponderem a uma revisão fixa; árvore modificada permanece `sourceReady:false`.
