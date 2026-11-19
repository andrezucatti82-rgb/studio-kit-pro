# Busca e sugestões por conteúdo

Os 1.425 estilos têm palavras-chave internas por ID. A ampliação cobre finalidade, profissão/nicho, produtos e serviços, materiais, técnica, cores, linguagem e usos em canais. O campo oferece sugestões de palavras e títulos enquanto a pessoa digita, com contagens, navegação por setas e Enter, fechamento por Escape e opções ao toque. A lista permanece no fluxo da página. Uma correção de uma letra pode ser sugerida quando a consulta não encontra nada; ela só é aplicada se a pessoa escolher.

A busca combina palavras: “dentista azul”, “vender capacho”, “avatar diagrama” e “floricultura reels”. Sinônimos explícitos aproximam cão/cachorro, imóveis/MCMV e profissões; acentos e maiúsculas não mudam os resultados. Cada sugestão leva a uma busca com resultados e respeita os filtros do catálogo. Nada é enviado a Google, a uma API paga ou a um serviço de IA. Consultas não são gravadas em histórico nem alteram o briefing.

## Evidência e limites

`catalog.json.search.styleTags` contém as associações. `styleColors` cobre uma referência principal por estilo. O script de análise lê o quadro lógico, respeita os recortes de apresentação e mede proporções aproximadas de cores; não edita arquivos, identifica pessoas ou reconhece materiais. A paleta declarada das receitas também participa. A extração textual usa descrições positivas e campos de composição, câmera e tipografia; exclui políticas, trechos negativos e “vídeo IA” como insumo genérico. Assim, uma técnica gerada com IA não vira automaticamente um vídeo sobre IA.

Finalidades e canais são usos recomendados das receitas, não afirmações de publicação ou de vídeo executado. A curadoria humana de pets continua em `style-atlas/records/search/overrides.json`. A análise adicional é automática e tem trilha por estilo em `enrichment.json`, com fontes como descrição, uso, receita e cor de referência. O conteúdo e os contratos dos estilos permanecem intactos; as tags nunca viram instruções de produção.

## Manutenção

1. Atualize descrições, ontologia ou tags editoriais com evidência.
2. Se mudar imagens ou recortes, rode `python3 scripts/analyze-search-colors.py` no repositório completo com Pillow disponível.
3. Rode `npm run search:index`; use `npm run search:index -- --verify-media` no repositório completo para conferir também os hashes das referências.
4. Rode `node --test tests/search.test.mjs` e `python3 tests/browser-autocomplete.py`.

O runtime compacto traz o registro de cores e os recortes, mas não as imagens. A reconstrução do índice funciona com esses registros; a análise de pixels e a verificação de mídia exigem o repositório completo. Regere os pacotes e o payload da Page após mudar o índice. A Page usa o mesmo módulo e os mesmos dados externos da versão publicada; fonte, execução e publicação são verificações distintas.
