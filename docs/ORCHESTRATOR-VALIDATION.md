# Validação do orquestrador

Verificação local em 15/11/2026 (America/Sao_Paulo), base `8b100ff`, branch `feat/disteven-production-orchestrator`. Node 24.22.1, FFmpeg/FFprobe e Chromium locais. Sem chamadas pagas, merge ou publicação no domínio. Os caminhos abaixo são relativos à raiz do repositório; arquivos em `projects/` permanecem fora do Git.

## Engenharia e regressão

| Execução | Resultado observado |
|---|---|
| `npm ci` | 264 pacotes instalados com lockfile; Zod 4.6.7 compatível com o Remotion fixado |
| `npm run check` | TypeScript sem erros |
| `npm test` | 150 testes JavaScript e 9 Python passaram; zero falhas |
| `node --test tests/orchestrator.test.mjs` | 15 testes novos passaram |
| `npm run validate` | Configuração existente válida; não certifica criatividade |
| `git diff --check` | Sem erros de whitespace |
| CLI de engenharia | Novo job e novo render em cada invocação explícita, sem recuperar um MP4 anterior |
| Verificador de revisão final | Rejeita corretamente a ficha com playback, escuta e aceites pendentes |

Os testes novos verificam schemas estritos, comandos/caminhos indevidos, duração e fontes, leitura, legenda, curvas Bézier, morph compatível, hashes da skill, provedor determinístico, OpenAI simulado com reparo limitado, metadados/direitos, ativos imutáveis, duplicação concorrente, cancelamento, timeout, uma recuperação, ownership do worker, interrupção, sessão/Origin/token, byte ranges e edição FFmpeg real. Um teste exige o plano executável aprovado exato e prova que não se chama o planejador depois do aceite.

Stubs de render/validação usados nos testes de estados são explicitamente identificados como bytes de teste, não vídeo. A prova abaixo utiliza o renderer real. Nenhum teste com mock comprova planejamento real por IA ou geração audiovisual externa.

## MP4 produzido pelo pipeline

Job final: `6af58446-1d2b-48f2-92a7-e4e31c365592`.

Pasta: `projects/orchestrator-final-proof/jobs/6af58446-1d2b-48f2-92a7-e4e31c365592/`.

| Propriedade | Medida |
|---|---|
| Arquivo | `candidate.mp4` |
| Tamanho | 2.775.863 bytes |
| Duração | 30,000 segundos |
| Dimensões | 1280 × 720 |
| FPS / frames | 30 / 900 |
| Vídeo | H.264 High, 4:2:0, faixa completa (`yuvj420p`, `color_range=pc`) |
| Áudio | AAC estéreo, 48 kHz |
| Loudness integrado do AAC final | −16,01 LUFS |
| True peak medido | −5,03 dBTP |
| Decodificação integral | Passou com FFmpeg `-xerror` |
| Conformidade com o plano | Duração, frames, resolução, FPS, codecs e áudio passaram |
| SHA256 | `daf7a9fc1f4364aae9a8b564eb83fc03946e6a779557f64a011e6846a6ad5958` |
| Estado | `completed` técnico / `review_pending` criativo |

O segundo render do mesmo conteúdo, executado em um novo job pelo comando de engenharia, gerou o mesmo SHA256. Isso comprova reprodutibilidade desta configuração no ambiente observado, sem prometer igualdade entre diferentes versões de Chromium/FFmpeg ou plataformas.

O pedido usa o estilo existente `campanha-frase-que-reorganiza-o-quadro`, um prompt, uma mídia original de 32 s criada no próprio teste e quatro cenas. Os tempos são 6,0 / 7,8 / 9,0 / 7,2 s, a partir das marcas de texto fornecidas; cortes diretos em 6,0 e 13,8 s, passagem por máscara em 22,8 s. A cena anterior permanece congelada sob a passagem, evitando revelar um fundo vazio.

Há textos sincronizados, entradas por palavra e caractere, máscara de mídia, composição vetorial, traço animado, morph de polígonos compatíveis e paralaxe gráfica. A trilha/SFX são originais a 100 BPM. O pulso gráfico usa o mesmo BPM; os cortes marcados coincidem com múltiplos de 18 frames. Esses vínculos são programados e testáveis, não uma avaliação perceptual de fluidez ou mixagem.

Arquivos de evidência: `edit-plan.json`, `media-analysis.json`, `skill-snapshot.json`, `score-provenance.json`, `technical-report.json`, `captions.srt`, `review.json` e 13 JPEGs com início/meio/fim, cortes e fim da transição. Os temporários de edição, bundle e render intermediário foram removidos após a execução. Fontes originais e candidato são preservados.

## Inspeção e interface

Foram extraídos e inspecionados quadros. A primeira inspeção encontrou quebra de palavra na animação por caracteres; o componente passou a manter cada palavra como unidade de layout e o vídeo foi renderizado novamente. A abertura teve tamanho tipográfico ajustado. Os quadros corrigidos mostram títulos e legendas dentro da composição.

`production-format-stills.mjs` renderizou abertura e conclusão nos quatro formatos: 1280×720, 720×1280, 1080×1080 e 864×1080. Os oito arquivos e `format-results.json` ficam em `projects/orchestrator-final-proof/format-qa/`. Esse teste não equivale a quatro vídeos inteiros aprovados.

`tests/browser-production.py` passou sobre o serviço local, com Chromium/Playwright:

- Upload real pelo formulário, análise e preparação de plano determinístico; pedido sem aceites corretamente bloqueado; download do plano preparado.
- Retomada do job concluído após reload, carregamento da duração real de 30 s no player e download com o tamanho exato do MP4.
- Interface sem overflow horizontal em 375, 768 e 1440 px.
- Player avança através da transição em teste automatizado. Não foi uma revisão criativa contínua nem escuta.

Resultados e screenshots em `projects/orchestrator-final-proof/browser-qa/`. O navegador integrado da ferramenta de UI não abriu por limitação de sandbox; o QA foi executado pelo Playwright já disponível no ambiente, sem instalar serviços ou publicar conteúdo.

## Avaliação estética separada

| Critério | Evidência / estado |
|---|---|
| Timing e spacing | Frames e curvas definidos/testados; julgamento perceptual pendente |
| Easing | Bézier `.22,.75,.2,1`, endpoints/monotonicidade testados |
| Legibilidade e composição | Quadros inspecionados; quebra de palavra corrigida; avaliação contínua/mobile pendente |
| Tipografia e hierarquia | Texto editável e fontes locais OFL; sem textos rasterizados pelo gerador |
| Sincronização | Texto/cortes/score ligados ao plano; escuta perceptual pendente |
| Fluidez, continuidade e ritmo | Quadros e player automatizado são insuficientes; revisão integral pendente |
| Câmera/profundidade | Paralaxe gráfica limitada; sem câmera 3D, tracking ou ângulos inventados da mídia |
| Fidelidade | Fixture óptica original, sem pessoas/produtos reais; não comprova preservação de identidade em filmagens reais |
| Voz | Não utilizada; a locução prevista no registro do estilo não foi validada |
| Música e acabamento sonoro | Métricas medidas; escuta integral não realizada |
| Consistência estética / qualidade profissional | Sem aprovação concedida; candidato para revisão |

A ficha `review.json` registra apenas o que foi realizado. Playback, listening, finishing e aprovações continuam pendentes. Nenhum registro do teste concede aprovação em nome do usuário. O comando de revisão rejeita essa ficha, como deve acontecer antes de chamar a peça final/aprovada.

## Reprodução e limites

```sh
npm ci
npm run check
npm test
npm run validate
CHROME_PATH=/usr/bin/chromium npm run production:poc
# Ou escolha outra pasta para uma prova isolada:
CHROME_PATH=/usr/bin/chromium node scripts/production.mjs --engineering-poc --root projects/minha-prova
```

Não execute o worker CLI na mesma raiz que um servidor ativo: o lock protege a produção duplicada. O modo de engenharia aceita somente sua fixture original e pedido fechado; o modo normal exige as aprovações existentes e o plano exato aprovado.

Limites materiais: um estilo com executor, sem ASR, voz sintética, tracking, estabilização, rotoscopia, câmera 3D, speed ramp ou serviços externos. Não há backend multiusuário hospedado. Planejamento por modelo real e qualidade audiovisual profissional não foram demonstrados. Consulte `ORCHESTRATOR.md` para configuração, arquitetura e continuação.
