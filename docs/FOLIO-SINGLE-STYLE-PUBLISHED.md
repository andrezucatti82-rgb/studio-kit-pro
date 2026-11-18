# Fólio com um estilo por vídeo

As PRs #29 e #30 foram integradas e a release `atlas-20261118222902` publicada no domínio principal com backup e readback verificados. O espelho Sites está na versão 36, e a Page recebeu textos, prompt nativo e visualização na sequência 81.

Cada vídeo usa um estilo. Procurar estilos parecidos mostra alternativas sem alterar o pedido; escolher outra referência substitui a anterior. O cabeçalho reúne criar/retomar, revisar e copiar. Filtros ficam visíveis, sem Com vídeo, e os menus usam palavras neutras. O pedido inclui descrição editorial e links; baixar/anexar PNGs do catálogo deixa de ser obrigatório. Originais reais e aprovações continuam necessários conforme a produção.

A auditoria cobriu 5.700 quadros e aplicou enquadramento de apresentação em 806, sem alterar imagens ou recortes originais. Skills, plugins, tutorial e instalador foram sincronizados. O instalador público fixa a fonte `423b5e8b99eda17dd2546b0a3092f31b54eff070`; o commit de artefatos e este recibo não alteram essa fonte.

Passaram typecheck, 235 testes JavaScript, 9 Python, validador, regressão adicional de seleção repetida/migração e 25 verificações finais de contratos/distribuição. O ajuste final da ajuda passou em mais 12 verificações de distribuição. Navegadores em celular/computador conferiram a publicação, o ZIP real com hash e a seleção única. O espelho conserva o catálogo completo usando armazenamento sem duplicar as receitas do apresentador; o build restaura e compara o objeto antes do uso. A Page compilada foi testada com assets públicos reais, quatro pesos da fonte e bridge simulada; o visualizador nativo da Page não foi inspecionado. As fontes/JSON públicos da release recebem CORS para funcionar no contexto da Page.

Gitleaks não encontrou segredos nos commits de implementação. Não houve geração de mídia ou uso de API paga. Instalações já existentes precisam executar seu fluxo de atualização e reabrir a sessão; publicar não instala plugins nas contas de outras pessoas.

[Site](https://videos.gerenciadordeanuncios.com.br/) · [Espelho](https://video-multimarcas-estilos.andrezucatti82.chatgpt.site/) · [Page](https://chatgpt.com/space/page_05d0233621d081919b31df2863cab40b) · [Comprovantes](validation/folio-single-style-publication.json)
