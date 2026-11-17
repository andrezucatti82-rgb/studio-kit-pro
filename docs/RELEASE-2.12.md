# Studio Kit Pro 2.12.0 — entrega publicada

A versão 2.12.0 está publicada em [GDA Vídeos](https://videos.gerenciadordeanuncios.com.br/?v=2.12.0#instalar). A [PR #20](https://github.com/andrezucatti82-rgb/studio-kit-pro/pull/20) foi integrada por `054ebcc143ef2f6a99ac9dba6fcfc55132dc6597`, com autorização de publicação. O site oferece um instalador compacto único e o tutorial de uso.

## Ampliação comercial do catálogo 4.8

A ampliação mantém o runtime 2.12.0 e reúne 1.425 estilos em sete categorias principais, incluindo 265 explicadores em 53 segmentos. São 205 direções comerciais adicionais, com referências fictícias ultrarrealistas, construção da informação por fala/ação, profundidade e variações de câmera. A categoria Apresentador + explicação tem acesso próprio; os 1.220 IDs anteriores são preservados. Veja [direção e limites da coleção](PRESENTER-COMMERCIAL.md).

A apresentação dos painéis completos foi uniformizada em cartões, categorias, comparação, seleção e assistente guiado. Isso padroniza a navegação sem impor um layout criativo único aos estilos. A documentação, os prompts e os pacotes são gerados das fontes canônicas. A evidência abaixo descreve a publicação inicial 4.7; não deve ser atribuída aos novos estilos.

## Validação da ampliação 4.8

A regressão passou em **215 testes JavaScript e 9 Python**, além da checagem TypeScript e validação do projeto. Os testes conferem os 5.700 endereços de quadros, os originais e as máscaras/tempos desconhecidos, sem certificar execução audiovisual das receitas.

No navegador real, os 1.425 cartões e os 53 filtros setoriais foram conferidos a 1440 e 375 px: arquivos carregados, estágios consistentes por tamanho de tela, quadros completos e proporções preservadas. Comparação, seleção, briefing, bandeja e assistente também passaram pela conferência de encaixe. Os dez maiores pedidos completos foram exportados e importados com escopos distintos em 1.063.980 bytes, abaixo do limite de 2 MiB do importador.

As prévias dos 60 PNGs anteriores passaram de 141.259.055 para 14.414.986 bytes em WebP, com mesmas dimensões/enquadramento e originais preservados. Os exemplos guiados foram alinhados ao catálogo 4.8; geradores históricos não podem sobrescrever o acervo ampliado. [Recibo da ampliação e verificações de instalação/publicação](https://github.com/andrezucatti82-rgb/studio-kit-pro/blob/main/dist/atlas-4.8-verification.json).

## O que foi publicado inicialmente

- Catálogo 4.7: 1.220 estilos, 30 subcategorias e seis categorias principais.
- 60 explicadores em 17 segmentos, com referências fotorrealistas fictícias e quatro momentos por estilo; composição, fala, informação e participação da pessoa seguem no prompt/JSON.
- Busca local com tags internas nos 1.220 estilos, sinônimos, acentos, plurais e termos combinados. Cachorro/cão/cães encontram 39 direções; gato encontra quatro; aquário encontra uma. É possível refinar por categoria sem perder o projeto.
- Sete skills locais: orquestração, planejamento, explicador, publicidade, edição, tratamento e revisão. O instalador obtém o projeto completo do GitHub, confere hashes, prepara dependências e orienta o uso no Codex ou Claude Code.

## Evidências da publicação inicial

A publicação inicial usou a pasta imutável `atlas-20261117103619`. O HTML anterior foi salvo fora da área pública e conferido por leitura de volta; a versão anterior permanece preservada. Foram conferidos por leitura pública os hashes de 730 arquivos novos/alterados e 29 amostras visuais copiadas da base anterior. O resumo técnico está em [registro de publicação](../style-atlas/records/releases/2.12.0-publication.json).

Antes e depois da troca da página principal, Chromium em 375/1440 px verificou HTTP 200, runtime 2.12.0, catálogo 4.7, resultados de busca, os 60 explicadores, os quatro momentos, download PNG do painel completo, prompt/JSON com tratamento, download real do ZIP com hash e abertura do tutorial. Não houve erros JavaScript nesses percursos. A regressão da implementação passou em 206 testes JavaScript e 9 Python; testes de integridade também conferem skills, plugins e runtime.

O instalador é fixado a uma revisão de fonte. Consulte `sourceRevision`, `sha256` e `verification` em `style-atlas/dist/installation.json` e o manifesto dentro do ZIP. A revisão do instalador pode ser anterior ao commit que registra a publicação: isso mantém o pacote reproduzível e não indica versão funcional diferente. Atualizações documentais posteriores preservam o código de produção e atualizam as cópias distribuídas a partir das fontes canônicas.

## Limites que continuam válidos

A publicação do site não é aprovação de 265 vídeos. Referências estáticas fictícias não comprovam movimento, áudio, sincronismo, identidade ou afirmações técnicas. Cada produção ainda precisa dos originais, dados reais e aceites aplicáveis à sua versão.

A instalação e a inicialização do runtime foram verificadas em Linux. Windows/macOS têm wrappers e instruções, mas ainda não receberam testes nativos nesta entrega. Preparação de dependências ausentes, bootstrap portátil e abertura automática do tutorial no sistema não foram exercitados nos testes que já possuíam os pré-requisitos. O recibo identifica a origem exata de cada verificação.

Contas, logins e créditos não são transferidos pelo pacote. ASR, matting, detector de gestos e 3D universal não são instalados apenas por escolher um estilo. Consulte a [matriz de tratamento](VIDEO-TREATMENT-AUDIT.md) e o [guia de instalação](INSTALL-SKILL.md). Não foram usadas APIs pagas nesta publicação.
