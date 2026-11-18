# Galeria Fólio: navegação e enquadramento

As prévias quadradas mantêm a mesma altura em todos os estilos e reduzem a rolagem. A grade mostra seis colunas a partir de 1.200 px, quatro de 900 a 1.199 px, três de 701 a 899 px e duas no celular. As coleções usam a mesma grade do catálogo, com ações para adicionar e examinar os momentos.

A imagem principal é apresentada inteira e sem deformação. Para preencher um cartão quadrado com uma fonte vertical ou horizontal, uma cópia decorativa desfocada da própria referência ocupa o fundo. Essa cópia não faz parte do vídeo nem aparece na leitura por tecnologias assistivas. A proporção nativa fica disponível na ficha ampliada; todas as prévias da galeria mantêm a mesma altura. O visualizador, os downloads e os arquivos enviados ao agente continuam usando a arte original completa. O enquadramento da galeria não modifica o briefing, os prompts, as contribuições ou as aprovações.

No computador, a moldura recebe um brilho discreto conforme o mouse e sobe 3 px ao passar sobre ela; a arte não recebe zoom nem inclinação. No teclado, o foco continua visível. A preferência de movimento reduzido desativa o deslocamento e o brilho acompanhado pelo mouse. No toque, as ações continuam acessíveis sem depender de hover. Um botão permite voltar ao começo em páginas longas.

Referências pesquisadas: [coleções do Are.na](https://help.are.na/docs/getting-started/channels), [organização do Cosmos](https://help.cosmos.so/en/articles/17508514-saving-and-organizing) e [descoberta e filtros do Adobe Stock](https://helpx.adobe.com/stock/web/help/using-adobe-stock-website.html). São referências de organização e descoberta; a identidade de papel, tinta e terracota do Fólio permanece própria.

Validação: `tests/browser-folio.py` percorre descoberta, coleções, favoritos, escolha, briefing, prompt, exportação, categorias, busca, comparação e ajuda, além da geometria dos 1.425 estilos. As capturas e as verificações de layout/movimento da revisão ficam em `projects/folio-refresh/`, ignorado pelo Git. Essas verificações não equivalem a certificação completa de acessibilidade nem a revisão audiovisual dos vídeos.
