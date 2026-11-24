# Arsenal de receitas (fonte para a unificação com o zapvideo)

Cópia dos arquivos-fonte da página "Arsenal zapvideo", criada no Claude em 24/11/2026
(https://claude.ai/artifact/3Dqkf43S5bMPt2cUMnNghL). Serve de referência para levar ao
zapvideo.com.br a jornada **receita + estilo**, a geração de pauta, os links, a orquestração
do prompt e as animações. Não é código de produção: é material de referência.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `fonte/recipes-1-base-e-conflitos.js` | Primeiras 39 receitas, grupos antigos e `conflicts(set)`, as regras de conflito entre ferramentas |
| `fonte/recipes-2-engajamento.js` | 11 receitas de engajamento (Instagram e TikTok) e `RX`, com as entradas e perguntas próprias das receitas anteriores |
| `fonte/recipes-3-apresentador.js` | 6 receitas de apresentador interativo (referências da coleção Apresentações) e as cenas `orbit` e `stepsp` |
| `fonte/recipes-4-grupos.js` | Grupos por intenção (`GROUPS`) aplicados às 56 receitas |
| `fonte/tools.js` | Registro das 107 ferramentas: `D = [id, categoria, tipo, nome, comando, "prévia1,prévia2", descrição, exemplos[], aviso]` e categorias `CAT` |
| `fonte/scenes.js` | Cenas SVG animadas (`scene(k)`, `pv(k)`), 9:16, com gradientes compartilhados em `DEFS` |
| `fonte/app.js` | Interface: busca com sinônimos, receitas em Stories (3 etapas), seleção, perguntas (`questions`, `mergeQ`, `TAGS`), `build()` do prompt para Claude Code, Claude.ai e ChatGPT, pauta (`PMODES`, Firecrawl search/scrape e geração com IA), links, conflitos |
| `fonte/styles.css` | Tokens zapvideo, componentes e keyframes das cenas (`.sc`, `.story`, `a-*`) |
| `fonte/markup.html` | Marcação das seções (topo, busca, receitas, ferramentas, barra de seleção e painel) |
| `referencia/arsenal-publicado.html` | Página publicada, completa (abre localmente no navegador) |
| `referencia/hero.webp` | Imagem do topo gerada com IA |

## Formato de uma receita

`[id, título, descrição, ferramentas[], objetivo-modelo, etapas[[cena, legenda, ferramentas]], grupo, entradas[], perguntas[[pergunta, opções[], múltipla?]], porquê, urlReferência, nomeEstiloReferência]`

O prompt é gerado por `build()` em `app.js`. A ordem é: objetivo → receita e por que funciona → etapas → o que enviar → links para puxar material → ferramentas (skills com `/comando`) → conectores → conflitos → perguntas em pop-up (as da receita primeiro, depois as gerais sem repetir tema) → regras de aprovação e custo.
