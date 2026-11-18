# Galeria Fólio: navegação e enquadramento

As prévias em 3:4 mantêm a mesma altura em todos os estilos. São 33% mais altas que as prévias quadradas anteriores, para mostrar as imagens maiores. A grade mostra seis colunas a partir de 1.200 px, quatro de 900 a 1.199 px, três de 701 a 899 px e duas no celular. As coleções usam a mesma grade do catálogo, com ações para adicionar e examinar os momentos.

A própria imagem ocupa todo o quadro, sem barras laterais ou fundo desfocado. A prévia faz um reenquadramento proporcional da referência, sem esticá-la. Nos explicadores, o alinhamento inferior prioriza os objetos e diagramas; nas demais referências, um alinhamento mais alto favorece a pessoa. Esses alinhamentos são regras de apresentação, não detecção automática de rostos ou texto. A ficha ampliada e os downloads continuam mostrando o painel original completo. O reenquadramento da galeria não altera as imagens fonte, o briefing, os prompts, as contribuições ou as aprovações.

No computador, a moldura recebe um brilho discreto conforme o mouse e sobe 3 px ao passar sobre ela; a arte não recebe zoom nem inclinação. No teclado, o foco continua visível. A preferência de movimento reduzido desativa o deslocamento e o brilho acompanhado pelo mouse. No toque, as ações continuam acessíveis sem depender de hover. Um botão permite voltar ao começo em páginas longas.

Referências de organização: [coleções do Are.na](https://help.are.na/docs/getting-started/channels), [organização do Cosmos](https://help.cosmos.so/en/articles/17508514-saving-and-organizing) e [descoberta e filtros do Adobe Stock](https://helpx.adobe.com/stock/web/help/using-adobe-stock-website.html). São referências de organização e descoberta; a identidade de papel, tinta e terracota do Fólio permanece própria.

Validação: `tests/browser-folio.py` percorre descoberta, coleções, favoritos, escolha, briefing, prompt, exportação, categorias, busca, comparação e ajuda, além da geometria dos 1.425 estilos. As capturas e as verificações de layout/movimento da revisão ficam em `projects/folio-refresh/`, ignorado pelo Git. Essas verificações não equivalem a certificação completa de acessibilidade nem a revisão audiovisual dos vídeos.

## Tema e categorias

As capturas de Grok/xAI fornecidas pelo usuário orientam o tema escuro: fundo #101010, superfícies #242424, campos e ações arredondados, ícones discretos e Inter local em quatro pesos. O símbolo do Fólio usa um monograma F próprio, com logotipo sem serifa e ícones de navegador atualizados. A aparência das referências de vídeo continua com suas cores originais.

No computador, os atalhos do cabeçalho abrem somente nomes de subcategorias em colunas de texto. O botão de quatro quadrados começa pelos sete nomes de categorias. No celular, as palavras ficam em duas colunas; escolher uma categoria mostra suas subcategorias, com retorno por Categorias. O menu não tem busca, contadores, cartões ou rodapé; a busca e os filtros da biblioteca continuam na página principal. O menu expande no fluxo normal, sem sobreposição ou bloqueio da rolagem. Escolher uma subcategoria recolhe o menu e leva o foco aos resultados; Escape e Fechar retornam ao botão de abertura. Navegar não modifica o projeto ou as escolhas.

No celular, os campos do briefing aparecem antes da prévia detalhada. Os campos de texto usam pelo menos 16 px para evitar o zoom automático comum em formulários móveis. O tutorial adota o mesmo tema e inclui suas fontes para leitura local.
