# Apresentador e explicação: análise, implementação e limites

## Resposta à pergunta

O studio-kit-pro 2.11.0 já tem boa parte da infraestrutura necessária para esses vídeos, mas não tinha uma cadeia pronta e validada de edição de apresentador com recorte, gesto e informação interagindo. A quantidade de estilos da galeria não é uma medida de operadores executáveis.

O caminho adequado é compor em torno de um vídeo preservado, com tempo da fala, camadas gráficas, recorte e trajetórias. O mesmo processo pode usar um MP4 de avatar autorizado. Gerar o vídeo inteiro novamente para colocar uma palavra atrás da cabeça aumenta o risco de mudar rosto, roupa, gesto e voz sem necessidade.

Esta branch 2.12.0 acrescenta operadores verificáveis. A proposta inicial de 20 receitas foi ampliada para 60 em 17 segmentos; veja [a revisão social atual](PRESENTER-SOCIAL-60.md). As vinte interações abaixo registram a pesquisa inicial, não a lista final de nomes do catálogo. Não afirma ter instalado uma solução automática de transcrição, segmentação, tracking ou modelagem 3D. A versão publicada anteriormente é 2.11.0; código preparado e pacotes não constituem publicação do domínio nem instalação no computador de outra pessoa.

## O que foi pesquisado

Consulta realizada nesta sessão. Foram lidas a página pública, suas explicações dos efeitos e as legendas dos três Reels. Os três vídeos carregaram em Chromium sem conta; foram inspecionados nove momentos de cada um, com durações de 84,2 s, 42,9 s e aproximadamente 124,57 s. Isso permite uma análise visual por amostragem, não equivale a playback/escuta integral ou acesso às aulas privadas. Materiais de referência ficaram em pasta ignorada; nenhum frame do autor foi incorporado aos novos estilos.

| Fonte | O que aparece ou é descrito | Consequência técnica |
|---|---|---|
| [Reel DfHzQPOmsH2](https://www.instagram.com/reel/DfHzQPOmsH2/) | Apresentador, demonstração de sola de tênis, colher de azeite e gráfico de juros; alternância entre pessoa grande e pessoa em janela | Boa parte do efeito de explicação vem de hierarquia, mudança de layout e conteúdo sincronizado. Não exige tracking da mão em todos os planos |
| [Reel DfUrRSiCSOG](https://www.instagram.com/reel/DfUrRSiCSOG/) | Em cerca de 1,3 s, pasta sobre a palma e título em profundidade; em 16,3 s, waveform; em 38,6 s, composição de editor | Texto atrás do corpo e objeto na mão exigem máscara/ordem de camadas e posição temporal conferida. Aparência volumétrica não prova geometria 3D editável |
| [Reel DfhwT3tCHQg](https://www.instagram.com/reel/DfhwT3tCHQg/) | Pessoa diante de cenário contextual, depois em janela sobre ponte, financiamento, camiseta, corrida e documento | Existem dois layouts: recorte sobre cenário e janela sobre a explicação. É preciso preservar a pessoa, conferir dados e planejar transições e enquadramento |
| [SuperEditor IA](https://supereditoria.anovainteligencia.ia.br/) | Página anuncia edição por Claude Code/Codex, preservação do original, plano antes de aplicar, 104 efeitos e exemplos de camadas, mão, cenário, clones e texto | É um pacote de fluxo, receitas e implementação local. A página pública não permite auditar o conteúdo do ZIP, a robustez em diferentes brutos ou a execução dos 104 efeitos |

As afirmações econômicas, médicas e jurídicas dos vídeos não foram adotadas como fatos para os novos estilos. Diagramas novos são identificados como demonstrativos. Recriar a técnica não autoriza copiar a pessoa, a voz, os materiais do curso ou suas receitas privadas.

## Comparação com o código 2.11.0

| Recurso | Estado anterior | Estado preparado nesta branch |
|---|---|---|
| Vídeo gravado em tela cheia ou janela | Camadas de vídeo já disponíveis | Preservado |
| Texto, SVG, formas, keyframes e transições | Disponíveis no grafo Remotion | Preservados |
| Voz, música, SFX, ducking e legendas por trecho | Disponíveis com mídia/tempos fornecidos | Preservados |
| Cortes do bruto | Trim explícito por cena | Continua explícito; não existe corte semântico automático |
| Palavra exatamente no tempo da fala | Entrada cinética por atraso fixo; não por palavra medida | `speechWords` com tempos fornecidos e validação do texto completo |
| Elemento que aparece apenas num beat | Exigia organizar cenas/animações | Janela `active` por camada |
| Objeto ligado à mão | Somente keyframes genéricos | `anchorTrack` vinculado ao original; dados manuais ou medidos externamente |
| Pessoa recortada, texto atrás, novo cenário | Sem rota própria de máscara; preprocessamento opaco em MP4 | Máscara registrada, composição alpha e preservação de transparência VP9/Remotion |
| Transcrição e alinhamento automáticos | Ausentes | Ainda exigem integração/modelo local e teste |
| Segmentação automática de cabelo e mãos | Ausente | Ainda exige método de extração e revisão temporal |
| Detector automático de mão/gesto | Ausente | Ainda exige integração; o render consome trajetória já medida |
| Explosão de produto e câmera 3D real | Dependiam de mídia/implementação específica | Continuam exigindo geometria, texturas e uma rota 3D compatível |
| Avatar | Depende de material/conexão e seleção explícita | Mesmas regras; o editor não gera identidade ou voz por conta própria |

Arquivos relevantes: `server/scene-graph.mjs`, `server/graph-editor.mjs`, `server/assets.mjs`, `src/production/GraphFilm.tsx` e `src/production/presenter.mjs`. O contrato detalhado dos novos campos fica na referência canônica `presenter-interaction.md` da skill.

## O que falta para uma experiência automática confiável

1. **Ingestão do bruto:** verificar áudio, orientação, FPS variável, qualidade, identidade e direitos; preservar original e hash. A quota atual por arquivo do AssetStore é 100 MiB; vídeos longos precisam de uma política explícita de importação/armazenamento, sem reduzir qualidade silenciosamente.
2. **Fala e cortes:** transcrição local com tempos por palavra, revisão de alinhamento e proposta de EDL. Pausa não é necessariamente erro. Cortar palavras ou mudar velocidade invalida o relógio de gestos, máscaras e legendas; todos precisam ser remapeados.
3. **Percepção temporal:** landmarks de mãos/corpo, trajetórias e confiança; segmentação/matting consistente em cabelo, dedos, óculos, movimento e cruzamento de braços. O sistema deve pedir correção quando perder o contato, em vez de deixar o objeto flutuar no lugar errado.
4. **Direção semântica:** para cada frase, escolher a melhor demonstração. Gráfico para quantidade; corte de produto para estrutura; linha do tempo para sequência; gesto quando houver gesto real. Não empilhar os 20 efeitos numa fala curta.
5. **Composição e 3D:** resolver ordem frente/atrás, sombra, escala, contato e perspectiva. Um ícone com sombra é diferente de um objeto com geometria. Câmera virtual ou novas vistas exigem assets/modelos compatíveis.
6. **Qualidade e revisão:** testar oclusão, bordas, deriva do tracking, legibilidade, sincronismo, continuidade, mixagem e formato. A amostra deve incluir a interação mais difícil. Um teste técnico ou quadro bonito não aprova movimento e áudio.

Fontes primárias consultadas: [faster-whisper](https://github.com/SYSTRAN/faster-whisper) oferece tempos por palavra; [MediaPipe Pose](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) documenta pontos do corpo; [Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) documenta pontos das mãos; [MediaPipe Image Segmenter](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter) documenta segmentação; [SAM 2](https://github.com/facebookresearch/sam2) documenta máscaras rastreadas em vídeo; [Remotion OffthreadVideo](https://www.remotion.dev/docs/offthreadvideo) documenta vídeo e transparência. São alternativas a avaliar e testar, não módulos já instalados nesta branch. Modelos locais não exigem API paga, mas têm requisitos de licença, armazenamento, processamento e, em alguns casos, GPU. Bibliotecas e modelos não acompanham o plugin automaticamente.

## Como se distribui entre as superfícies

- **Skill canônica:** referência de apresentador, inspeção do bruto, planejamento por fala, limites de máscara/gesto, consentimento e revisão. Codex e Claude compartilham a mesma regra.
- **Runtime:** schema, validação, composição e arquivos reais. Receitas não executam operações que o motor não implementa. Arquivos desconhecidos, máscaras incompatíveis e trajetórias insuficientes são rejeitados.
- **Site:** categoria “Motion e apresentações” → “Apresentador + explicação”; 60 fichas setoriais com quatro estados originais, recursos e limitações. O total passa a 1.220 estilos e 30 subcategorias. O site prepara o pedido; continua sem receber o vídeo ou executar um backend remoto de edição.
- **Plugins:** Codex, Claude, skill ZIP e runtime gerados da fonte canônica, com versão e hashes no manifesto. Preparar o pacote não atualiza uma instalação externa.
- **GitHub e publicação:** branch/PR, regressão preservada, evidências técnicas e revisão antes do merge/publicação. A autorização anterior foi específica para 2.11.0; o estado de 2.12.0 deve ser declarado separadamente.

## Vinte direções originais

| Estilo | Interação principal | Dependência além das camadas básicas |
|---|---|---|
| Diagrama que acompanha a fala | A informação se constrói na ordem do raciocínio | Tempos da fala |
| Palavra atrás do apresentador | Palavra entre fundo e silhueta | Máscara temporal |
| Objeto apoiado na mão | Objeto segue a palma | Trajetória conferida |
| Toque que aciona a informação | O contato dispara uma resposta | Ponto e tempo medidos |
| Órbita com frente e trás | Elemento alterna oclusão | Máscara e profundidade explícita |
| Produto explicado por camadas | Partes se separam durante a fala | Modelo ou vistas oficiais |
| Corte técnico com apresentador | Estrutura aparece com anotações | Esquema revisado |
| Lousa que nasce do gesto | Linhas sustentam o raciocínio | Traços e tempos; tracking se ligado à mão |
| Fluxograma explicado por etapas | Nó citado ativa a próxima etapa | Ordem e relações corretas |
| Dados que respondem ao gesto | Valor e barra acompanham a indicação | Dados e gesto conferidos |
| Antes e depois pela mão | Gesto desloca o divisor | Duas versões comparáveis e trajetória |
| Mitos e fatos em diálogo | Pessoa contrasta duas explicações | Afirmações verificadas |
| Cenário que contextualiza a fala | Ambiente muda com a pessoa preservada | Máscara e fundo compatível |
| Apresentador e demonstração ampliada | Pessoa dá espaço ao conteúdo | Filmagem ou avatar autorizado |
| Da fala à interface real | Atenção migra para uma ação na tela | Captura real ou demo identificada |
| Linha do tempo conduzida pela fala | Marcos acompanham os eventos | Datas e sequência |
| Dois papéis em uma explicação | Takes distintos dialogam | Takes, máscaras e falas reais |
| Apresentador conduz a rota | Rota se revela com a explicação | Mapa/geodados para trajeto real |
| Metáfora que vira explicação | Objeto demonstra relação abstrata | Correspondência conceitual correta |
| Três passos com resumo visual | Etapas se conectam e permanecem no resumo | Mensagem e tempos revisados |

São receitas de composição com requisitos e estudos esquemáticos, não 20 vídeos produzidos, efeitos certificados ou garantia de rastreamento automático.

## Storyboards propostos

Os painéis visuais foram criados para demonstrar entendimento do pedido, conforme solicitado. Não são aprovações nem referência de identidade real. Textos do painel são ilustrativos; no filme são recompostos de forma editável.

**A — Pessoa gravada, faturamento e sobra (30 s):** 0–3 s palavra atrás da cabeça; 3–8 s loja sobre a palma; 8–14 s R$ 1.000 separados em R$ 600 e R$ 250; 14–20 s gesto desloca uma saída; 20–26 s objeto parcialmente atrás da pessoa e sobra de R$ 150; 26–30 s conclusão. Valores fictícios, sem alegação financeira. A amostra representativa é a passagem da palma para a oclusão, não apenas o título.

**B — Avatar e jornada de compra (30 s):** 0–4 s visita; 4–9 s toque numa interface demonstrativa; 9–14 s produto vai ao carrinho sobre a palma; 14–20 s produto, entrega e pagamento aparecem separados; 20–26 s fluxo carrinho → pedido; 26–30 s resumo legível. O avatar é fictício; gerar sua atuação e sincronismo depende de ferramenta, seleção e aceites próprios. Um avatar existente pode ser editado como mídia.

**C — Pessoa gravada e cenários (proposta textual complementar):** mesma identidade e roupa; começa no ambiente original; contexto muda por máscara e fundo autorizado; pessoa passa a janela enquanto o diagrama ocupa a tela; retorna ao plano original para concluir. Não movimentar câmera por locais que não tenham cobertura real ou geometria suficiente. O storyboard visual exato deve usar o bruto escolhido.

## Prompt de uso

O arquivo público `style-atlas/dist/presenter-prompt.txt` contém o pedido completo. O botão de copiar da galeria inclui as escolhas reais e é preferível a um prompt genérico sem ficha. Anexar `projeto-video.json`, o bruto e os materiais reais; arquivos declarados no site não foram transferidos ao chat.

Começo sugerido: “Quero editar este vídeo para que a explicação se construa junto da pessoa. Preserve meu original, rosto, roupa e voz. Analise a fala e os gestos, proponha os cortes e mostre por trecho o elemento, o ponto de contato, a ordem frente/atrás e os recursos necessários. Não aplique geração antes dos aceites exigidos.”

## Critério de conclusão

Separar: recurso documentado; operador implementado; teste sintético; teste com bruto autorizado; revisão audiovisual; aprovação criativa; pacote; instalação; publicação. Nenhum desses estados pode ser inferido do anterior. Para homologar qualidade no seu caso, o próximo insumo é um bruto seu, idealmente com fundo estável, rosto/mãos visíveis e gestos naturais; um teste curto deve representar as dificuldades reais.
