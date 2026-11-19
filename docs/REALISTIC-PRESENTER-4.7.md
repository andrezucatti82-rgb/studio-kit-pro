# Referências dos explicadores · catálogo 4.7

A versão 2.12.0 apresenta 60 direções de edição com pessoas e ambientes fotorrealistas fictícios. Cada estilo tem quatro momentos independentes e uma direção de composição própria. As referências são propostas estáticas; não são 60 vídeos, nem aprovação de movimento, sincronismo ou identidade.

| Recurso | Papel na explicação | Variação de composição |
|---|---|---|
| Palavra em profundidade | Destacar a ideia citada | Pessoa central e texto atrás, com máscara verificada |
| Objeto na mão | Demonstrar escala ou mecanismo | Detalhe da palma e objeto, contato medido |
| Interface real | Mostrar como a operação funciona | Interface assume a tela; pessoa em janela ou voz |
| Corte técnico | Mostrar uma relação interna | Modelo/diagrama dominante, pessoa no detalhe pertinente |
| Croqui para ambiente | Relacionar intenção e espaço | Vista de cima, traço e transição para o ambiente |
| Mapa do evento | Explicar setores e percurso | Mapa se constrói, rota é traçada, retorno ao local |
| Dois papéis | Explicar dúvida e resposta | Alternância de interlocutores, direção do olhar coerente |
| Trajetória corporal | Tornar o movimento compreensível | Corpo inteiro e detalhe, marcador localizado |

Não fixar apresentador à esquerda, não espelhar por padrão e não transformar transparência/vidro em formato universal. Câmera, posição, escala e material têm função. `creativeDirection` e cada beat de `interactionPlan` carregam essas decisões para o prompt, JSON, importação e skills. A adaptação usa o assunto final; o imóvel, produto ou pessoa da referência não se tornam exigências automáticas. A cobertura original continua a limitar o que pode ser executado.

## Originais e endereçamento

Os PNGs originais em `style-atlas/dist/assets/presenter-realistic/` são preservados. `style-atlas/records/presenter-realistic/` registra prompts, hashes, dimensões, propostas de composição e explorações anteriores. Cada arquivo 2×2 contém quatro enquadramentos completos; `sequence.frames[].crop` endereça seu painel por `[x,y,w,h]` normalizado. Galeria, player de momentos, visualizador ampliado, download do quadro e exportação do storyboard usam o mesmo endereço. O download individual exporta só o painel completo.

A pessoa pode escolher qualquer mecanismo e adaptá-lo ao tema, preservando as contribuições e escopos. Cor isolada não aciona toda a receita de apresentador. Tempos de fala permanecem pendentes até receber e conferir a fonte. Diagramas, documentos, plantas, anatomia, rótulos e dados das imagens devem ser reconstruídos e verificados na produção.

## Verificação

Os testes conferem os 60 originais e seus hashes, 240 endereços não sobrepostos, proporções, navegação dos quatro momentos e exportação PNG. A verificação em navegador usa larguras de celular e desktop. Isso comprova comportamento da galeria e integridade dos arquivos; playback, escuta e amostra integrada continuam necessários para um vídeo real. Windows e macOS só podem ser declarados testados após execução nativa.

A versão 2.12.0 foi publicada no domínio DiSteven após o merge autorizado da PR #20. [Entrega e verificações](RELEASE-2.12.md). Referências estáticas continuam propostas fictícias; a publicação do site não aprova vídeos individuais.
