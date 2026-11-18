# Instalar o Studio Kit Pro · 2.12.0

A publicação inicial 2.12.0 foi integrada à `main` pela PR #20. A integração VFX/rota v3 desta árvore é candidata: preparar os pacotes não atualiza o site nem contas externas. [Estado da entrega e limites verificados](https://github.com/andrezucatti82-rgb/studio-kit-pro/blob/main/docs/RELEASE-2.12.md). O instalador fixa uma revisão imutável, registrada em `installation.json`; novas instalações não atualizam automaticamente pastas anteriores.

## Instalação recomendada: um ZIP

No [site público](https://videos.gerenciadordeanuncios.com.br/?v=2.12.0#instalar), use **Instalar ferramenta → Baixar instalador completo**. Extraia o ZIP e abra `LEIA-PRIMEIRO.html`. Execute `INSTALAR.cmd` no Windows ou `sh install.sh` no macOS/Linux. O instalador compacto fixa uma revisão do GitHub e confere os hashes antes de executar. Precisa de internet: baixa o projeto completo, inclusive referências visuais, e dependências; reserve 3 GB livres.

Aproveita Node.js 22+ ou prepara Node.js 24 portátil, instala dependências com `npm ci`, verifica as oito skills locais para Codex/Claude Code e testa FFmpeg/FFprobe e abertura do navegador de renderização. Pode instalar Git/FFmpeg via winget, Homebrew ou apt quando o gerenciador estiver disponível e pode pedir confirmação local. Não altera políticas de execução, contas, outras skills globais ou projetos existentes. Requisitos não atendidos deixam status de falha/pendência e instrução de retomada; não anunciam instalação pronta.

Ao concluir, abre o [tutorial completo](COMECE-AQUI.html). Abra a pasta instalada no Codex ou Claude Code e inicie nova sessão. Os aplicativos dos agentes e seus logins são requisitos separados; este pacote instala o projeto, não uma conta. Para CLI e Node portátil, use `studio.sh`/`STUDIO.cmd`; o modo `atlas` abre o catálogo local. As configurações de descoberta já pertencem ao repositório; não é necessário instalar plugins globais duplicados.

Uma retomada da mesma revisão confere os arquivos e preserva `projects/`. Outra versão ou pasta pessoal exige destino novo. O relatório `installation-report.json` distingue `source_verified_runtime_pending`, `installing`, `failed` e `ready`; `ready` comprova somente os testes locais descritos.

O ZIP está em `style-atlas/dist/downloads/studio-kit-pro-installer.zip`; `installation.json` registra revisão, hash e disponibilidade. Só é liberado no site quando os arquivos protegidos correspondem ao commit fixado. O ZIP atualmente oferecido no site corresponde à publicação autorizada; preparar futuros pacotes não os publica automaticamente. Git clone, plugins e pacotes menores continuam opções avançadas abaixo.

## Um pacote, oito skills

O plugin existente `video-multimarcas` continua com o mesmo identificador e instala o conjunto:

| Entrada | Responsabilidade |
|---|---|
| `video-multimarcas` | Orquestração e continuidade |
| `video-planejamento` | Pesquisa, materiais, roteiro e direção |
| `video-explicador-interativo` | Pessoa/avatar e explicação em interação |
| `video-publicidade` | Argumento, demonstração, oferta e CTA |
| `video-edicao` | B-roll, edição, motion, legendas e áudio |
| `video-vfx` | Tracking, roto, key, cleanup, composição e CG/FX por plano |
| `video-tratamento` | Diagnóstico, cor/textura, finalização sonora e limites técnicos |
| `video-revisao` | Evidências, revisão audiovisual e entrega |

O pedido do site leva `skillRouting`, `intentSummary`, estilos, contribuições/escopos e referências. A orquestradora escolhe os módulos pertinentes. Responsabilidades são do projeto, não prova de agentes paralelos, e não reiniciam etapas aprovadas.

## Codex ou Claude Code no checkout

Para obter a versão da `main` em uma pasta nova:

```bash
git clone --branch main https://github.com/andrezucatti82-rgb/studio-kit-pro.git
cd studio-kit-pro
npm ci
npm run doctor
```

`AGENTS.md` e `CLAUDE.md` orientam a produção; `.agents/skills/` contém as fontes canônicas e `.claude/skills/` tem os oito arquivos de descoberta. Abra uma nova sessão do agente e confirme quais instruções foram carregadas. O diagnóstico verifica arquivos/comandos locais; conexão, saldo, modelo, playback e escuta precisam de verificações próprias.

Diga: “Use $video-multimarcas e execute o pedido anexado.” Envie `projeto-video.json` e seus originais. O agente importa o pedido no runtime 2.12.0 e usa o modelo da própria conversa para planejar; outra API OpenAI/Anthropic não é obrigatória para interpretar a ficha. O usuário não precisa escrever o plano técnico.

Para instalar todas as oito skills em **outro projeto** já existente:

```bash
node scripts/install-agent.mjs --agent codex --project-root /caminho/do/projeto
node scripts/install-agent.mjs --agent claude --project-root /caminho/do/projeto
```

Escolha o comando do seu agente. O instalador verifica as oito fontes, prepara a atualização, faz backup das versões anteriores e atualiza somente os oito IDs do kit. Outras skills e configurações permanecem preservadas. O resultado informa caminhos e backups. Ele instala instruções; não copia runtime, mídia ou conexões para o projeto de destino. O agente deve localizar o checkout/runtime compatível ao executar. Reabra a sessão e confira a versão.

## Plugins completos

`dist/video-multimarcas-plugin.zip` é o plugin Codex com oito skills; `dist/video-multimarcas-claude-plugin.zip` é o plugin Claude Code com as mesmas fontes. Use o fluxo de instalação disponível na sua versão do agente.

Quando o Codex CLI oferecer marketplace/plugin:

```bash
codex plugin marketplace add andrezucatti82-rgb/studio-kit-pro --ref main
codex plugin add video-multimarcas@video-multimarcas-kit --json
codex plugin list --json
```

Esses comandos usam `main`. Para testar mudanças ainda não publicadas, use o checkout local da branch correspondente como origem do marketplace. Preserve o nome e a origem já configurados ao atualizar; não instale cópias concorrentes desnecessariamente. Para uma origem Git existente:

```bash
codex plugin marketplace upgrade video-multimarcas-kit --json
codex plugin add video-multimarcas@video-multimarcas-kit --json
```

No Claude Code com suporte a plugins:

```bash
claude plugin marketplace add andrezucatti82-rgb/studio-kit-pro
claude plugin install video-multimarcas@video-multimarcas-kit
```

Uma instalação pessoal `video-b-roll` é separada deste kit. Não removê-la, atualizá-la ou sobrescrevê-la como parte desses comandos.

## Pacote mínimo, runtime e chat

`dist/video-multimarcas.skill` e `.zip` contêm a orquestradora e todas as instruções dos módulos incorporadas em `references/skill-modules/`. Isso permite ler os módulos em interfaces que importam uma única skill, embora não registre sete entradas extras nesses hosts. Os plugins completos registram os oito nomes. Compatibilidade de importação depende da interface; não existe um botão universal garantido.

`dist/video-multimarcas-runtime.zip` inclui código executável, fontes das oito skills, catálogo textual e manifesto de integridade. Extraia numa pasta nova, rode `npm ci`, `npm run check` e `npm run doctor`. Não inclui imagens de referência do catálogo, mídia de clientes, contas, credenciais ou fixtures completas da regressão. Referências são obtidas do site/repositório ou anexadas pelo usuário.

No ChatGPT/Claude sem execução verificada, a conversa pode fazer as etapas disponíveis e informar a dependência para a produção. Abrir o chat pelo site não envia mensagens, transfere os originais, instala ferramentas ou inicia geração. Cole o pedido e anexe JSON/arquivos; na Page, o estado disponível também deve ser conferido. A ficha mantém continuidade para uma sessão com execução quando necessário.

## Versão e manutenção

Distribuição: plugin **2.12.0**, runtime **2.12.0**, catálogo **4.8**, **1.425 estilos em sete categorias**, incluindo **265 explicadores em 53 segmentos**. Verifique hashes e arquivos em `dist/release-manifest.json`; pacote preparado, pacote baixado, instruções carregadas, instalação na conta e domínio publicado são estados separados.

Fontes editáveis: `.agents/skills/<id>/`. As referências comuns pertencem à orquestradora; as cópias incorporadas e os diretórios `plugins/` são gerados por:

```bash
npm run package
npm run check
npm test
npm run validate
```

O empacotador produz os dois plugins completos, o pacote portátil e o runtime com a mesma versão, sem material pessoal. Atualizar somente `SKILL.md` pode deixar referências incompatíveis; atualize o conjunto completo e confira sua versão efetivamente carregada.
