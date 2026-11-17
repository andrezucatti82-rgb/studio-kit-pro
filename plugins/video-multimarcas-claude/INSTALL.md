# Instalar o Studio Kit Pro · candidato 2.12.0

Esta documentação descreve a PR #20, ainda em revisão. Preparar os pacotes não publica o domínio nem atualiza instalações externas. Confira a branch/commit e `dist/release-manifest.json`; `main` e o site podem distribuir uma versão anterior até uma publicação autorizada.

## Um pacote, sete skills

O plugin existente `video-multimarcas` continua com o mesmo identificador e instala o conjunto:

| Entrada | Responsabilidade |
|---|---|
| `video-multimarcas` | Orquestração e continuidade |
| `video-planejamento` | Pesquisa, materiais, roteiro e direção |
| `video-explicador-interativo` | Pessoa/avatar e explicação em interação |
| `video-publicidade` | Argumento, demonstração, oferta e CTA |
| `video-edicao` | B-roll, edição, motion, legendas e áudio |
| `video-tratamento` | Diagnóstico, cor/textura, finalização sonora e limites técnicos |
| `video-revisao` | Evidências, revisão audiovisual e entrega |

O pedido do site leva `skillRouting`, `intentSummary`, estilos, contribuições/escopos e referências. A orquestradora escolhe os módulos pertinentes. Responsabilidades são do projeto, não prova de agentes paralelos, e não reiniciam etapas aprovadas.

## Codex ou Claude Code no checkout

Para testar este candidato em pasta nova:

```bash
git clone --branch feat/interactive-presenter-styles https://github.com/andrezucatti82-rgb/studio-kit-pro.git
cd studio-kit-pro
npm ci
npm run doctor
```

`AGENTS.md` e `CLAUDE.md` orientam a produção; `.agents/skills/` contém as fontes canônicas e `.claude/skills/` tem os sete arquivos de descoberta. Abra uma nova sessão do agente e confirme quais instruções foram carregadas. O diagnóstico verifica arquivos/comandos locais; conexão, saldo, modelo, playback e escuta precisam de verificações próprias.

Diga: “Use $video-multimarcas e execute o pedido anexado.” Envie `projeto-video.json` e seus originais. O agente importa o pedido no runtime 2.12.0 e usa o modelo da própria conversa para planejar; outra API OpenAI/Anthropic não é obrigatória para interpretar a ficha. O usuário não precisa escrever o plano técnico.

Para instalar todas as sete skills em **outro projeto** já existente:

```bash
node scripts/install-agent.mjs --agent codex --project-root /caminho/do/projeto
node scripts/install-agent.mjs --agent claude --project-root /caminho/do/projeto
```

Escolha o comando do seu agente. O instalador verifica as sete fontes, prepara a atualização, faz backup das versões anteriores e atualiza somente os sete IDs do kit. Outras skills e configurações permanecem preservadas. O resultado informa caminhos e backups. Ele instala instruções; não copia runtime, mídia ou conexões para o projeto de destino. O agente deve localizar o checkout/runtime compatível ao executar. Reabra a sessão e confira a versão.

## Plugins completos

`dist/video-multimarcas-plugin.zip` é o plugin Codex com sete skills; `dist/video-multimarcas-claude-plugin.zip` é o plugin Claude Code com as mesmas fontes. Use o fluxo de instalação disponível na sua versão do agente.

Quando o Codex CLI oferecer marketplace/plugin:

```bash
codex plugin marketplace add andrezucatti82-rgb/studio-kit-pro --ref main
codex plugin add video-multimarcas@video-multimarcas-kit --json
codex plugin list --json
```

Esses comandos usam `main`. Para testar a PR, use o checkout local do candidato como origem do marketplace. Preserve o nome e a origem já configurados ao atualizar; não instale cópias concorrentes desnecessariamente. Para uma origem Git existente:

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

`dist/video-multimarcas.skill` e `.zip` contêm a orquestradora e todas as instruções dos módulos incorporadas em `references/skill-modules/`. Isso permite ler os módulos em interfaces que importam uma única skill, embora não registre seis entradas extras nesses hosts. Os plugins completos registram os sete nomes. Compatibilidade de importação depende da interface; não existe um botão universal garantido.

`dist/video-multimarcas-runtime.zip` inclui código executável, fontes das sete skills, catálogo textual e manifesto de integridade. Extraia numa pasta nova, rode `npm ci`, `npm run check` e `npm run doctor`. Não inclui imagens de referência do catálogo, mídia de clientes, contas, credenciais ou fixtures completas da regressão. Referências são obtidas do site/repositório ou anexadas pelo usuário.

No ChatGPT/Claude sem execução verificada, a conversa pode fazer as etapas disponíveis e informar a dependência para a produção. Abrir o chat pelo site não envia mensagens, transfere os originais, instala ferramentas ou inicia geração. Cole o pedido e anexe JSON/arquivos; na Page, o estado disponível também deve ser conferido. A ficha mantém continuidade para uma sessão com execução quando necessário.

## Versão e manutenção

Candidato: plugin **2.12.0**, runtime **2.12.0**, catálogo **4.6**, **1.220 estilos/30 subcategorias**, incluindo **60 explicadores em 17 segmentos**. Verifique hashes e arquivos em `dist/release-manifest.json`; pacote preparado, pacote baixado, instruções carregadas, instalação na conta e domínio publicado são estados separados.

Fontes editáveis: `.agents/skills/<id>/`. As referências comuns pertencem à orquestradora; as cópias incorporadas e os diretórios `plugins/` são gerados por:

```bash
python scripts/package-skill.py
npm run check
npm test
npm run validate
```

O empacotador produz os dois plugins completos, o pacote portátil e o runtime com a mesma versão, sem material pessoal. Atualizar somente `SKILL.md` pode deixar referências incompatíveis; atualize o conjunto completo e confira sua versão efetivamente carregada.
