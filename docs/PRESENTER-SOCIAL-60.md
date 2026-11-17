# Apresentador + explicação para redes sociais — 2.12.0

A proposta combina pessoa preservada, demonstração sincronizada e acabamento natural. Não depende de transformar a pessoa inteira em uma geração IA. O 2.11.0 já compõe vídeo, texto, gráficos, áudio e cortes explícitos. A versão 2.12.0 acrescenta os operadores descritos abaixo e 60 direções em 17 segmentos, levando o catálogo 4.7 a 1.220 estilos/30 subcategorias. As 60 direções são conceitos de edição, não 60 vídeos prontos.

## Pesquisa e o que aproveitar

A [análise inicial](INTERACTIVE-PRESENTER-2.12.md) registra o SuperEditor IA e três Reels, observados por amostragem. Foi ampliada com a página pública [EDIT.IA PRO](https://editiapro.com/) e seis demonstrações MP4 públicas: painel (7,7 s), motion-3d (5 s), tela-verde (5,166 s), legenda (4,2 s), checklist (9 s), finalizado (11,666 s). Inspeção em três momentos por arquivo, sem acesso ao pacote privado. Os seis arquivos consultados não possuem stream de áudio: não houve escuta deles nem comprovação da mixagem anunciada.

A página anuncia cortes de pausas/erros, seleção de take, palavras temporizadas, gancho, texto atrás da pessoa, recorte, checklist e evolução de edição simples a motion. Nos trechos observados: painéis com informação atrás da cabeça; camadas visuais inclinadas de vídeo, máscara, legenda e ícones; apresentador em janela e lista; palavras e marcadores de tempo. Painéis roxos/neon do exemplo de segmentação são referência funcional, não linguagem visual adotada. Aparência 3D no vídeo não comprova modelo 3D editável.

Podemos acrescentar à experiência: revisão explícita da EDL antes de cortar, checklist de mensagem/legibilidade/som, gradação de complexidade pela necessidade e reaproveitamento em versões curtas com revisão de contexto. A seleção semântica de melhor take, ASR e extração automática de máscaras/gestos ainda precisam ser integradas e testadas. Não tratamos as promessas comerciais do curso como benchmark verificado ou copiamos seus materiais.

## Direção visual atual

- Base cotidiana e plausível: clínica, escritório, loja, cozinha, sala, obra ou espaço real filmado. O original prevalece; avatar é seleção explícita, não padrão.
- Energia adequada ao assunto: fitness, gastronomia, produtos, moda e eventos podem ter cortes e movimentos mais rápidos. Jurídico e saúde pedem tempo para compreender. Nenhum nicho fica preso a uma única estética.
- Diagramas, tabelas, ícones, widgets e motion têm função identificável. Uma ação principal por beat; movimentos secundários reforçam a mesma ideia. Não usar dado fictício como indicador real.
- Transparências, bordas e sombras separam planos e mantêm legibilidade. Brilho suave pode marcar uma revelação, contato ou ponto de atenção. Sem aura contínua na pessoa ou HUD de videogame.
- Finalização para redes sociais: branco e pele naturais, exposição/contraste moderados, sombras legíveis, altas luzes contidas e grão monocromático muito leve se a fonte parecer plástica. Desligar grão em bruto já ruidoso. Sem LUT dramática, desfoque de pele ou linguagem cinematográfica como padrão.
- Voz original/autorizada conduz o ritmo. Trilha é opcional e recua sob a fala; efeitos marcam acontecimentos. As fichas contêm direção sonora, não narração ou arquivos de áudio produzidos.

Se a imagem original necessária não existir, pesquisar referências antes de gerar IA e identificar o resultado como simulação. Não inventar geometria de uma ponte, cômodos de um imóvel, cotas, resultados clínicos ou características do produto. Uma simulação contextual não prova visita da pessoa nem serve de cálculo técnico.

No histórico anterior, os seis painéis IA eram referências exploratórias de composição; as quatro primeiras explorações eram mais polidas e não substituem esta direção atual de cotidiano/redes sociais. Pessoas/lugares são fictícios. Os 240 estados esquemáticos originais descrevem a sequência de edição; não são a aparência prometida do vídeo. Painéis originais foram mantidos intactos, com prompts e SHA256 em `style-atlas/records/presenter-60/art-directions.json`.

## Recursos executáveis e limites

| Camada | Implementação 2.12.0 | Ainda depende de |
|---|---|---|
| Texto, gráficos, SVG, tabela construída em camadas, keyframes, janela | Executável com plano autorado | Conteúdo/dados e direção corretos |
| Palavras na fala | `speechWords` e validação de texto/tempos | Transcrição/alinhamento reais; ASR não instalado |
| Texto atrás, recorte e oclusão | Máscara registrada → VP9 alpha → composição | Máscara temporal confiável; extração automática não instalada |
| Objeto na mão/toque | Trajetória vinculada ao original, confiança mínima e janela ativa | Pontos e tempos medidos; detector não instalado |
| Painel translúcido | Blur real do fundo, transparência, borda/sombra | Composição/contraste aprovados; não refração física |
| Brilho suave | Forma difusa em screen com opacidade/tempo explícitos | Posição e motivo de uso; não relighting físico |
| Acabamento social | `finishing` opcional, faixas conservadoras, grão determinístico | Ajuste por fonte e revisão do MP4 comprimido |
| Som e voz | Áudio registrado, ducking e loudness nativos | Mídia licenciada/autorizada e escuta integral |
| Exterior e mecanismo 3D | Fundo/contexto e demonstração em camadas | Referências verificadas; 3D real requer assets/modelo e implementação |
| Cortes/melhor take | Trim e EDL explícitos | Análise semântica e remapeamento de todos os tempos |

Não foi usada API paga. Nenhum vídeo IA novo ou voz clonada foi produzido. Limite atual de ingestão: 100 MiB por arquivo e 3.600 s; não prometer importação universal de gravações longas sem rever o armazenamento.

## 60 direções setoriais

A arquitetura fecha 40 direções nos 11 nichos iniciais, mais 20 em engenharia, interiores, eventos e nos três nichos sugeridos: educação, agro e turismo. Estes últimos aproveitam demonstração didática, processos/máquinas e explicação de lugares/serviços.

| Segmento | Quantidade | Direções |
|---|---:|---|
| Corretores e imóveis | 4 | Planta em vidro; Endereço editorial; Maquete na palma; Detalhes que fazem sentido |
| Dentistas e odontologia | 4 | Sorriso em etapas; Estrutura com clareza; Cuidado visto de perto; Consulta em linhas leves |
| Arquitetura e interiores | 4 | Do traço ao espaço; Cotas no lugar certo; Materialidade em transição; Decisões de projeto |
| Lojas e produtos | 4 | Vitrine com profundidade; Produto em primeiro plano; Catálogo comentado; Da origem ao detalhe |
| Advogados e informação jurídica | 4 | Duas perguntas, uma orientação; Mapa da orientação; Cláusula em foco; Direito com clareza |
| Estética e cuidados | 4 | Ritual de cuidado; Textura em luz suave; Atendimento que acolhe; Precisão e delicadeza |
| Fitness e movimento | 4 | Movimento com controle; Progressão sem pressa; Respirar e executar; Equipamento explicado |
| Procedimentos estéticos | 3 | Consulta esclarecida; Camadas em perspectiva; Jornada do cuidado |
| Gastronomia | 3 | Ingredientes com origem; O ponto da transformação; Menu em conversa |
| Pets e cuidados animais | 3 | Rotina com gentileza; Cuidado em cada detalhe; Experiência de cuidado |
| Moda e atelier | 3 | Caimento em movimento; Do atelier à peça; Composição com intenção |
| Engenharia | 4 | Estruturas em contexto; Da etapa ao sistema; O mecanismo por dentro; Leitura que orienta |
| Design de interiores | 3 | Espaço que funciona; Luz para cada uso; Materiais em convivência |
| Produção de eventos | 4 | O palco toma forma; O mapa da experiência; Da chegada ao momento principal; Luz que marca o momento |
| Educação e treinamento | 3 | A ideia se torna visível; Experimento em contexto; Da explicação à prática |
| Agronegócio | 3 | O ciclo explicado no campo; Máquina e função; Território com informação |
| Turismo e hotelaria | 3 | Percurso que conta a experiência; Hospedagem em detalhes; O lugar explicado |

## Storyboards para demonstrar entendimento

Tempos indicativos; ajustar à fala real, sem dividir o vídeo uniformemente. Rótulos finais continuam editáveis. Cenários e pessoas dos painéis são fictícios, não referência da identidade do usuário.

**A. Corretores / 30 s.** 0–4 s pessoa no apartamento real pergunta como o espaço funciona. 4–11 s planta autorizada surge num painel translúcido ao lado, cômodo citado recebe destaque. 11–20 s percurso conecta entrada, sala e varanda sem encobrir mãos. 20–26 s luz suave acompanha o ponto de atenção real. 26–30 s resumo de três características confirmadas e convite. Ambiente do imóvel + passos discretos; som curto só ao revelar planta. Sem inventar vista ou metragem.

**B. Dentista / 30 s.** 0–5 s profissional na clínica real situa um conceito. 5–13 s esquema educativo ocupa uma área lateral e se constrói em duas partes. 13–23 s gesto real relaciona estrutura e função; sem animar órgão do paciente ou prometer resultado. 23–30 s síntese e orientação informativa. Voz acolhedora, transições suaves e conteúdo revisado pelo profissional.

**C. Engenharia / exterior / 35 s.** 0–5 s pessoa no ambiente original introduz uma pergunta sobre estruturas. 5–11 s tomada geral real/licenciada ou simulação identificada da ponte pesquisada. 11–20 s setas mostram uma relação confirmada; pessoa em janela preservada. 20–29 s mecanismo genérico simplificado separa partes relevantes, com rótulo ilustrativo e sem cálculo inventado. 29–35 s retorno ao ambiente original e resumo. A simulação não prova a geometria ou o comportamento estrutural exatos da Rio–Niterói. A versão sobre a ponte precisa conferir fontes específicas antes de produzir assets.

**D. Eventos / 35 s.** 0–5 s produtor no local real vazio. 5–14 s mapa aprovado apresenta entrada, palco, acessos e zonas por camadas. 14–23 s percurso acompanha a jornada do visitante e dá lugar à prévia identificada do palco. 23–30 s luz/brilho suave marca um momento do espetáculo, sem flashes agressivos. 30–35 s resumo da experiência. Planta e simulação não substituem projeto de segurança, lotação ou aprovação técnica.

**E. Produto / 25 s.** 0–4 s pessoa mostra o produto real na loja. 4–11 s detalhe relevante amplia com dois rótulos. 11–19 s demonstração confirma o uso, com gesto/contato medidos quando necessário. 19–25 s resumo e ação. Ritmo mais ativo, sem modificar rótulo/SKU. SFX acompanha somente a ação demonstrada.

## Entrega por superfície

O site publicado oferece filtro por 17 segmentos, 60 painéis fotorrealistas fictícios e quatro momentos por estilo. Os seis painéis exploratórios anteriores permanecem como histórico. O projeto exportado leva `presenterEditing`, fontes/requisitos e `finishProfile` para o agente. O [prompt completo](../style-atlas/dist/presenter-prompt.txt) incorpora ambiente real, IA como fallback pesquisado, motion com propósito e acabamento social.

A referência canônica da skill documenta operadores e limites; o empacotador sincroniza Codex/Claude e runtime. GitHub: [PR #20](https://github.com/andrezucatti82-rgb/studio-kit-pro/pull/20), integrada e publicada como versão 2.12.0. Preparar futuros pacotes não instala em outra conta nem publica automaticamente; consulte [estado da entrega](RELEASE-2.12.md).

## Validação inicial dos operadores (registro histórico)

Verificações: typecheck, 170 testes JavaScript + 9 Python, validador e whitespace passaram. Houve render real com comparação de pixels para alpha, âncora medida, blur do fundo e grão determinístico/desativável. No Chromium, os 17 filtros, download de prompt/projeto, importação CLI e galeria de 320–1920 px passaram; a regressão guiada também passou. Registro: `style-atlas/records/presenter-60/validation.json`. Typecheck, testes, comparação de pixels do render e QA do navegador não equivalem a playback/escuta de uma produção real ou aprovação dos conceitos. Antes de vídeo IA, as etapas visuais aplicáveis devem estar aprovadas; antes do filme completo, revisar a amostra representativa com o bruto escolhido.

## Finalização das fichas e instalação compacta

As 60 fichas agora incluem interactionPlan com intenção da fala, ação da pessoa, resposta gráfica, direção sonora, função e requisitos por momento. O site permite navegar pelos quatro momentos e leva o mesmo plano ao prompt/JSON. sourceTimes continua null: não são tempos medidos nem 60 vídeos completos. O material existente é preservado, e a amostra futura precisa comprovar gesto, contato e sincronismo.

O botão Instalar ferramenta oferece um único ZIP compacto; o instalador obtém a revisão fixa completa do GitHub, confere hashes, prepara dependências/skills locais e abre o tutorial. Codex/Claude Code e login são conferidos separadamente. Detalhes em [instalação](INSTALL-SKILL.md).

## Revisão visual 4.7 e diversidade

As referências públicas dos explicadores passam a quadros fotorrealistas específicos, com pessoas/cenas fictícias e quatro painéis completos. Os esquemas vetoriais anteriores ficam como registro histórico; não representam a aparência prometida. O original de cada imagem gerada é preservado, com prompt e hash. Os painéis têm crop normalizado para visualização/exportação individual sem ocultar partes da cena.

creativeDirection distingue mecanismo, material, enquadramento, construção da informação e posição/escala da pessoa por trecho. Há tipografia em profundidade, objeto na palma, modelo em corte, lousa física, mapa dominante, interface, macro tátil, trajetória corporal, exterior contextual e diálogo, entre outras composições. Vidro é uma opção específica, não formato obrigatório. Diversidade não significa trocar só cor, personagem ou texto num mesmo cartão. A animação acompanha os tempos/gestos reais e precisa de prova na amostra.

A revisão 4.7 passou em 198 testes JavaScript e 9 Python, typecheck e validação. O navegador conferiu galeria/filtros de 320–1920 px, navegação/exportação dos painéis em 375/1440 px, prompt/JSON e Page. Registro: `style-atlas/records/presenter-realistic/validation.json`. A prova da instalação da revisão fixa fica no recibo do download.
