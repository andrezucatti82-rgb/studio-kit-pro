# Curadoria de conteúdos para vídeos

A biblioteca ajuda a encontrar B-roll, imagens, material histórico, vetores, modelos, texturas e dados antes de gerar novos assets. É um catálogo extensível, organizado por tipo, licença e caminho de acesso. Inclui fontes de referência para pautas, tipografia, paletas, memes e canais oficiais.

A regra padrão é **CC0 ou domínio público comprovado no item**. O download automático exige CC0 explícito no Commons, Open Access do Met, CC0 nos acervos Poly Haven e ambientCG ou Aileron CC0 (ZIP oficial fixado por hash) e a dedicação oficial do conjunto fixado do Natural Earth. Domínio público histórico/governamental exige análise da jurisdição. CC BY, CC BY-SA, OFL e licenças de bancos gratuitos têm condições próprias e ficam fora da seleção estrita. Direitos de imagem, marcas, música e elementos de terceiros continuam sujeitos à conferência, sobretudo em anúncios e notícias.

## Começar pelo Codex ou Claude Code

Abra a pasta instalada como projeto. Ela inclui `.codex/config.toml` e `.mcp.json` para o servidor local `studio_curadoria`. Aceite o projeto/servidor nas opções do cliente, se solicitado. O servidor usa o Node do kit e funciona sem conta, assinatura ou chave dos provedores integrados. Em máquinas com proxy, configure o Node conforme seu ambiente. No ChatGPT sem executor local, use o catálogo embarcado para pesquisa e consulte os arquivos nas fontes oficiais.

A CLI funciona mesmo com o MCP desativado. Para obter sugestões sem executar buscas, use `sources`. Para baixar, use um projeto existente em `projects/`.

```bash
npm run curadoria -- sources --type video
npm run curadoria -- sources --type font --include-references
npm run curadoria -- search --source commons --query "heron flight" --type video --strict
npm run curadoria -- search --source polyhaven --query wood --type texture
npm run curadoria -- inspect --source met --id 436532
npm run curadoria -- download --source met --id 436532 --project meu-video
npm run curadoria -- inspect --source ambientcg --id WoodFloor051
npm run curadoria -- download --source ambientcg --id WoodFloor051 --variant WoodFloor051_1K-JPG.zip --project meu-video
npm run curadoria -- download --source naturalearth --id countries-110m --project meu-video
```

| Integração | Busca | Download |
| --- | --- | --- |
| Wikimedia Commons | API sem chave. Retorna direitos por arquivo | CC0 explícito, sem restrições reportadas |
| Poly Haven | API sem chave. Modelos, texturas e HDRI | Variante individual permitida. Conjuntos com dependências pelo botão oficial |
| ambientCG | API sem chave. Materiais, modelos e HDRI | Variante oficial, ZIP mantido fechado |
| The Met | Busca e consulta sem chave | Imagem elegível na coleção Open Access |
| Natural Earth | Conjunto fixo por palavras de mapa | ZIP oficial direto, sem API |
| Aileron | Busca no preset de fonte | ZIP oficial OTF validado por SHA-256, sem API |
| Openverse | Conector de descoberta, sujeito a disponibilidade da API | Consulte o arquivo no titular original. HTTP 403 observado no executor desta entrega |

Cada download resolve novamente a ficha oficial, limita o tamanho a 128 MiB e grava arquivo e `proveniencia.json` em uma pasta própria. A ficha registra autor, página, licença, variante, endereço original, data e SHA-256. O kit não converte nem abre automaticamente arquivos recebidos. Antes de inserir, confirme correspondência com a pauta e registre a mídia com `npm run video -- media` conforme a orquestradora.

## Fontes sem API ou com integração futura

Priorize botão oficial, link direto, lista de arquivos do titular e manifestos IIIF quando existirem. Para URLs diretas já verificadas, `curl` ou GNU Wget bastam. A automação embutida do Natural Earth usa esse princípio e não depende de programa extra.

Foram considerados [yt-dlp](https://github.com/yt-dlp/yt-dlp), [gallery-dl](https://github.com/mikf/gallery-dl) e [RipMe](https://github.com/RipMeApp/ripme). São ferramentas de transporte e os termos de cada fonte continuam aplicáveis. O kit usa os canais do YouTube para descoberta e volta ao acervo original para download. Sites que oferecem API com chave gratuita aparecem no catálogo como possíveis extensões. O instalador não pede cadastro nem implanta extratores genéricos para esses sites.

## Usos por pauta

| Pauta | Caminho sugerido |
| --- | --- |
| Notícia de clima com apresentador | Verificar data e local em NOAA/USGS. Procurar clipe elegível no Commons e produzir gráficos próprios. Identificar imagens de arquivo. |
| Explainer sobre indústria do zero | B-roll no Commons e em acervos históricos. Poly Haven e ambientCG para cenários e elementos 3D. |
| Educação e história | Met e museus para obras elegíveis. Library of Congress, Hemeroteca e arquivos nacionais para pesquisar imagens e contexto. |
| Meme entre cenas | Investigar a origem da piada. Produzir variação com clipart CC0 ou imagem própria e tipografia autorizada. |
| Paleta, fonte e dados | Usar referências de cor para desenhar uma paleta. Conferir a família tipográfica e a licença. Plotar dados com fonte, unidade e período. |

As [paletas originais CC0](../.agents/skills/video-multimarcas/references/curadoria/paletas.json) do kit acompanham o catálogo e funcionam sem internet.

## Catálogo de fontes

A política `mixed` exige verificar o item. `reference` indica descoberta ou licença fora do modo estrito. `cc0` e `pd` designam a cobertura indicada nas fontes.

| Fonte | Tipos | Política | Acesso | Como usar |
| --- | --- | --- | --- | --- |
| [Wikimedia Commons](https://commons.wikimedia.org/) · [termos](https://commons.wikimedia.org/wiki/Commons:Licensing) | image, video, audio, vector, graphics, meme | mixed | api | Busca em arquivos; confira autor, licença e origem na página de cada item. |
| [Openverse](https://openverse.org/) · [termos](https://docs.openverse.org/api/) | image, audio | mixed | api | Índice de descoberta. Abra a fonte original para confirmar o rótulo e baixar. |
| [Poly Haven](https://polyhaven.com/) · [termos](https://polyhaven.com/license) | 3d, texture, hdri | cc0 | api | Modelos, materiais e iluminação HDRI. API gratuita, inclusive comercial, com identificação da fonte. |
| [ambientCG](https://ambientcg.com/) · [termos](https://docs.ambientcg.com/license/) | 3d, texture, hdri | cc0 | api | Materiais PBR, HDRI e modelos. Escolha resolução e formato no download oficial. |
| [Kenney Assets](https://kenney.nl/assets) · [termos](https://kenney.nl/support) | image, vector, element, 3d, audio | cc0 | direct | Packs de UI, sprites, sons e 3D. Confira a indicação CC0 em cada pacote. |
| [Quaternius](https://quaternius.com/) · [termos](https://quaternius.com/faq.html) | 3d, element | cc0 | direct | Use os pacotes gratuitos com confirmação CC0 no download. |
| [OpenGameArt](https://opengameart.org/) · [termos](https://opengameart.org/content/faq) | 3d, texture, element, audio | mixed | direct | Escolha CC0 na página do ativo. Há várias licenças no acervo. |
| [Blend Swap](https://www.blendswap.com/) · [termos](https://www.blendswap.com/terms) | 3d, texture | mixed | manual | Confira licença por projeto e recursos de terceiros incorporados. |
| [Sketchfab](https://sketchfab.com/search?features=downloadable&type=models) · [termos](https://sketchfab.com/licenses) | 3d, texture | mixed | manual | Procure CC0 explícito, com arquivo baixável e titular identificado. |
| [CGBookcase](https://www.cgbookcase.com/textures/) · [termos](https://www.cgbookcase.com/about/) | texture | cc0 | direct | Texturas PBR para cenário. Confira CC0 na fonte. |
| [Texturelabs](https://texturelabs.org/) · [termos](https://texturelabs.org/license/) | texture, element | reference | manual | Termos próprios. Use como referência no modo estrito. |
| [Openclipart](https://openclipart.org/) · [termos](https://openclipart.org/share) | vector, meme, element | cc0 | direct | Clipart SVG. Confira procedência para evitar reproduções de marcas e personagens. |
| [SVG Repo](https://www.svgrepo.com/) · [termos](https://www.svgrepo.com/page/licensing/) | vector, element, graphics | mixed | direct | Confira CC0 explícito por vetor. A licença padrão da plataforma é própria. |
| [unDraw](https://undraw.co/illustrations) · [termos](https://undraw.co/license) | vector, element | reference | manual | Licença própria com condições. Referência no modo estrito. |
| [OpenMoji](https://openmoji.org/) · [termos](https://openmoji.org/about/) | vector, meme, element | reference | manual | CC BY-SA. Consulte para referência visual. |
| [PhyloPic](https://www.phylopic.org/) · [termos](https://www.phylopic.org/api/) | vector, image, graphics | mixed | api-reference | Silhuetas de espécies. Verifique CC0 por imagem. |
| [The Public Domain Review](https://publicdomainreview.org/collections/) · [termos](https://publicdomainreview.org/legal/) | image, video, text, meme | mixed | manual | Obras históricas para formatos de meme e B-roll. Confirme a reprodução original. |
| [Internet Archive](https://archive.org/) · [termos](https://archive.org/about/terms.php) | image, video, audio, meme | mixed | api-reference | Metadados não são garantia de direitos. Verifique titular, obra, trilha e gravação. |
| [Prelinger Archives](https://archive.org/details/prelinger) · [termos](https://archive.org/details/prelinger) | video | mixed | direct | Filmes históricos. Consulte licença e elementos incorporados por item. |
| [Library of Congress Free to Use and Reuse](https://www.loc.gov/free-to-use/) · [termos](https://www.loc.gov/apis/) | image, video, graphics, audio | mixed | api-reference | Leia Rights & Access e a coleção de cada item. |
| [US National Archives](https://catalog.archives.gov/) · [termos](https://www.archives.gov/research/catalog/api) | image, video, graphics | mixed | api-reference | Filmagem e documentos históricos. Confira restrições de uso e origem por registro. |
| [NASA Image and Video Library](https://images.nasa.gov/) · [termos](https://www.nasa.gov/nasa-brand-center/images-and-media/) | image, video, graphics | mixed | api-reference | Espaço e ciência. Verifique material de terceiros, pessoas e restrições de marca/uso promocional. |
| [NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/) · [termos](https://svs.gsfc.nasa.gov/help/) | video, graphics, image | mixed | direct | Visualizações científicas. Confira créditos, áudio e fontes em cada item. |
| [NOAA Photo Library](https://photolib.noaa.gov/) · [termos](https://www.noaa.gov/disclaimer) | image, video, graphics | mixed | manual | Clima, oceano e fauna. Confira exceções de terceiros e créditos. |
| [USGS Multimedia Gallery](https://www.usgs.gov/products/multimedia-gallery) · [termos](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) | image, video, graphics | mixed | manual | Geologia, mapas e natureza. Confira exceções por item. |
| [CDC Public Health Image Library](https://phil.cdc.gov/) · [termos](https://phil.cdc.gov/FAQ.aspx) | image, video | mixed | manual | Saúde pública. Verifique aviso de copyright e uso de imagem. |
| [Smithsonian Open Access](https://www.si.edu/openaccess) · [termos](https://www.si.edu/openaccess/faq) | image, 3d, graphics | mixed | api-reference | Use somente itens explicitamente CC0. API oficial pode exigir chave gratuita. |
| [The Met Open Access](https://www.metmuseum.org/policies/image-resources) · [termos](https://metmuseum.github.io/) | image, texture, graphics | mixed | api | Seleção Open Access em CC0. API sem chave para objetos e imagens elegíveis. |
| [Art Institute of Chicago](https://www.artic.edu/open-access/open-access-images) · [termos](https://api.artic.edu/docs/) | image, texture, graphics | mixed | api-reference | Apenas reproduções marcadas como abertas. Confira is_public_domain e créditos. |
| [Rijksmuseum](https://www.rijksmuseum.nl/en/rijksstudio) · [termos](https://data.rijksmuseum.nl/) | image, graphics, texture | mixed | api-reference | Confirme direitos da obra e da imagem. Use os links/IIIF oficiais. |
| [Europeana](https://www.europeana.eu/) · [termos](https://www.europeana.eu/en/rights) | image, video, graphics, 3d | mixed | api-reference | Filtro CC0 ou domínio público no item do provedor. Acesso a certas APIs exige chave. |
| [Wellcome Collection](https://wellcomecollection.org/works) · [termos](https://developers.wellcomecollection.org/) | image, graphics, video | mixed | api-reference | Medicina, ciência e história. Material em domínio público convive com outros termos. |
| [Biblioteca Nacional Digital Brasil](https://bndigital.bn.gov.br/) · [termos](https://bndigital.bn.gov.br/) | image, graphics, text | mixed | manual | Brasil histórico. Confira direitos do item, da edição e da digitalização. |
| [Hemeroteca Digital Brasileira](https://bndigital.bn.gov.br/hemeroteca-digital/) · [termos](https://bndigital.bn.gov.br/) | image, text, graphics | mixed | manual | Pesquise notícias de época. Confira cada texto, fotografia e ilustração antes de reutilizar. |
| [NYPL Digital Collections](https://digitalcollections.nypl.org/) · [termos](https://www.nypl.org/research/collections/digital-collections/public-domain) | image, graphics, meme | mixed | api-reference | Busque itens marcados public domain. Confira a jurisdição. |
| [Natural Earth](https://www.naturalearthdata.com/downloads/) · [termos](https://www.naturalearthdata.com/about/terms-of-use/) | vector, graphics | pd | direct | Mapas vetoriais e raster dedicados ao domínio público. |
| [US Census Bureau Data](https://data.census.gov/) · [termos](https://www.census.gov/data/developers/data-sets.html) | data, graphics | mixed | api-reference | Dados oficiais para gerar gráficos originais. Verifique nota de terceiros e data. |
| [IBGE SIDRA](https://sidra.ibge.gov.br/) · [termos](https://apisidra.ibge.gov.br/) | data, graphics | reference | api-reference | Dados brasileiros para gráfico próprio. Registre tabela, período, metodologia e fonte. |
| [World Bank Open Data](https://data.worldbank.org/) · [termos](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets) | data, graphics | reference | api-reference | Dados com atribuição e exceções específicas. Consulte para pesquisa. |
| [Our World in Data](https://ourworldindata.org/) · [termos](https://ourworldindata.org/faqs) | data, graphics | reference | api-reference | Confira créditos e licenças do gráfico e de cada fonte de dados. |
| [Google Fonts](https://fonts.google.com/) · [termos](https://developers.google.com/fonts/faq) | font | reference | direct | Fontes gratuitas com licenças diversas. OFL é licença aberta com condições, consulte em modo referência. Solicite escopo explícito antes de usar. |
| [Font Squirrel](https://www.fontsquirrel.com/) · [termos](https://www.fontsquirrel.com/faq) | font | reference | manual | Confira a licença da família e condições de incorporação e redistribuição. |
| [SIL Open Font License](https://openfontlicense.org/) · [termos](https://openfontlicense.org/ofl-faq/) | font | reference | manual | Guia de uso, incorporação e redistribuição. A OFL permite produzir vídeo comercial, observadas suas condições. |
| [Lospec Palette List](https://lospec.com/palette-list) · [termos](https://lospec.com/) | color | reference | manual | Use códigos de cor como referência para montar paleta própria. Confira direitos antes de reutilizar arquivos ou composições. |
| [ColorBrewer](https://colorbrewer2.org/) · [termos](https://colorbrewer2.org/) | color, graphics | reference | manual | Referência de contraste e cores para mapas. Crie sua paleta e confira os termos da implementação antes de redistribuir. |
| [Pexels](https://www.pexels.com/) · [termos](https://www.pexels.com/license/) | image, video | reference | api-reference | Gratuito sob licença própria. API oficial com chave e condições. |
| [Pixabay](https://pixabay.com/) · [termos](https://pixabay.com/service/license-summary/) | image, video, audio, vector | reference | api-reference | Licença própria e restrições de redistribuição. API com chave. |
| [Unsplash](https://unsplash.com/) · [termos](https://unsplash.com/license) | image | reference | api-reference | Consulte a licença própria e as regras da API. Para reutilização estrita, procure item equivalente CC0. |
| [Mixkit](https://mixkit.co/) · [termos](https://mixkit.co/license/) | video, audio, element | reference | manual | Licenças variam por categoria e clipe. Pesquise por referência. |
| [NASA no YouTube](https://www.youtube.com/@NASA) · [termos](https://www.youtube.com/t/terms) | video | reference | manual | Use para localizar pauta e contexto. Busque o arquivo original no acervo NASA e valide os direitos. |
| [NOAA no YouTube](https://www.youtube.com/@NOAA) · [termos](https://www.youtube.com/t/terms) | video | reference | manual | Use como referência e procure o original no acervo oficial. |
| [US National Archives no YouTube](https://www.youtube.com/@USNationalArchives) · [termos](https://support.google.com/youtube/answer/2797468) | video | reference | manual | Verifique o original no catálogo NARA. Licença padrão e CC BY do YouTube têm escopos diferentes. |
| [Know Your Meme](https://knowyourmeme.com/) · [termos](https://knowyourmeme.com/terms-of-service) | meme, text, image | reference | manual | Pesquise origem e contexto da piada. Refaça o conceito com mídia própria ou CC0, sem copiar a imagem do meme. |
| [Freesound](https://freesound.org/) · [termos](https://freesound.org/help/faq/) | audio | mixed | api-reference | Filtre CC0 e confira o item. API oficial com credenciais. |
| [Flickr Commons](https://www.flickr.com/commons) · [termos](https://www.flickr.com/commons/usage/) | image, graphics, meme | mixed | api-reference | Sem restrições conhecidas é evidência de busca, insuficiente para liberação automática. |
| [Encyclopedia of Life](https://eol.org/) · [termos](https://eol.org/docs/what-is-eol/what-is-eol) | image, video, graphics | mixed | manual | Verifique a licença do item de biodiversidade e o provedor original. |
| [Aileron (Dotcolon)](https://dotcolon.net/fonts/aileron/) · [licença CC0](https://fontsource.org/fonts/aileron/about) | font | cc0 | direct | Família OTF de Sora Sagano com ZIP oficial fixado por hash. |
