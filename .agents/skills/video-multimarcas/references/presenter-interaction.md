# Apresentador e explicação — 2.12.0

Use para edição de pessoa gravada ou avatar explicitamente solicitado. As 20 receitas do catálogo 4.5 são direções originais; seus estudos não comprovam animação, tracking ou recorte automático.

## Primeiro, descobrir o que existe

1. Inspecione o vídeo original e a fala. Preserve arquivo, SHA256, rosto, corpo, roupa e voz. Registre direitos. Não regenere a pessoa para resolver composição.
2. Confirme vídeo gravado ou avatar. O padrão continua sem geração de avatar. Um avatar novo exige seleção explícita compatível, autorização de identidade/voz e os gates visuais; pode combinar a receita com um estilo de Avatares e apresentadores. Um MP4 autorizado é mídia, não prova de consentimento para clonar a pessoa.
3. Distinga três níveis: composição ao lado/na janela; composição com máscara e ancoragem; geometria 3D real. Não chamar sprite ou escala 2D de objeto com novas vistas físicas.
4. Use `presenterEditing` do estilo e as contribuições efetivamente selecionadas. Se o pedido usa somente a tipografia, não exigir todos os recursos da receita completa.

## Dados reais antes dos efeitos

O runtime aceita tempos por palavra, máscaras e trajetórias fornecidas e verificadas. Ele **não inclui** transcrição automática, segmentação automática, detector de mãos ou geração 3D universal.

Uma rota local pode usar faster-whisper para transcrição; alinhamento deve ser conferido contra o áudio. MediaPipe Hand Landmarker pode fornecer pontos da mão; Pose Landmarker fornece pontos do corpo; segmentação por pessoa precisa de método compatível com vídeo, consistência temporal e revisão de cabelo, dedos e motion blur. SAM 2 é uma opção de rastreamento de máscaras, não garantia de matting fino. Descubra instalação, modelo, licença, memória e GPU antes de prometer. Não baixar modelos nem contratar APIs como diagnóstico implícito.

Crie uma EDL de cortes no relógio do original. Não tratar silêncio como erro: conservar respirações, intenção e palavras inteiras. Ao mudar cortes ou velocidade, remapear legenda, gestos, máscaras e áudio; reavaliar aprovações afetadas. O grafo usa `sourceStartSeconds` e duração explícita de cada cena; não gera cortes semânticos por conta própria.

## Operadores implementados

- **Visibilidade:** `active:{fromFrame,durationFrames}` usa o relógio local da cena. Oculta/revela a camada; não muda seu relógio de mídia. Para uma nova origem temporal, criar outra camada/cena com trim explícito.
- **Palavras:** texto `kinetic:"speech"`, `speechWords:[{text,fromFrame,toFrame}]` e `highlightColor` opcional. As palavras devem recompor exatamente `text`, sem omissões, sobreposição ou extrapolação. Não estimar tempos para fingir alinhamento real.
- **Ancoragem:** `anchorTrack:{sourceAssetId,sourceStartSeconds,origin:"manual"|"externally_measured",space:"output-normalized",offsetX,offsetY,points:[{frame,x,y,confidence}]}`. Pontos na composição de saída, relativos à cena, após trim/crop e enquadramento. Devem cobrir toda a janela visível, ser ordenados, permanecer dentro do quadro e ter confiança mínima de 0,7. A origem deve ser o mesmo vídeo original presente na cena. Não pode coexistir com animação de x/y. Conferir o contato no vídeo; trajetórias não fazem detecção automática.
- **Máscara:** camada de vídeo pode declarar `maskAssetId` e `maskStartSeconds` (padrão: mesmo trim do vídeo; máscara estática começa em zero). A máscara registrada precisa das mesmas dimensões do original, sem áudio, e duração suficiente. Branco mantém; preto remove; cinzas preservam transparência parcial. FFmpeg compõe alpha e o mantém em WebM VP9; Remotion recebe vídeo transparente. Alpha existente também é preservado. Uma máscara estática não acompanha uma pessoa que se move.
- **Profundidade:** a ordem de `layers` é a ordem de composição. Fundo → elemento atrás → pessoa recortada → elemento da frente. Órbitas e trocas de ordem usam camadas com intervalos explícitos. Isso não estima profundidade física nem colisão 3D.

## Plano que a pessoa aprova

Para cada beat, mostrar trecho da fala, tempo no bruto e no editado, gesto observável, elemento, âncora, oclusão, entrada/saída, dado/fonte, áudio e risco. O objeto deve ensinar algo; evitar decoração constante. Preservar rosto, mãos, área de legendas e margens da plataforma. Cenário novo precisa de perspectiva, escala e luz coerentes.

Entregue roteiro/EDL, moodboard e storyboard visuais nas etapas aplicáveis. A amostra precisa provar a interação mais difícil e a transição, não somente a abertura. Não gerar vídeo IA antes dos aceites existentes. Quadros, typecheck, testes e leitura de metadados não substituem playback, escuta e aprovação criativa. Sem revisão integral, `review_pending`.

Fontes técnicas: https://github.com/SYSTRAN/faster-whisper ; https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker ; https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker ; https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter ; https://github.com/facebookresearch/sam2 ; https://www.remotion.dev/docs/offthreadvideo .
