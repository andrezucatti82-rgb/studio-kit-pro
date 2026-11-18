# Revisão e entrega VFX

## Evidências por versão

Copie `templates/vfx-review.json`. Registre hash do arquivo observado, range/trechos, data e método de revisão, ferramenta/view transform, resultado, falhas e próxima correção. `null`, listas vazias e `not_checked` significam desconhecido/pendente. Hash deve ser calculado sobre o arquivo real, nunca exemplo inventado. Aprovação do usuário fica no registro da coordenadora.

| Área | Conferir |
| --- | --- |
| Tracking | Grade/objeto de teste durante todo o range, perspectiva, contato, deriva e saltos |
| Matte/roto | Cabelo, dedos, bordas, blur, transparências e estabilidade temporal |
| Cleanup | Repetição de textura, revelações, sombras/reflexos, costuras e fervura |
| CG/FX | Escala, peso, luz, contato, oclusão, reflexos, profundidade, velocidade e densidade |
| Cor/alpha | Inputs/working/view/output, premult, faixa, canais e ausência de transform duplicado |
| Identidade | Produto/rótulo, pessoa, arquitetura/UI e marca comparados aos originais |
| Óptica | Lente, rolling shutter, foco, DOF, motion blur, grão e nitidez |
| Editorial | Primeiro/último frame, handles, transições, legendas/texto e sincronismo |
| Técnica | Resolução, fps/timebase, range, codec, canais, decodificação e arquivos acessíveis |

Quadros de início/meio/fim e extremos ajudam diagnóstico espacial; playback contínuo resolve diagnóstico temporal. Examine adicionalmente oclusões, cortes de máscara e frames corrigidos. Compare antes/depois e referência, em tamanho de entrega e ampliação para bordas. Escute o arquivo integrado completo com som; para passe sem áudio, registre `not_applicable`, e deixe a revisão sonora para a montagem. Não marque som integrado aprovado a partir de comp mudo.

Critérios devem ser definidos por plano e resolução. Ausência de deslizamento perceptível em reprodução, estabilidade das bordas e invariantes preservadas são critérios observáveis. Nenhum valor universal de solve, SSIM ou volume certifica acabamento. Render/decode e checker aprovados são evidência técnica, não testemunho de visualização.

## Diagnóstico rápido

| Sintoma | Investigar | Prova após correção |
| --- | --- | --- |
| Tela desliza | Superfície errada, oclusor no track, distorção, blur, referencia/corner pin | Grade e conteúdo aderem em playback, incluindo pior trecho |
| Objeto flutua | Chão/escala/câmera, shadow catcher, luz/oclusão | Cubo no chão e comp mantêm contato no range inteiro |
| Halo escuro | Premult duplicado, RGB da borda, key/filtro, espaço errado | Comparar alpha/RGB sobre preto, branco e fundo final |
| EXR lavado | Input, view/output duplicados, exposição/curva/range | Comparar DCC/compositor/editor sob configuração declarada |
| Cabelo pulsa | Roto/key por frame, propagação, erosão/feather | Detalhe estável em playback e sem perder transparência |
| Fumaça parece adesivo | Escala, perspectiva, oclusão, emissão, luz, repetição | Volume/aparência e interações consistentes no tempo |
| Cleanup ferve | Inpainting temporal, patch inadequado, textura/grão | Loop com revelações e iluminação estável |

## Estados e pacote

- `planning`: breakdown/instruções; mídia ainda não executada.
- `candidate`: saída renderizada identificada, aguardando verificações.
- `review_pending`: alguma revisão necessária não pôde ser feita ou há falhas abertas.
- `reviewed`: revisão requerida realmente executada e registrada; aprovação criativa continua separada.

Inclua editável nativo/scripts, mídia permitida ou instruções de relink, manifesto de assets e licenças, versões de dependências, caches necessários, ranges/handles, cor/OCIO/alpha/canais, preview e master acordados, plano e revisão. EXR sequence ou intermediário com alpha serve ao contrato de composição; MP4 H.264 é normalmente preview/montagem opaca, sem transparência. Confirme codec/contêiner/bit depth com quem recebe.

Vídeo decomposto por frames pode revelar dados privados: projetos de cliente ficam na pasta ignorada; exemplos públicos são genéricos. Não redistribuir footage de tutorial, livro, plugin, fonte ou asset sem licença. Esta skill não contém mídia licenciada de terceiros.
