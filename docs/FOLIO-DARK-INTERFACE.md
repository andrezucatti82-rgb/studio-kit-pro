# Fólio — interface escura

As referências visuais enviadas pelo usuário orientam a hierarquia e o acabamento: fundo quase preto, superfícies cinza, campos e botões arredondados, ícones de linha e tipografia sans-serif. A identidade do produto permanece Fólio por GDA.

- Fundo `#101010`, superfícies `#242424`, superfícies elevadas `#303030`, texto `#f5f5f5` e secundário `#a8a8a8`.
- Inter local nos pesos 400, 500, 600 e 700; arquivos, procedência e hashes em `style-atlas/records/folio-dark/ui-fonts.json`. É uma aproximação visual às referências, sem afirmar que é a fonte oficial do Grok/xAI.
- Monograma F próprio em `assets/folio-mark.svg`, assinatura com lettering em curvas em `assets/folio-logo.svg`, ícone SVG e versões PNG/ICO para navegador e tela inicial. A geometria é simples para permanecer legível em tamanhos pequenos.
- No desktop, os atalhos de categorias ficam no cabeçalho. O painel mostra os sete grupos à esquerda e apenas as coleções do grupo escolhido em grade à direita. No celular, começa em uma grade de categorias e navega para a grade de coleções, com retorno claro.
- Busca de categorias e segmentos, Escape, foco após escolher um destino e projetos existentes são preservados. Os menus usam botões nativos e diálogo modal; não dependem apenas de hover.
- No celular, o formulário aparece antes da prévia detalhada e usa campos com pelo menos 16 px. O tutorial também é escuro e contém suas fontes para abrir como arquivo local.
- Os 1.425 estilos continuam com a prévia 3:4 de altura uniforme e imagem preenchendo todo o quadro. A apresentação da interface não recolore ou altera as imagens, os painéis baixados, o briefing, os prompts e as aprovações.

As telas de assinatura, notificações e conta das referências não são funções deste produto. O tema não acrescenta serviços pagos nem transfere contas dos agentes. O fluxo de produção continua usando as ferramentas e as contas do usuário, com as aprovações próprias de cada etapa.

Verificação reproduzível: `tests/browser-dark-ui.py`, `tests/browser-folio.py` e `tests/browser-gallery-layout.py`. Os testes do tema cobrem as quatro fontes, as sete categorias, todas as coleções, busca de segmento, foco entre tamanhos de tela e ao fechar, contraste dos cartões de ajuda, formulário móvel e preservação do projeto. As capturas ficam em `projects/folio-dark/`, fora do Git; a evidência pública fica em `docs/validation/folio-dark.json`. Isso não equivale a certificação integral de acessibilidade ou teste nativo de todos os dispositivos.

Os pacotes de skills e plugins são regenerados das fontes canônicas; esta mudança visual não modifica as receitas de vídeo nem o contrato dos prompts. O instalador recebe o tutorial e a revisão exata do projeto.
