# DiSteven — interface escura

As referências visuais enviadas pelo usuário orientam a hierarquia e o acabamento: fundo quase preto, superfícies cinza, campos e botões arredondados, ícones de linha e tipografia sans-serif. A identidade do produto permanece DiSteven.

- Fundo `#101010`, superfícies `#242424`, superfícies elevadas `#303030`, texto `#f5f5f5` e secundário `#a8a8a8`.
- Inter local nos pesos 400, 500, 600 e 700; arquivos, procedência e hashes em `style-atlas/records/disteven-dark/ui-fonts.json`. É uma aproximação visual às referências, sem afirmar que é a fonte oficial do Grok/xAI.
- DiSteven em Inter Semibold branca no cabeçalho. O arquivo `assets/disteven-logo.svg` contém a palavra em curvas. O navegador e a tela inicial usam o D nos ícones SVG, PNG e ICO.
- No desktop, cada categoria abre uma lista vertical abaixo do cabeçalho. Quando há mais opções, uma segunda lista abre ao lado da primeira. Os painéis têm fundo cinza opaco, cantos arredondados e borda fina.
- No celular, o botão **Categorias** abre um nível por vez. **Voltar** sobe um nível e **Ver todos os estilos** abre os resultados da categoria exibida.
- A categoria principal tem texto maior que o das opções internas. O ponteiro muda as cores dos botões e o foco do teclado tem destaque próprio.
- No celular, o formulário aparece antes da prévia detalhada e usa campos com pelo menos 16 px. O tutorial também é escuro e contém suas fontes para abrir como arquivo local.
- Os 1.425 estilos continuam com a prévia 3:4 de altura uniforme e imagem preenchendo todo o quadro. A apresentação da interface não recolore ou altera as imagens, os painéis originais nem as aprovações.

As telas de assinatura, notificações e conta das referências não são funções deste produto. O tema não acrescenta serviços pagos nem transfere contas dos agentes. O fluxo de produção continua usando as ferramentas e as contas do usuário, com as aprovações próprias de cada etapa.

Verificação reproduzível: `tests/browser-dark-ui.py`, `tests/browser-disteven.py` e `tests/browser-gallery-layout.py`. Os testes do tema cobrem as quatro fontes, as sete categorias, todas as coleções, menu somente textual, foco entre tamanhos de tela e ao fechar, contraste dos cartões de ajuda, formulário móvel e preservação do projeto. As capturas ficam em `projects/disteven-dark/`, fora do Git; a evidência pública fica em `docs/validation/disteven-dark.json`. Isso não equivale a certificação integral de acessibilidade ou teste nativo de todos os dispositivos.

Os pacotes de skills e plugins são regenerados das fontes canônicas; esta mudança visual não modifica as receitas de vídeo nem o contrato dos prompts. O instalador recebe o tutorial e a revisão exata do projeto.

As fichas, comparação, imagens ampliadas, escolha, fontes, materiais e assistente abrem como páginas internas, com retorno ao contexto e à rolagem anteriores. A ampliação de um quadro substitui a ficha temporariamente e volta a ela. O cabeçalho continua acessível e permite sair dessas páginas. As APIs existentes de abertura/fechamento são adaptadas a diálogos não modais em fluxo normal; não entram na camada superior do navegador. O briefing permanece uma página interna. Verificação: `tests/browser-inline-navigation.py`.

A navegação é direta: os nomes começam logo abaixo do cabeçalho. Escolher uma categoria principal atualiza também os estilos, além das subcategorias. O menu usa palavras neutras: sem preenchimento azul/verde, sublinhado ou botão Categorias; o hover aumenta discretamente a palavra. Os filtros de segmento, tipo e favoritos ficam sempre visíveis na listagem. Não há filtro Com vídeo nem amostras de vídeo oferecidas.

O cabeçalho é sticky e concentra o avanço: Criar vídeo/Meu vídeo → etapas do assistente ou briefing → Revisar pedido → Copiar pedido. O assistente preserva um rascunho ao explorar a biblioteca. Não há barras flutuantes inferiores ou botão duplicado no briefing. Verde `#34c76a` indica estados e ações reais; botões verdes usam texto escuro.

Cada novo vídeo usa um estilo. Escolher outro substitui a direção; Procurar estilos parecidos ordena até 24 alternativas por segmento, categoria, tipo e termos editoriais compartilhados, exclui a origem e não altera o projeto. O mecanismo interno mantém leitura de contratos antigos; a interface não expõe combinações ou o editor de contribuições. Ao carregar uma seleção antiga múltipla, mantém o principal, informa a mudança e renova os aceites.

O prompt leva `visualDescription`, direção, evolução dos quatro momentos e URLs. A descrição usa dados editoriais existentes; não identifica fontes exatas ou códigos de cor por adivinhação. Sem acesso visual, a IA informa a limitação e apresenta o moodboard baseado no texto. Não exige baixar/anexar PNGs do catálogo; originais reais necessários à produção continuam sendo solicitados. O download de imagens saiu da interface; arquivos e contratos de recorte originais permanecem preservados.

`style-atlas/records/frame-framing/scan.py` audita todos os 5.700 quadros de 1.425 estilos. A regra conservadora identifica faixas claras neutras nas bordas (amostragem com veto de pixels escuros, limite de espessura); `report.json` registra hashes e insets, e `frame-presentation.js` aplica o enquadramento apenas na apresentação. São 806 quadros de 239 estilos ajustados, sem modificar imagens, crops de produção ou downloads. A Page carrega esse mapa externo junto do catálogo para manter o limite de 256 KiB. A análise automática não certifica conteúdo visual; a revisão inclui o exemplo jurídico e amostras representativas.

Verificação adicional: `tests/frame-presentation.test.mjs` cobre limites e imutabilidade; `tests/browser-simple-brief.py` cobre seleção única, semelhantes sem mutar projeto, retomada de rascunho, filtros, header sticky e prompt descritivo.
