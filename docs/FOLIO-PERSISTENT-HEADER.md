# Menu persistente e compacto

A regra que escondia as categorias fora da biblioteca foi removida. No computador e tablet, as categorias permanecem no cabeçalho no briefing, na revisão, nas fichas e na ajuda. No celular, o botão compacto de categorias permanece disponível. O cabeçalho continua sticky durante a rolagem.

Subcategorias usam colunas de largura do conteúdo e intervalo de 24 px. Ambos os níveis usam 14 px. O hover amplia o texto em 8% e aplica o verde #34c76a, sem fundo ou sublinhado. Não há sobreposição modal. Mudar de categoria e retomar o briefing preserva o projeto.

A PR #31 foi integrada com as atualizações concorrentes de ferramentas gratuitas 2.14 e o ajuste final do diagnóstico do Natron. O instalador fixa a fonte integrada 660ae72a26561c2e7d243fc7ddd5d388e04c1035. A release atlas-20261118225817 foi publicada com backup e readback verificados; o espelho Sites está na versão 40.

Passaram 257 testes JavaScript e 9 Python na integração, typecheck e validador. Após o último ajuste concorrente, passaram 33 verificações focadas de ferramentas/contratos e 12 de distribuição. Navegadores verificaram 375/768/1440 px, dados do pedido, fonte, verde, colunas compactas e cabeçalho durante rolagem. A revisão independente incluiu submenus de 320 a 1440 px. O download público foi conferido por bytes e hash. Não houve geração paga nem alteração de imagens.

A nova taxonomia por objetivo está no planejamento abaixo e não foi aplicada ao menu. A revisão automática bloqueou a publicação do HTML/JavaScript na Page separada do ChatGPT por exigir autorização específica desse destino. A visualização compilada passou com assets reais e bridge simulada; a Page existente não foi substituída.

[Planejamento da taxonomia](plans/2026-11-18-folio-taxonomy/README.md) · [Verificações](validation/folio-persistent-header.json) · [Site](https://videos.gerenciadordeanuncios.com.br/)
