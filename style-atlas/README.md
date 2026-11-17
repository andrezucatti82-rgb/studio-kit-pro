# Atlas visual — Vídeo Multimarcas

Catálogo 4.8: **1.425 estilos em sete categorias principais**, com 30 famílias de dados. **Apresentador + explicação** é uma categoria principal com 265 direções em 53 segmentos. A galeria usa HTML, CSS e JavaScript, sem chave de API no navegador.

Escolha um estilo principal e até nove complementares, indicando quais características e momentos cada um fornece. O pedido e a ficha portátil levam IDs, referências individuais, sequência, áudio proposto, materiais, critérios, contribuições e escopos. Copiar o pedido não produz nem publica um vídeo automaticamente.

## Usar

Veja o [tutorial para iniciantes](../docs/COMECE-AQUI.html) ou abra o [site público](https://videos.gerenciadordeanuncios.com.br/). O instalador compacto prepara o projeto completo para Codex e Claude Code, com sete skills. ChatGPT ou Claude no navegador orientam conforme suas ferramentas disponíveis. Contas, mídias e créditos são separados da instalação.

Para servir a galeria localmente, execute `npm run atlas` na raiz do repositório. Sirva por HTTP; abrir o HTML como arquivo pode impedir o carregamento do catálogo.

## Apresentador e explicação

As direções têm quatro quadros completos, composição própria e planos de interação por fala/ação. Os 205 novos estilos incluem 120 aplicações comerciais, 25 adicionais em cinco segmentos, 30 imobiliários, dez sobre implantes e 20 para performance, tráfego, e-commerce e IA para negócios. [Direção, pesquisa e limites](../docs/PRESENTER-COMMERCIAL.md).

As pessoas e os ambientes das referências são fictícios. A filmagem ou o avatar explicitamente escolhido pelo usuário prevalecem. Máscaras, trajetórias, fala e novas vistas exigem insumos conferidos; não há extração automática desses dados por selecionar uma receita. Fotografias não comprovam animação, sincronismo ou resultados.

## Imagens e tipografia

Todos os estilos têm sequência de quatro quadros. As referências com apresentador são fotorrealistas; outras famílias preservam sua linguagem ilustrada, editorial, de interface ou motion. Cartões, setores, detalhes e assistente encaixam os quadros completos sem distorção. As prévias WebP dos 60 painéis PNG anteriores mantêm as dimensões e o enquadramento, com originais preservados para ampliação e download.

Há 24 combinações tipográficas com arquivos e licenças registrados em `dist/fonts.json` e `dist/assets/fonts/`. A identidade da interface é GDA; a identidade dos vídeos segue a marca do usuário. Veja [direitos e procedência](../THIRD_PARTY.md).

## Busca, briefing e privacidade

A busca usa nomes, assuntos, ações e tags internas por ID, com acentos, sinônimos e termos combinados. [Manutenção da busca](../docs/SEARCH.md). Tags são dados de descoberta, não instruções de produção.

O site guarda favoritos e briefing no navegador. O usuário decide copiar o pedido ou baixar o projeto. Na edição em Page do ChatGPT, o estado usa a integração própria da Page. Mídia e contas não são transferidas por esses mecanismos; nunca publicar dados ou materiais de clientes junto do catálogo.

## Manutenção

Edite as sete skills canônicas em `.agents/skills/`; gere as cópias de distribuição com `npm run package`. Os 1.220 IDs anteriores são preservados. As fontes da ampliação estão em `records/presenter-180/`, e a procedência por imagem em `records/presenter-realistic/`.

Com todos os originais gerados e revisados, a consolidação da ampliação usa:

```sh
node scripts/build-presenter-commercial.mjs
node scripts/complete-presenter-catalog.mjs
python3 scripts/prepare-presenter-thumbnails.py
node scripts/apply-realistic-presenters.mjs
npm run package
```

Execute esses comandos na raiz. Os geradores antigos de base documentam etapas históricas e não devem sobrescrever o catálogo atual. A geração de referências não é parte da instalação nem autoriza uso de APIs pagas. Após validar código, catálogo, interface e pacotes, fixe a fonte do instalador numa revisão limpa e verificada.

Pesquisa atual: [registro de fontes](records/presenter-180/research.json) e [página pública](dist/research.html). O [registro da edição 3.0](records/RESEARCH.md) é histórico; reconhecimentos e prêmios pertencem às obras citadas, não aos estilos propostos.
