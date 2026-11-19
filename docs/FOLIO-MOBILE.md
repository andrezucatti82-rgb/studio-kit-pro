# Navegação mobile e digitação

As sete categorias ficam visíveis em duas linhas a partir de 320 px, com intervalo de 6 px entre nomes. Os submenus mantêm duas colunas, alvos de pelo menos 44 px e nenhum contorno retangular ao toque. O teclado continua levando foco à primeira opção e mantém uma indicação visível com sublinhado; Escape devolve o foco à categoria.

Botões de ação preenchidos usam amarelo-limão #e2ff3b com texto escuro de 15 px, alinhado nos dois eixos. Os campos continuam com pelo menos 16 px para evitar o zoom de foco no celular. As animações são curtas e usam apenas opacidade, deslocamento e brilho; a preferência por movimento reduzido é respeitada.

Ao editar, o sistema acompanha a área realmente visível da janela. Se o teclado reduzir essa área, a faixa de categorias é recolhida temporariamente, o cabeçalho principal permanece acessível e o campo sobe acima do teclado e da barra de edição. O conteúdo digitado não é reescrito. Ao fechar o teclado, as categorias reaparecem. Rolagem manual fora do momento de edição não é capturada continuamente.

A verificação percorre home, categorias, ficha, quadro ampliado, quatro etapas de criação, revisão, tipografia e ajuda em 320/375/390/430 px. Confere preenchimentos, tamanhos, alinhamento, alvos de toque, persistência do briefing e ausência de overflow. Há testes separados de navegação por teclado, geometria de todos os cartões e simulações dos dois comportamentos de teclado: janela que redimensiona o layout e janela visual menor com layout preservado. Essas simulações não equivalem a teste físico de teclado em iPhone.
