# Padrões visuais do Fólio

A camada `style-atlas/dist/folio-components.css` refina os componentes existentes e é carregada depois de `folio.css`. O construtor da Page inclui a mesma camada. A fonte local Folio UI e o amarelo-limão `#e2ff3b` permanecem a base da interface.

A escala compartilhada utiliza equivalentes em rem de 12, 14, 16, 20 e 28 px para metadados, navegação/rótulos, leitura/controles, seções e títulos. As amostras de tipografia mantêm suas próprias fontes e proporções. Ícones comuns usam 20–22 px; os controles de toque mantêm pelo menos 44 px. Ações usam 48 px de altura mínima e 20 px de espaço lateral, com adaptações no cabeçalho estreito. Textos longos podem ocupar mais de uma linha sem encostar nas bordas.

Painéis usam superfícies neutras, contorno discreto e sombra curta. Os campos têm relevo interno e cantos consistentes. A transparência fica no cabeçalho, com fundo opaco quando não há suporte a blur ou quando a pessoa prefere reduzir transparência. Animações curtas respeitam movimento reduzido. Nenhuma camada clara é acrescentada dentro dos quadros de imagens.

As categorias continuam em fluxo e alinhadas à primeira opção do menu. Em larguras intermediárias, os indicadores secundários cedem espaço aos nomes; o menu pode quebrar linha para manter todas as opções visíveis. Em 320 px, uma linha adicional preserva o tamanho de leitura e os alvos de toque.

A verificação cobre biblioteca, categorias, busca/sugestões e vazio, ficha, sequência, criação guiada, briefing, tipografia, materiais, revisão, ajuda/instalação e acompanhamento. O teste de interface mede o espaço real do texto nos botões, visibilidade das categorias, ausência de rolagem horizontal, preservação do projeto e preferências de movimento/transparência. Os testes existentes cobrem alinhamento, teclado móvel, cabeçalho persistente e enquadramento dos 1.425 estilos. Simulações de viewport não substituem um teste físico no iPhone.

As páginas auxiliares de pesquisa, referências, sequências e amostras usam `folio-support.css` com a mesma fonte e escala. O tutorial canônico em `docs/COMECE-AQUI.html` mantém fontes e estilos incorporados para continuar funcionando fora do site; seus botões também seguem o amarelo-limão e o espaço interno comum. As cópias de distribuição são geradas a partir dele.
