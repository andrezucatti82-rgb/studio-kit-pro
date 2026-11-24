# Prompt para o Codex — Unificar receitas + estilos no zapvideo (fase de planejamento)

> Cole tudo abaixo no Codex, com o repositório `andrezucatti82-rgb/studio-kit-pro` aberto no branch do site (`codex/zapvideo-online`) e a pasta `docs/arsenal-receitas/` disponível (branch `docs/arsenal-receitas-fonte`).

---

## Papel e modo de trabalho

Você é arquiteto de produto, engenheiro front-end e designer de interação do **zapvideo.com.br**. Esta é uma **fase de planejamento**: não implemente, não publique, não ligue geração paga e não altere produção. Primeiro leia o código, depois me faça perguntas e só então escreva o plano. Converse comigo em português do Brasil.

Entregáveis desta fase:
1. Um **diagnóstico do que já existe** (arquivos, funções, dados e lacunas).
2. Uma **rodada de perguntas** para mim, com no mínimo 10 e no máximo 4 por mensagem, cada uma com opções. Use pergunta em pop-up se a sua interface tiver; se não tiver, use lista com letras. Espere as respostas antes de fechar o plano.
3. O **documento de planejamento** em `docs/plans/AAAA-MM-DD-receita-estilo-zapvideo.md`, com interfaces, estruturas de dados, fluxos, algoritmos, migração, tarefas por fase, riscos e testes. Siga o roteiro da seção "O que o plano deve conter".

Preserve qualquer alteração não commitada que encontrar no branch. Trabalhe num branch novo de planejamento.

## Contexto: dois sistemas que viram um

### A. O que já existe no zapvideo.com.br (este repositório)
Leia antes de propor qualquer coisa:
- **Fluxo guiado "Criar meu vídeo":** `style-atlas/dist/guided.js`, `guided-ui.js`, `workflow.js`, `style-picker.js`, `material-ui.js`, `production-ui.js`, `site-ui.js`, `search.js`.
- **Receitas já portadas:** `style-atlas/dist/zapvideo-recipes.mjs` (56 receitas em 9 grupos: `recipePreviews`, `recipeGoals`, `recipeGroups`, `recipes`, `findRecipe`, `recipeCanGenerateClip`) e `zapvideo-recipe-ui.mjs` (`setupRecipes`, `recipeGoalOptions`).
- **Estilos do fluxo guiado:** `zapvideo-guided.mjs` (`styles`, `recipeStyles` com cerca de 6 estilos fixos — produto, sensorial, apresentador, rotina, motion…, `makeBoard`, `objectives`, `durations`).
- **Workspace, contrato e transferência:** `zapvideo-workspace.mjs`, `zapvideo-contract.mjs`, `zapvideo-transfer.mjs`, `cloud-handoff.js`, `zapvideo-assembly.mjs`, `zapvideo-captions.mjs`.
- **Catálogo:** `style-atlas/dist/catalog.json`, 1.425 estilos, servido pelo R2 público do Worker. Campos de cada estilo: `id, name, family, familyName, kind, signature, exampleTopic, uses, resources[], motion, complexity, image{atlas,width,height,sourceKind}, preset{...}, readiness, proof, requirements, audio, sequence, executionPlan`. Opcionais: `segment` (740), `advertising`, `adSubniche`, `creativeMode` (440), `presenterEditing`, `artDirection` (265), `visualLanguage`, `researchRefs`, `edition`, `novelty`. Há 53 segmentos de nicho e 29+ subcategorias.
- **Back-end:** Worker em `zapvideo/` (`wrangler.jsonc`), D1 (`migrations/zapvideo/` — `people`, `projects`, `revisions`, `uploads`, `jobs` com `reserved_micros`, `approvals`, `grants`, `handoffs`), R2 público e privado, Workflows, Container FFmpeg e Gemini pelo Service Binding `GEMINI_PROVIDER`, com orçamentos diários e URL Context para ler o link do produto (`GEMINI_PRODUCT_URL_VERIFIED`).
- **Pedido do kit:** o site já exporta o pedido (`projeto-video.json`) com `skillRouting`, `intentSummary`, estilos, `styleContributions`/escopos e referências. O pacote criptografado vai por `/api/zapvideo/handoff`, e a skill `video-multimarcas` (com 7 módulos) importa com `npm run video -- import`.
- Leia também `docs/ZAPVIDEO.md`, `docs/SKILL-SYSTEM-2.12.md`, `docs/GUIDED-START-2.10.md` e `.agents/skills/video-multimarcas/references/` (`style-contributions.md`, `presenter-techniques.md`, `presenter-interaction.md`, `universal-visual-approval.md`).

### B. O que vem do Arsenal (referência em `docs/arsenal-receitas/`)
Leia o `README.md` da pasta. Partes que o André quer **trazer para o zapvideo**:
1. **Receitas completas:** além de nome e grupo, cada uma tem ferramentas, objetivo-modelo com `[COLCHETES]`, 3 etapas, **o que o usuário envia**, **3 perguntas próprias** e o **porquê funciona**. As de apresentador também têm a **referência zapvideo** (`recipes-*.js`). Hoje o `zapvideo-recipes.mjs` tem só nome, grupo, prévia, rota, objetivo, material e `beats`; falta o resto. Os ids diferem (por exemplo `reels` × `reels-edicao`): faça o mapeamento pelo nome e mostre a tabela.
2. **Gerar pauta (opcional), com 6 tipos** (`PMODES` em `app.js`): Notícias, Produto ou serviço, Em alta, Lançamentos e novidades, Ferramentas e apps, O que o público procura. Cada tipo tem sua consulta, período e instrução de escrita. A saída é título, ângulo, até 3 fatos com origem e o objetivo reescrito. No Arsenal isso usa Firecrawl e Claude; no zapvideo deve usar o **Gemini do próprio site** (busca do Google e URL Context), dentro do orçamento diário.
3. **Links do produto, da loja ou do site:** lê as páginas, extrai fotos, vídeos, nome, descrição, preço, variações, avaliações, logo e cores, e mostra "o que encontrei / o que falta" antes de produzir, sem alterar o produto.
4. **Orquestração do prompt** (`build()` em `app.js`): a partir da receita, marca as ferramentas certas (registro de 107 ferramentas em `tools.js`, com skills `/comando`, plugins e conectores MCP), aplica as regras de conflito (`conflicts`), lista os materiais e monta de 10 a 15 perguntas (as da receita primeiro, depois as gerais sem repetir tema; `TAGS`, `mergeQ`). Também tem o botão "Refinar perguntas com IA" e três destinos de saída: Claude Code, Claude.ai e ChatGPT.
5. **Animações:** cenas SVG ilustradas em 9:16 (`scenes.js`, 25 cenas) e a prévia da receita em **formato Stories**: 15s, 3 etapas com barras de progresso e legenda "1/3 …" (`story()` em `app.js` e `.story`/`.st-*` em `styles.css`). Elas pausam fora da tela e respeitam `prefers-reduced-motion`. **Devem ser mantidas.**
6. **Busca:** ignora acentos, aceita várias palavras, usa sinônimos e termos curtos como palavra inteira, filtra receitas e ferramentas juntas e põe primeiro quem bate no título.

## A experiência que queremos (dentro do "Criar meu vídeo")

A jornada fica **dentro do fluxo guiado existente**, não numa página separada:

1. **Receita:** "O que você quer fazer?", com grupos por intenção, busca e cartões com a prévia em Stories. Ao escolher, preenche o objetivo-modelo, os materiais esperados e as ferramentas.
2. **Contexto:** nicho (um dos 53 segmentos, opcional), assunto, **Gerar pauta** (6 tipos) e **links** do produto ou site.
3. **Estilos:** a **IA pré-seleciona** os estilos do catálogo que combinam com aquela receita (e com o nicho), explicando o porquê de cada um. A pessoa aceita ou troca. São **1 estilo principal + complementos por escopo** (paleta, tipografia, abertura, CTA, b-roll…), respeitando `styleContributions` e os escopos do kit. Inclui comparação lado a lado e "ver a sequência" do estilo.
4. **Materiais:** gerados a partir das entradas da receita, do que os links trouxeram e do que o estilo exige (`requirements`, `resources`).
5. **Perguntas:** as da receita e as gerais. A pessoa responde agora no site ou deixa para o agente perguntar.
6. **Revisão e entrega**, com três saídas, todas a partir do mesmo objeto de pedido:
   - **Pacote para Codex e Claude Code:** o `projeto-video.json` do kit, ampliado com receita, estilos com escopo, pauta e fontes, links e o que foi extraído, respostas, ferramentas e skills sugeridas, regras de aprovação. O pacote criptografado continua como já existe.
   - **Prompt para ChatGPT e Claude.ai:** texto completo com a ficha de cada estilo (assinatura, movimento, recursos, prova, direção de arte e paleta) e links das imagens de referência para anexar.
   - **Produzir no próprio site:** pipeline com o Gemini — moodboard → storyboard → amostra de 10s → vídeo — com as aprovações e a reserva de custo em `jobs.reserved_micros`. Deixe pronto o gancho para cobrança por créditos no futuro (eventos de uso por chamada), sem implementar cobrança agora.

## Padrão visual

Mantenha **o padrão visual do zapvideo**: tema escuro, fundo `#101010`, painéis `#171717`/`#242424`, bordas `#383838`, texto `#f5f5f5`/`#b3b3b3`, limão `#e2ff3b` como único destaque com texto `#161b05`, fonte Geist (ZapVideo), botões e filtros em pílula, sombra `0 3px 10px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.32)` e foco em limão. As cenas SVG do Arsenal entram como **componente de explicação** da receita (o que vai acontecer). Os **quadros reais do catálogo** continuam sendo a referência visual dos estilos. Defina quando usar cada um. Mobile primeiro.

## O que o plano deve conter

1. **Mapa do existente:** o que reaproveitar, o que estender, o que substituir. Diga também o que no `zapvideo-recipes.mjs` e no `zapvideo-guided.mjs` conflita com os dados do Arsenal.
2. **Modelos de dados** em TypeScript ou JSON Schema, com exemplos:
   - `Recipe`: id, grupo, intenção, objetivo-modelo com slots tipados, etapas e cena, entradas, perguntas com tags, ferramentas, `styleQuery` (famílias, kinds, flags como `presenterEditing`/`advertising`, segmentos, exclusões, estilos-âncora), porquê e referências.
   - `StyleSelection`: principal, complementos com escopo, origem (IA ou pessoa) e justificativa.
   - `PautaRequest`/`PautaResult`: tipo, consulta, fontes com URL e data, fatos com origem e objetivo.
   - `LinkExtraction`: url, título, imagens e vídeos com permissão de uso, preço, variações, cores, logo e lacunas.
   - `ToolRegistry`, `ConflictRule` e `QuestionBank` (com tags de deduplicação).
   - `ProjectRequest`: extensão do pedido atual do kit, versionada e compatível com o `npm run video -- import`.
   - `PromptTemplate` por destino (Claude Code, Claude.ai, ChatGPT).
   - `UsageEvent`, para créditos no futuro.
3. **Algoritmo de pré-seleção de estilos:**
   - pontuação determinística pelos campos do catálogo (receita × nicho × objetivo × materiais disponíveis × `readiness`);
   - reordenação opcional pelo Gemini, com explicação curta para cada estilo;
   - limites, cache, comportamento sem IA e como evitar estilos que exigem material que a pessoa não tem.
   - Mostre a tabela "receita → consulta de estilos" para pelo menos 10 receitas.
4. **Índice enxuto do catálogo:** o `catalog.json` tem 35 MB. Proponha um índice gerado no build (campos para filtrar e exibir, por receita e por segmento) e a ficha completa sob demanda.
5. **Telas:** wireframes em texto ou ASCII de cada passo, no celular e no computador, com estados vazios, carregando, erro e sem permissão. Inclua a barra de seleção, o painel de revisão e as três saídas, e como as cenas Stories e os quadros reais convivem.
6. **Fluxos** em diagramas mermaid: jornada completa, pauta, links, pré-seleção de estilos, geração das três saídas e produção no site com aprovações.
7. **Montagem das saídas:** a ordem e o conteúdo de cada bloco (receita, estilos com ficha, materiais, links, ferramentas e skills com `/comando`, conflitos, perguntas, aprovações e custo). Inclua um exemplo completo de cada saída para uma receita de apresentador (por exemplo "Diagrama que acende quando é citado") e uma de loja (por exemplo "Vídeo de produto para loja online").
8. **Migração:** como juntar os dados do Arsenal ao `zapvideo-recipes.mjs` sem quebrar o que existe, com tabela de ids e regra de nomes. Como portar `scenes.js` e `story()` para módulos ES do site.
9. **Back-end:** rotas novas do Worker (pauta, links, pré-seleção, prompt) com limites, orçamento Gemini, tratamento de tempo esgotado sem repetir cobrança, privacidade (LGPD) e o que fica salvo em D1 e R2.
10. **Fases e tarefas:** tamanho estimado, dependências, critério de pronto, testes (unidade, contrato do pedido, navegador em celular e computador, acessibilidade) e riscos.

## Perguntas que você deve me fazer (no mínimo estas, mais as que surgirem)

- Quantos estilos a IA deve sugerir por receita (3, 5, 8)? Mostro o principal já marcado?
- A pré-seleção usa só regras ou também o Gemini? Qual o limite de custo por pessoa por dia?
- O nicho é obrigatório, opcional ou deduzido do link?
- As perguntas são respondidas no site, deixadas para o agente, ou as duas coisas?
- Quais receitas podem "produzir no site" já na primeira versão, e quais só exportam pacote ou prompt?
- A pauta e a leitura de links ficam liberadas sem login ou exigem conta ou código do piloto?
- Uso a imagem real do catálogo, a cena SVG ou as duas no cartão da receita?
- Os complementos de estilo têm quais escopos permitidos (paleta, tipografia, abertura, CTA, legenda, b-roll, trilha)?
- Como tratar receitas que dependem de skills que só existem no Claude Code (por exemplo HyperFrames, Remotion) quando o destino é ChatGPT?
- A linha GDA (uso interno) aparece no site público?
- Qual a ordem de prioridade entre os 9 grupos de receitas para a primeira entrega?
- Quer métricas de uso (receita escolhida, estilo aceito ou trocado, saída gerada) desde a primeira versão?

## Restrições

- Não implemente nesta fase. Não publique, não altere produção, não ligue geração paga, não crie cobrança.
- Não mexa no trabalho não commitado do branch. Use um branch novo de planejamento.
- Não invente campos do catálogo nem rotas que não existem. Quando supuser algo, marque como suposição.
- Não coloque segredos, chaves nem mídia de cliente no Git.
- Escreva em português do Brasil, com linguagem simples nos textos de interface.
