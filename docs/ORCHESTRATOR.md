# Orquestrador local GDA Vídeos

Recebe mídia registrada e um pedido, prepara um plano validado, executa cortes com FFmpeg, anima com Remotion e entrega um MP4 candidato com relatório técnico, legendas e quadros. O atlas e o fluxo guiado são preservados. Esta implementação inicial executa um estilo editorial; não afirma automatizar todo o catálogo.

## Instalação e execução

Node 22+, npm, FFmpeg, FFprobe e Chromium compatível. Python 3 é usado apenas para criar a mídia original da prova; não requer pacotes Python adicionais. Licenças: `THIRD_PARTY.md`, Geist OFL e condições comerciais próprias do Remotion.

```sh
npm ci
npm run check
npm test
npm run validate
CHROME_PATH=/usr/bin/chromium npm run production:poc
# Depois que o comando terminar:
CHROME_PATH=/usr/bin/chromium npm run production:serve -- --root projects/orchestrator-poc
```

Abra `http://127.0.0.1:8780`. Em “Meu vídeo”, o bloco “Produzir neste computador” recebe mídia, direitos, prompt, formato e duração. O seletor da biblioteca fornece o estilo. Uploads são reais, resultados retomam pelo ID e o player/download usam o MP4 produzido. Esse bloco só é ativado pelo servidor local; `npm run atlas` e o site estático mantêm a experiência guiada.

O teste `production:poc` aceita apenas seu próprio pedido determinístico e os bytes da mídia original criada por `scripts/production-fixture.py`. Essa rota atende à prova de engenharia expressamente solicitada na missão, sem aprovar visuais, gerar vídeo por IA, chamar modelo ou abrir um bypass de uploads na API. Usa um worker próprio e não pode rodar no mesmo diretório enquanto `production:serve` detém o lock.

## Produção com materiais do usuário

```sh
npm run production -- --import caminho/video.mp4 --rights "Material próprio autorizado"
# Use o id retornado em um request.json como o abaixo.
npm run production -- --prepare projects/exemplo/request.json --out projects/exemplo/prepared
# Faça a pré-produção visual e registre apenas aprovações realmente obtidas.
npm run production -- --request projects/exemplo/prepared/request.json --workflow projects/exemplo/workflow.json --key pedido-exemplo-001
```

Exemplo de pedido:

```json
{
  "styleId": "campanha-frase-que-reorganiza-o-quadro",
  "prompt": "Uma ideia ganha espaço. O movimento organiza o argumento e conecta a conclusão.",
  "assetIds": ["ID-RETORNADO-PELO-UPLOAD"],
  "durationSeconds": 30,
  "format": "16:9",
  "fps": 30,
  "captions": []
}
```

O ID ilustrativo acima precisa ser substituído. `musicAssetId` é opcional. Sem ele, o motor compõe uma trilha instrumental original e registra procedência. Com ele, importa áudio autorizado, repete até a duração e aplica fades. Vídeos de origem mantêm áudio com microfades nas emendas. O resultado é mixado e normalizado, com medição do AAC final. Não há ducking por fala, ASR ou autorização automática de músicas.

No modo determinístico, o prompt vira texto de tela com heurística explícita; não há compreensão por modelo. A quebra de cenas pondera o comprimento da copy e a janela de leitura. Para cortes motivados por fala real, forneça `captions` com tempos revisados: `{start,end,text}`. Os inícios dessas falas definem os cortes. O modo sem voz da prova usa marcas de texto ajustadas à trilha, sem alegar sincronismo labial ou transcrição.

O schema aceita 10–60 segundos, 24/30 FPS e `16:9`, `9:16`, `1:1`, `4:5`. A prova integral validada é `16:9`; os demais formatos têm geometria e testes de quadros, sem aprovação estética integral.

### Aprovações preservadas

Use `templates/workflow.json` e o protocolo existente. O render normal exige `checkWorkflow(..., 'full-render', ...)`: visuais, roteiro, animatic e amostra integrada com hashes e decisões reais. Acrescente:

- `productionRequestSha256` de `prepared/preparation.json` para ligar o pedido exato.
- `artifacts.edit_plan: {file, sha256}` para o JSON realmente apresentado. O hash deve ser dos bytes do arquivo, por exemplo `sha256sum edit-plan.json`.
- `approvals.edit_plan: {status:"approved", by:"user", quote, messageRef, sha256, basis:{integrated_sample:"HASH-DA-AMOSTRA"}}`, apenas após o aceite real daquele plano.

O plano aprovado é copiado para o job e executado sem nova inferência. Não se gera outro plano por IA depois do aceite. Alterações de pedido, arquivo ou amostra invalidam o vínculo. Os registros verificam integridade/completude; não provam por si só a veracidade de uma aprovação humana. O serviço pode receber `--workflow caminho/workflow.json`; nenhum caminho ou aprovação é aceito do navegador.

O formulário prepara e permite baixar o pedido/plano mesmo quando a produção está bloqueada por aprovações. Mantenha o fluxo guiado para preparar/revisar os visuais e amostra; a nova interface não automatiza concessão de aceites. O executor mínimo não fornece uma nova UI completa de pré-produção.

## Provedor de IA

`createPlanner()` usa `deterministic` por padrão. O adaptador OpenAI usa JSON validado, no máximo uma correção de plano e não recebe ferramentas de shell. URLs/endpoints e executáveis não podem vir do modelo.

```sh
# Somente se chamadas pagas de planejamento estiverem autorizadas para o projeto:
# Configure OPENAI_API_KEY e GDA_OPENAI_MODEL em seu ambiente, fora do Git.
npm run production -- --prepare projects/exemplo/request.json --out projects/exemplo/prepared-ai --provider openai --allow-paid-planning
```

Não houve chamadas reais de modelo nesta entrega. Os testes do adaptador usam respostas explicitamente simuladas e não comprovam planejamento por IA. Não há adaptador Anthropic implementado; o contrato `planner.plan(request, assets, skill, {signal})` permite acrescentá-lo. Geração audiovisual externa continua no fluxo existente com orçamento/aprovação próprios; este pipeline não chama HeyGen ou geradores por inferência.

## Módulos e estados

| Arquivo | Responsabilidade |
|---|---|
| `server/schema.mjs` | Zod estrito; pedidos, plano, mídia, tempos, resolução, leitura e fidelidade |
| `server/skills.mjs` | Catálogo completo e snapshots das referências locais |
| `server/planner.mjs` | Interpretador determinístico e adaptador OpenAI com reparo limitado |
| `server/assets.mjs`, `process.mjs` | Upload por bytes, FFprobe, direitos, SHA256 e subprocessos sem shell |
| `server/editor.mjs`, `score.mjs` | Cortes/reordenação, áudio e trilha procedural original |
| `src/production/` | Composição e biblioteca modular de motion |
| `server/renderer.mjs`, `validator.mjs` | Bundle isolado, render, quadros, integridade e medição |
| `server/orchestrator.mjs` | Fila persistida, estados, deduplicação, cancelamento e recuperação |
| `server/http.mjs`, `production-ui.js` | API e formulário/player locais, com proteção de sessão |

`queued → analyzing → planning → editing → rendering → validating → completed`, além de `failed` e `cancelled`. `completed` significa conclusão técnica; `reviewStatus` continua `review_pending`. Logs, progresso, entradas, plano, score e relatório ficam em `projects/.../jobs/<id>/`. O Git ignora essas pastas. MP4 e quadros não são publicados na PR.

Um worker atende um job por vez; Remotion usa dois renderizadores concorrentes por padrão. Erros transitórios específicos podem provocar uma única nova tentativa com concorrência 1. Erros de schema, mídia ou validação não são reenviados cegamente. `RENDER_CONCURRENCY=1` limita a concorrência inicial no teste CLI.

O limite padrão é 15 minutos por execução. FFmpeg e Remotion recebem cancelamento; um bundle Webpack em andamento termina antes de observar o abort, limitação conhecida. O lock impede processos duplicados sobre a mesma raiz. Uma reinicialização marca jobs interrompidos como falhos e limpa temporários, sem reenvio automático. Após crash abrupto, confirme que o worker antigo terminou antes de remover manualmente `worker.lock`. Resultados concluídos e fontes são preservados.

## Motion Design

`src/production/motion.mjs` exporta o catálogo de parâmetros/duração/restrições. `Motion.tsx` oferece `KineticType`, `TrackMatte`, `TrimPath`, `ShapeMorph`; `ProductionFilm.tsx` combina camadas com paralaxe gráfica, pausa de leitura e passagem com sobreposição congelada do último frame anterior. Não são geometria 3D, tracking nem novos ângulos da mídia original.

Foram reaproveitados o timeline em frames, fontes, curva Bézier `.22,.75,.2,1`, mecanismo tipográfico e score por eventos dos estudos. São novos: solucionador Bézier independente para testes, entradas por palavra/caractere sem quebrar palavras, matte, trim SVG, morph de polígonos compatíveis e envelope de pulso no BPM real da trilha. A transformação de pontos preserva topologia; não promete morph arbitrário de qualquer SVG.

## Testes e evidências

```sh
npm run check
npm test
npm run validate
node --test tests/orchestrator.test.mjs
# Com servidor local e POC concluída na mesma raiz:
GDA_QA_ROOT=projects/orchestrator-poc python3 tests/browser-production.py
```

O teste integrado renderiza 900 frames através do orquestrador real, sem reutilizar MP4 de demonstração. Verifica existência, tamanho, duração, dimensões, FPS, codecs, frames, pixel format, áudio e decodificação integral. Aceita H.264 4:2:0 em faixa limitada (`yuv420p`) ou completa (`yuvj420p`) com metadados de cor explícitos.

Os testes rápidos de orquestração usam stubs explicitamente identificados para estados/cancelamento; os testes de edição executam FFmpeg de verdade; a POC executa Remotion de verdade. Isso não constitui teste real de modelo ou geração externa. Consulte `ORCHESTRATOR-VALIDATION.md` para resultados medidos.

## Limites e continuidade

Não há reconhecimento de fala, remoção semântica de silêncios, estabilização, rotoscopia, tracking, speed ramp, J/L-cuts configuráveis ou After Effects. São extensões progressivas que exigem novos operadores/schemas/testes; não estão sendo simuladas. O modo atual preserva a vista original em `contain`, usa texto e ações gráficas e pode cortar/montar áudio e vídeo autorizados.

Faltam avaliação contínua real de movimento, escuta integral e aprovação estética. Quadros/medições não autorizam declarar qualidade profissional. A prova sem voz não valida locução nem todos os recursos sugeridos pelo estilo. Os próximos passos são revisar o candidato, adicionar fala/transcrição com recursos autorizados, ampliar executores por estilo e preparar a infraestrutura autenticada antes de qualquer integração pública.

O serviço é restrito a `127.0.0.1`, com sessão HttpOnly/SameSite, Host/Origin, token de escrita, limite de 100 MiB/arquivo, 100 ativos e 20 pedidos aguardando. Não é arquitetura multiusuário nem sandbox de codecs para conteúdo hostil. Isolamento em containers, quotas de disco, autenticação por conta, fila durável distribuída e armazenamento externo precedem hospedagem. Nunca publique esse servidor diretamente no domínio.
