# Cobertura de tratamento · 2.12.0

Auditoria iniciada em 17/11/2026 sobre o código da PR #20, quando o site ainda estava na 2.11.0. A PR foi integrada e a versão 2.12.0 está publicada; consulte [estado da entrega](https://github.com/andrezucatti82-rgb/studio-kit-pro/blob/main/docs/RELEASE-2.12.md). Esta matriz descreve implementação do repositório; não atribui ao produto todos os filtros que um FFmpeg instalado possa oferecer.

**Integrado**: operador existente, com limites indicados. **Fixo**: valor usado pelo runtime, sem seletor. **Parcial**: apenas parte do pedido. **Não integrado**: exige desenvolvimento ou ferramenta externa verificada. A skill orienta e diagnostica; não implementa os processadores ausentes.

O acabamento SocialFinish é opcional e específico da rota do grafo. A rota standalone `npm run render` tem composição 1080×1920 e não aplica esse acabamento nem o loudnorm do servidor. A medição técnica não certifica qualidade perceptual, HDR, broadcast ou DCP.

## Especificações técnicas e arquivo

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| SD, HD, Full HD, 2K, 4K, 8K | Parcial | Grafo: 1280×720, 720×1280, 1080×1080, 864×1080. Standalone: 1080×1920. Sem seletor livre 2K/4K/8K; fonte até 3840 por dimensão, 100 MiB, 3600 s. |
| 16:9, 9:16, 4:5, 1:1, 2.39:1 | Parcial | Quatro primeiros integrados ao grafo; 2.39:1 não integrado. Não confundir proporção com resolução. |
| Pixel aspect ratio / SAR | Parcial | Inspeção reporta SAR/DAR. Preprocessamento setsar=1; não há normalização anamórfica gerenciada que garanta preservar DAR. |
| Frame rate / FPS | Parcial | Grafo 24/30 FPS; standalone aceita 24–60. Conversão fps não equivale a optical flow nem preservação automática de VFR. |
| Progressivo e entrelaçado | Parcial | Inspeção field_order; sem caminho configurado de desentrelaçamento e conferência de campos. |
| CBR, VBR, 1-pass e 2-pass | Fixo no runtime | CRF 18 no grafo e 20 standalone. Não há controles CBR/VBR, alvo de bitrate, VBV ou 2-pass na interface/contrato. |
| MP4, MOV, MKV, AVI, MXF, WebM | Parcial | Entrega final MP4. WebM alpha é intermediário. Importador aceita famílias MOV/MP4, MKV/WebM e AVI, sujeito ao decoder; MXF não faz parte do fluxo. |
| H.264, HEVC, ProRes, DNxHR, AV1, RAW | Parcial | Entrega H.264. Decodificar uma fonte compatível não cria exportação HEVC/AV1/RAW ou master ProRes/DNxHR. |
| Exportação de masters ProRes / DNxHR / RAW | Não integrado | Sem perfis de master ou cadeia RAW/debayer. Encoders instalados no FFmpeg não são integração do kit. |
| 4:2:0, 4:2:2, 4:4:4 | Fixo no runtime | Final yuv420p (4:2:0). Sem seleção 4:2:2/4:4:4. Intermediário alpha VP9 usa yuva420p. |
| 8, 10, 12 e 16 bits | Fixo no runtime | Final H.264 yuv420p 8-bit. Inspeção preserva bits reportados; sem pipeline 10/12/16-bit gerenciado. |
| Keyframe interval / GOP | Não integrado | Sem configuração pública de GOP/keyint ou verificação de requisito de plataforma. |

Fontes: `server/schema.mjs`, `server/graph-editor.mjs`, `server/assets.mjs`, `scripts/render.mjs`, `src/index.tsx`.

## Cor e iluminação

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| Rec.709, Rec.2020, sRGB, DCI-P3 e Log | Parcial | Inspeção das tags. Composição CSS/SVG em sRGB não é gerenciamento de cor; sem CST/OCIO/ACES ou conversão confiável Log/HDR→SDR. Log é codificação/curva, não um espaço único. |
| SDR, HDR10, HLG e Dolby Vision | Não integrado | Sem tonemapping gerenciado, validação HDR ou preservação/autoria de metadados Dolby Vision. Não basta alterar tags ou escolher um codec 10-bit. |
| Exposição e ganho | Parcial | Somente brightness global limitado no finishing; não há exposição em stops scene-linear ou ganho calibrado. |
| Contraste e pivô | Parcial | Contraste global 0,9–1,1. Pivô não exposto. |
| Altas luzes e brancos | Parcial | Compressão limitada de realces 0–0,05; não recupera detalhe clipado nem expõe controle de whites. |
| Sombras e pretos | Parcial | Elevação limitada de sombras 0–0,04; sem controles independentes profissionais de blacks. |
| Tons médios / gamma | Não integrado | Sem controle independente de gamma/midtones. |
| Kelvin e tint | Não integrado | Sem balanço de branco calibrado; direção de luz em prompt não aplica correção à filmagem. |
| Saturação e vibratilidade | Parcial | Saturação global 0,85–1,15; vibrance seletiva não integrada. |
| Curvas RGB e Hue vs Hue/Sat/Lum | Não integrado | Curva interna fixa do acabamento não é editor de curvas RGB/HSL. |
| Lift, gamma, gain e offset | Não integrado | Sem rodas de cor ou controles equivalentes independentes. |
| LUTs técnicas e criativas | Não integrado | Sem ingestão/validação de LUT, domínio de entrada/saída ou interpolação configurável. |
| Qualifiers HSL e máscaras de cor | Não integrado | Máscara externa de composição não equivale a qualificação seletiva de cor/pele. |
| Vinheta | Não integrado | Pode ser desenhada como overlay pelo editor; não há processador nativo de vinheta fotométrica. |

Fontes: `src/production/SocialFinish.tsx`, `server/scene-graph.mjs`, `server/graph-editor.mjs`.

## Imagem, óptica e restauração

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| Nitidez e detalhe de médio contraste | Não integrado | Sem sharpening ou controle de microcontraste de imagem. |
| Redução de ruído espacial e temporal | Não integrado | Sem denoise configurado. Granulação não remove ruído. |
| Granulação | Integrado | Grão monocromático opcional no grafo, amount 0–0,045 e seed. É textura sintética, não simulação física de filme; standalone não aplica SocialFinish. |
| Halation e bloom | Parcial | soft-light e glow de formas gráficas são integrados. Não há halation/bloom óptico derivado dos realces da filmagem. |
| Estabilização de imagem | Não integrado | Sem análise de câmera/warp stabilizer/estabilização óptica. |
| Correção de distorção de lente | Não integrado | Sem perfil de lente ou calibração. |
| Remoção de aberração cromática | Não integrado | Sem correção de canais/lente. |
| Correção de rolling shutter | Não integrado | Sem modelo de leitura do sensor ou correção geométrica temporal. |
| De-flicker | Não integrado | Sem medição/correção temporal da cintilação. |
| Upscaling e downscaling | Parcial | Redimensionamento convencional no preprocessamento/composição. Sem restauração de detalhe por IA nem seletor/avaliação de algoritmos. |
| Frame blending e optical flow | Não integrado | Conversão FPS convencional não é interpolação óptica. Nenhum retime inteligente validado. |
| Motion blur | Não integrado | Sem desfoque temporal de movimento integrado para a filmagem. |

Fontes: `src/production/SocialFinish.tsx`, `src/production/GraphFilm.tsx`, `server/graph-editor.mjs`.

## Composição e VFX

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| Canais alpha e transparência | Integrado | Alpha preservado em entrada compatível ou máscaras fornecidas/validadas; intermediário VP9 WebM. Final MP4 H.264 não exporta alpha. |
| Modos de mesclagem | Parcial | soft-light/efeitos gráficos específicos. Sem suíte completa de modos de composição configuráveis. |
| Rotoscopia, masking e feathering | Parcial | Retângulos/mattes e máscaras grayscale fornecidas. Não há extração automática, editor de roto ou feathering universal. |
| Chroma key e spill suppression | Não integrado | Sem keyer/despill integrado. Alpha fornecido não prova remoção automática de fundo. |
| Motion tracking 2D | Parcial | Tracks medidos/externos ligados ao hash da fonte e âncoras. Sem detector/analisador automático de movimento ou mãos. |
| Tracking 3D e câmera | Não integrado | Sem solve de câmera, reconstrução ou matchmove. |
| Planar tracking | Não integrado | Sem análise planar/transformação estimada. |
| Clean plate e inpainting | Não integrado | Sem remoção/reconstrução automática de objetos. |
| Speed ramping / remapeamento de tempo | Não integrado | Trim a 1×. Fala original preservada; sem curvas de retime nativas. |

Fontes: `server/graph-editor.mjs`, `server/scene-graph.mjs`, `src/production/GraphFilm.tsx`.

## Áudio e mixagem

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| AAC, PCM, MP3, FLAC e AC3 | Parcial | Final AAC. Entradas compatíveis podem ser decodificadas; intermediário WAV estéreo. Sem perfis de exportação PCM/MP3/FLAC/AC3. |
| 44,1 / 48 / 96 kHz | Fixo no runtime | Grafo normaliza a 48 kHz. Não há seletor 44,1/96 kHz de entrega. |
| 16 / 24-bit / 32-bit float | Parcial | Inspeção de bits/sample_fmt. Final AAC não corresponde a um master PCM selecionável; sem entrega configurável 24-bit/float. |
| Bitrate de áudio | Fixo no runtime | AAC final 192 kbps; sem controle de usuário. |
| Mono, estéreo, 5.1 e 7.1 | Parcial | Grafo converte para 2 canais. Sem mix multicanal ou preservação de layout garantida. |
| Dolby Atmos | Não integrado | Sem objetos, beds, ADM/BWF, renderer ou master Atmos. |
| dBFS e loudness LUFS/LKFS | Parcial | Grafo loudnorm uma passagem I=−16 LUFS, TP=−1,5, LRA=7. Inspetor mede opcionalmente; validador atual não reprova por desvio. Standalone sem loudnorm. |
| True peak | Parcial | Alvo no loudnorm/medição. Não é limite certificado nem verificação normativa de saída. |
| Faixa dinâmica | Parcial | LRA alvo/medida do loudnorm; não equivale a controles de masterização nem DR universal. |
| Equalização | Não integrado | Sem EQ integrado configurável. |
| Compressão e limiter | Parcial | Comportamento interno do loudnorm não é compressor/limiter criativo independente ou cadeia de mix completa. |
| Noise gate e de-esser | Não integrado | Sem processadores integrados. |
| Redução de ruído e de-reverb | Não integrado | Sem limpeza/restauração de voz integrada. |
| Timecode e lip-sync | Parcial | Tempos fornecidos/verificados, trim e alinhamento de faixas. Sem alinhamento automático universal, correção de lábios ou sincronismo SMPTE/LTC. |
| Panning e espacialização | Não integrado | Sem automação de pan/spatial nem mix de objetos. |
| Ducking de trilha | Integrado | Grafo reduz trilha nos intervalos de narração com níveis/fades. Conferir bombeamento e inteligibilidade na escuta. |

Fontes: `server/graph-editor.mjs`, `server/validator.mjs`, `scripts/render.mjs`.

## Fluxo de trabalho e entrega

| Recurso | Situação | Alcance real / lacuna |
|---|---|---|
| Resolução de playback e proxies | Não integrado | Sem gestor de proxy/relink ou seletor de reprodução. |
| Render cache e GPU CUDA/Metal/OpenCL | Parcial | Remotion usa bundling/cache e Chromium. Sem workflow de cache de mídia nem aceleração GPU certificada; filtro/encoder compilado não comprova dispositivo funcional. |
| Safe margins de título e ação | Parcial | Orientações/composição de texto; sem perfis normativos ou máscaras de interface de cada plataforma automaticamente validados. |
| SRT/VTT, closed captions e burn-in | Parcial | Legendas visuais e SRT no pipeline. Sem entrega VTT configurada, mux de closed captions ou padrão broadcast. |
| Metadados e timecode | Parcial | Inspetor reporta tags técnicas/timecode disponível. Sem preservação universal, conform por timecode ou autoria de metadados de master. |
| Perfis YouTube, Instagram e TikTok | Parcial | Quatro formatos sociais do grafo; sem conjunto completo atualizado de bitrate/FPS/limites por plataforma. |
| Broadcast TV e DCP cinema | Não integrado | Sem master normativo de TV, legalização, interlace/áudio conforme emissora, XYZ/JPEG2000 ou pacote DCP testado. |

Fontes: `server/graph-editor.mjs`, `server/validator.mjs`, `scripts/inspect-media.mjs`.

## Diagnóstico e próximos incrementos

`npm run video:inspect -- --file arquivo.mp4 --measure-audio --out projects/NOME/inspection.json` gera hash SHA-256, dimensões, codecs, SAR/DAR, cadência, varredura, tags de cor, streams/layout de áudio e medição opcional do primeiro stream. O relatório preserva campos desconhecidos, sinaliza conversões pendentes e mantém playback/escuta como não executados. O arquivo de saída deve ser novo; o comando não transforma a mídia. Não inclui tags privadas arbitrárias.

1. Prioridade redes sociais: gerenciamento explícito de cor SDR/Log/HDR→SDR, correção de branco/exposição, denoise e EQ/de-esser/limiter com parâmetros validados, medição pós-exportação com tolerâncias, Full HD e perfis de destino configuráveis.
2. Depois: estabilização, correção de lente, de-flicker e proxies/relink, com comparação antes/depois e prevenção de perda de detalhe.
3. Trilhas especializadas: 10-bit/4:2:2 e masters, tracking/roto avançados, HDR, broadcast, DCP e áudio imersivo, cada uma com engine adequada e testes próprios. Não prometer todos como efeito de instalar uma skill.

Nenhuma API paga, geração de avatar, publicação ou merge faz parte desta auditoria.
