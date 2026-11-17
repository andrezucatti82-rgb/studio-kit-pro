# Busca por conteúdo dos estilos

A busca usa o catálogo inteiro e tags internas por estilo. Não exige exibir chips ou palavras-chave nos cartões. O catálogo visual continua 4.7: acrescentar metadados de busca não altera imagens, receitas, IDs, ordem original ou aprovações de referência.

Digite um assunto, objeto, material, profissão ou recurso. “Cachorro”, “cão”, “cães” e “dog” usam o mesmo conceito; “mãos” e “maos” são equivalentes. Termos diferentes são combinados: “cachorro vidro” pede um estilo com os dois, e “avatar diagrama” combina apresentação e explicação. Títulos exatos têm prioridade; o restante segue relevância e ordem estável. Fragmentos com pelo menos três letras também procuram o início de palavras. Não há serviço externo, embeddings ou API paga.

Começar uma busca a partir de uma categoria abre a biblioteca inteira. Escolher uma categoria depois restringe os resultados, e o botão “Buscar em todas as categorias” remove essa restrição. Filtros de vídeo, favoritos e tipo continuam explícitos. A busca esconde o painel exploratório de categorias para priorizar os resultados; apagar a consulta o restaura. Resultados completos continuam disponíveis em Mostrar mais. Alterar uma busca não modifica o vídeo escolhido, o briefing nem seus aceites.

## Conteúdo e precisão

`catalog.json.search.styleTags` associa um conjunto de palavras-chave a cada ID. O índice inclui nome, assunto, usos, recursos, descrição da montagem, tema/ações das cenas e direção de composição. Textos de política, instruções de fidelidade e verificações não entram como descrição visual. A lista genérica de insumos repetida nos anúncios também é excluída: mencionar diagramas como possibilidade técnica não transforma todos os anúncios em estilos de diagrama. Trechos negativos são excluídos da extração: “sem neon” não torna todo estilo um resultado para neon.

A ontologia em `style-atlas/dist/search.js` explicita sinônimos e plurais. Palavras são tratadas por tokens: “cão” não é uma parte válida de “educação”. Uma referência com cachorro pode ser encontrada por pet/animal; um pet genérico não é rotulado automaticamente como cachorro. Plantas baixas dependem de contexto espacial e não se confundem automaticamente com plantio.

As 45 referências revisadas de pets, incluindo os explicadores e o manequim de peitoral, têm tags editoriais adicionais em `style-atlas/records/search/overrides.json`. Foram conferidos os quatro painéis de cada referência. A evidência registra os caminhos e crops vistos. Esses rótulos descrevem exemplos fictícios, não produtos, casos clínicos ou resultados reais. A curadoria reconhece cachorro também em títulos abstratos; mantém separados os gatos, o aquário e o atendimento sem animal visível.

## Manutenção

Para acrescentar uma palavra-chave que não está na descrição, edite o registro do ID em `overrides.json`, com `tags` e `evidence` que expliquem onde o conteúdo foi conferido. Não coloque palavras populares sem relação com a referência. Para um novo sinônimo, atualize o grupo específico em `search.js`; evite equivalências amplas que misturem assuntos distintos.

Execute `npm run search:index`. `scripts/build-search-index.mjs` regenera os metadados deterministicamente a partir das fichas, da ontologia e da curadoria. A fonte visual das fichas não muda. `npm run package` também reconstrói o índice antes dos pacotes. Depois atualize o embed Page com `python3 style-atlas/records/build_page.py --asset-origin https://videos.gerenciadordeanuncios.com.br/`.

O índice é construído uma vez no navegador. Site e Page usam o mesmo módulo, sem localStorage no modo Page. Tags servem para encontrar uma direção; não se tornam novas instruções de produção nem alteram o escopo que a pessoa selecionou. O instalador completo obtém os arquivos da revisão fixa publicada no GitHub. A publicação do site é uma etapa separada.

## Verificação desta revisão

206 testes JavaScript e 9 Python passaram; depois do ajuste final do contador, os 46 testes de busca/DOM também passaram. Chromium verificou site e Page em 375/1440 px: sinônimos, precisão cachorro/gato/aquário, paginação, refinamento, foco, seleção e ausência de overflow. As consultas isoladas do índice levaram aproximadamente 0,4–2,8 ms nesse ambiente de teste, sem contar renderização ou downloads; isso não representa medição de um celular físico. Evidência em `style-atlas/records/search/validation.json`. A biblioteca atual retorna 39 direções para cachorro/cão/cães, quatro para gato e uma para aquário. Publicação permanece separada.
