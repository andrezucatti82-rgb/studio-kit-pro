# Site → Codex / Claude Code → vídeo — 2.11.0

O pedido da galeria agora orienta o agente a executar a produção. O projeto baixado inclui o contrato do orquestrador e todas as escolhas. Codex e Claude Code compartilham a mesma skill; o modelo da própria conversa interpreta o briefing e escreve o plano. Nenhuma API adicional OpenAI/Anthropic é exigida para esse planejamento.

## Percurso da pessoa

1. Escolha o modelo visual e, se desejar, características de outros estilos. Informe assunto, materiais, formato e duração.
2. Copie o pedido e envie ao Codex ou Claude Code, junto de `projeto-video.json` e dos materiais reais. Os PNGs podem ser anexados quando o agente não acessar as referências.
3. O agente confere anexos, referências e ferramentas, importa a ficha e prepara roteiro/moodboard/storyboard. Pergunta somente sobre faltas que bloqueiam a próxima entrega.
4. Aprove as entregas visuais nas etapas previstas. Quando houver geração cobrada, receba ferramenta/modelo, estimativa, escopo e tentativas antes de autorizar.
5. Receba a amostra da ação/passagem mais exigentes. Depois de revisar e aprovar a amostra, o agente executa o filme completo e entrega o MP4, legendas, projeto e evidências.

O usuário não precisa operar uma fila, escrever JSON ou repetir o briefing. Esses são trabalhos do agente. Arquivos declarados no site não são transferidos automaticamente à conversa. Aprovações registradas no site continuam sendo dados a conferir, não autorização automática para gerar.

## O que mudou no motor

O executor editorial da prova anterior foi preservado. A nova rota recebe um plano declarativo `schemaVersion:2`, `provider:"agent"`, com cenas e camadas independentes: mídia original, tipografia editável, fontes locais licenciadas, formas, caminhos SVG, máscaras, curvas Bézier por keyframes e composição por planos. Não depende da paleta ou do layout da prova anterior.

O importador aceita o pacote completo, o preset e a ficha portátil. Resolve os estilos pelo catálogo local, guarda a fonte, o manifesto de referências, as contribuições/escopos e um fingerprint do contexto. O validador rejeita seleção alterada, contribuição omitida, aplicação fora do escopo, referência inventada, comandos, caminhos de mídia arbitrários e parâmetros fora dos operadores suportados. O render verifica o encaixe do texto com a fonte real carregada, em vez de cortar a copy para passar.

Áudio de narração, música e SFX usa arquivos registrados e tempos explícitos; a música é reduzida sob a narração. Legendas seguem cues revisados. Stock autorizado, imagens IA, clipes/voz/avatares HeyGen podem entrar como materiais, após a checagem de compatibilidade, direitos, identidade, aprovação e custo. O motor não faz uma chamada paga somente porque foi escolhida uma referência.

**Cobertura não significa certificação de todos os estilos.** Os 1.160 IDs podem ser importados e vinculados; cada pedido precisa de um plano, mídia e ferramentas capazes de executar sua linguagem. Câmera espacial, atuação, geometria 3D, tracking ou novos movimentos não surgem de uma foto nem são simulados por um template. O agente deve obter mídia compatível ou implementar uma rota específica antes de prometer essas ações. Se isso depender de acesso, materiais ou custo, a dependência é apresentada, sem substituição silenciosa.

## Comandos executados pelo agente

```sh
npm ci
npm run check
npm run video -- import --preset caminho/projeto-video.json --out projects/cliente
npm run video -- media --project projects/cliente --file caminho/original.mp4 --rights "origem/licença ou autorização"
npm run video -- context --project projects/cliente
# O próprio agente escreve o plano com o schema/contexto e os arquivos reais.
npm run video -- validate --project projects/cliente --plan projects/cliente/plan.json --phase full
CHROME_PATH=/usr/bin/chromium npm run video -- stills --project projects/cliente --plan projects/cliente/plan.json
# Depois dos aceites reais; para a amostra, use seu plano de exatamente 5 s:
CHROME_PATH=/usr/bin/chromium npm run video -- render --project projects/cliente --plan projects/cliente/sample-plan.json --phase sample --workflow projects/cliente/workflow.json
# Após os gates do filme completo:
CHROME_PATH=/usr/bin/chromium npm run video -- render --project projects/cliente --plan projects/cliente/plan.json --phase full --workflow projects/cliente/workflow.json
# Somente após playback, escuta e registros reais:
npm run video -- deliver --project projects/cliente --job ID --workflow projects/cliente/workflow.json
```

`validate` escreve versões imutáveis em `prepared/`, com pedido/plano normalizados e hashes. `stills` produz quadros para avaliação sem gerar vídeo IA. A amostra exige aprovações independentes de visual, roteiro, moodboard e storyboard; o aceite do storyboard deve apontar ao moodboard atual. O plano executável é aprovado sobre o storyboard para amostra e sobre a amostra integrada para filme completo. O render usa esse plano exato, sem nova inferência depois do aceite.

O CLI `deliver` verifica o SHA256 do MP4, relatório técnico, revisão e workflow. Sem playback/escuta reais ou aceites válidos, mantém o candidato com revisão pendente. Essa separação evita chamar de final aprovado um arquivo que apenas decodifica.

## Instalação e distribuição

- **Codex no repositório:** `AGENTS.md` e `.agents/skills/video-multimarcas/` apontam à referência executável.
- **Claude Code no repositório:** `CLAUDE.md` e `.claude/skills/video-multimarcas/SKILL.md` descobrem a mesma skill canônica.
- **Outro projeto local:** `node scripts/install-agent.mjs --agent claude --project-root caminho/do/projeto` instala a skill completa e preserva uma cópia anterior em `.cache/`. Use `--agent codex` para a convenção `.agents/skills`. Outros plugins/skills são preservados.
- **Plugins:** manifestos e pacotes específicos para Codex e Claude Code, ambos gerados a partir da skill canônica. Não reutilizar manifesto Codex como se fosse manifesto Claude.
- **Runtime separado:** `dist/video-multimarcas-runtime.zip` contém código, schemas, templates, catálogo textual e fontes; não contém credenciais, originais de clientes, vídeos de demonstração, `node_modules` ou as 4.640 imagens do catálogo. O manifesto interno registra hashes. Referências visuais permanecem no site/repositório e devem ser realmente consultadas.

O runtime mínimo é um pacote para produção, não uma cópia de todas as fixtures da suíte de regressão. Instale dependências e execute `npm run check`/`npm run doctor`; para a regressão completa, use o checkout integral do GitHub. O pacote da skill contém instruções, não o renderizador. Instalar no ambiente atual não instala no computador de outra pessoa ou conecta contas automaticamente.

## Recursos e custos verificados nesta sessão

O ambiente de desenvolvimento tem Node, FFmpeg, FFprobe e Chromium. A conexão HeyGen foi consultada somente por leitura: as duas conexões disponíveis autenticaram na mesma conta. Não houve geração, clonagem ou cobrança nesta verificação. A ausência de `HEYGEN_API_KEY` no shell não foi tratada como ausência dessa conexão.

Claude Code não está instalado neste ambiente; sua descoberta de arquivos e pacotes pode ser validada estruturalmente, mas isso não equivale a uma conversa real no Claude Code. A instalação e as conexões no computador local precisam ser verificadas ali. Segredos não são transferidos pelo plugin ou runtime.

## Publicação e limites

Código, pacotes, instalação no agente e publicação do frontend são estados separados. Atualizar a PR não atualiza o domínio. O deploy atual do domínio depende de cPanel; sem a conexão segura não se deve declarar a publicação concluída nem mudar DNS para contornar o bloqueio. Os originais de clientes e provas audiovisuais continuam fora do Git.

Consulte o relatório de validação da versão para comandos e evidências. A prova de engenharia não concede aprovação criativa a pedidos futuros. Nenhum novo estilo é rotulado como audiovisual aprovado apenas por ter sido importado ou ter um schema válido.
