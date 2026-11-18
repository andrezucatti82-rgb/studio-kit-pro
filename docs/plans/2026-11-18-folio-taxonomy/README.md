# Planejamento da navegação por objetivo

Status: proposta editorial; a nova taxonomia não está aplicada ao site. A escolha do usuário é navegar pelo objetivo do vídeo. Este levantamento cobre os 1.425 registros do catálogo 4.8 e usa seus textos e contratos; não houve inspeção visual individual dos 5.700 quadros nesta etapa.

## O que muda

O menu deixa de misturar objetivo, mercado e técnica. Vender, Explicar, Apresentar, Ensinar, Contar histórias e Divulgar são os seis destinos principais. Segmentos, linguagens visuais, presença de apresentador e recursos tornam-se filtros transversais. Um estilo pode ter vários segmentos e linguagens quando houver justificativa; os nomes desses filtros também devem ser unificados com aliases. A ficha do estilo é única: ela pode estar ligada a vários objetivos e subcategorias, usando o mesmo ID, imagens, favoritos e pedido.

| Objetivo | Subcategorias propostas |
| --- | --- |
| Vender | Ofertas e promoções; Produto em uso; Diferenciais e benefícios; Decisão de compra |
| Explicar | Como funciona; Processos e etapas; Ideias e conceitos; Dados e comparações |
| Apresentar | Negócio e equipe; Produtos e serviços; Imóveis e espaços; Projetos e portfólio |
| Ensinar | Tutoriais práticos; Cuidados e orientações; Aulas e métodos; Dúvidas e mitos |
| Contar histórias | Bastidores e rotina; Histórias de pessoas; Histórias de marca; Experiências e lugares |
| Divulgar | Lançamentos; Eventos e datas; Novidades e avisos; Convites e chamadas |

## Como separar os objetivos

- Vender: ajudar uma decisão comercial com oferta, uso, benefício ou comparação verificável. Serviço jurídico informativo não recebe automaticamente classificação de venda.
- Explicar: fazer a pessoa compreender um funcionamento, processo, conceito ou relação entre dados.
- Apresentar: mostrar quem é o negócio, o que oferece, seus projetos ou um espaço.
- Ensinar: dar condições de realizar uma ação ou aprender um método; explicar um conceito não basta para chamar algo de tutorial.
- Contar histórias: organizar uma experiência em acontecimentos, pessoas, conflitos ou bastidores.
- Divulgar: comunicar lançamento, evento, novidade ou convite. Um mesmo vídeo de lançamento pode ter também o objetivo Vender.

## Associações e deduplicação

Um estilo com dentista e implante pode aparecer em Explicar → Como funciona e em Apresentar → Produtos e serviços, quando o registro sustentar essas funções. Dentistas fica no filtro de segmento; apresentador no filtro de linguagem; implante e camadas são termos de busca. A maquete de um imóvel pode aparecer em Apresentar → Imóveis e espaços e Explicar → Como funciona. A associação não cria uma segunda ficha nem habilita combinar estilos no pedido.

A contagem total do catálogo usa IDs únicos. Dentro de cada objetivo/subcategoria, o resultado também é deduplicado. As contagens dos grupos podem somar mais de 1.425 porque existem associações cruzadas. Busca, favoritos e projeto salvo apontam para a ficha canônica.

## Nomenclatura

Nome de estilo deve indicar o que acontece e o recurso que o diferencia, sem empilhar benefícios vagos. O segmento aparece no nome quando for necessário para entender a cena. Técnicas conhecidas podem permanecer como alias e filtro. Nomes atuais e IDs continuam aceitos na busca, URLs, prompts e projetos anteriores.

| Atual | Proposta |
| --- | --- |
| Noir | Sombras e mistério em preto e branco |
| Trim paths | Linhas que desenham a informação |
| Clay render | 3D com acabamento de argila |
| Planta em vidro | Planta do imóvel em vidro |
| Endereço editorial | Imóvel com títulos atrás do apresentador |
| Maquete na palma | Maquete do imóvel na palma |
| Detalhes que fazem sentido | Detalhes do imóvel ativados pelo gesto |
| Sorriso em etapas | Consulta odontológica explicada por etapas |

## Resultado da triagem completa

- 1425 fichas analisadas textualmente; nenhum ID ou nome atual duplicado.
- 694 fichas com sugestão de mais de um objetivo, sustentada pelos sinais textuais usados na triagem.
- 26 propostas iniciais de alteração de nome; a matriz conserva nome atual e aliases.
- 257 casos destacados para revisão editorial, incluindo 185 sem objetivo suficiente no texto. Esses casos ficam sem associação proposta, em vez de serem empurrados para uma categoria.

A pontuação em matrix.json serve para priorizar curadoria. Ela não confirma relação semântica, aparência, qualidade do estilo ou autorização de produção. Nomes curtos de algumas receitas com apresentador também foram destacados por falta de contexto. As 185 pendências fazem parte do planejamento da migração; não estão aprovadas para publicação.

## Contrato de dados para implementação

Separar category/subcategory da família técnica e do segmento. Manter o ID atual e o registro completo de produção. A camada de descoberta terá: objectives, memberships com categoryId/subcategoryId, segments, visualLanguages, resources, displayName e aliases. Cada vínculo publicado precisa de justificativa editorial ligada à ficha. Um estilo pode ter mais de uma subcategoria no mesmo objetivo quando as duas forem verificadas; o limite de três objetivos na triagem é apenas um corte de apresentação, não uma limitação do modelo final.

Não reinterpretar a família antiga como objetivo. Os campos antigos continuam disponíveis para importação, requisitos específicos e contratos do runtime. Um alias muda a apresentação, não a identidade nem os fatos sobre pessoas, produtos ou imóveis.

## Ordem da migração e critérios de aceite

1. Fechar o dicionário dos seis objetivos e 24 subcategorias; testar rótulos com tarefas reais de negócios.
2. Revisar a matriz completa e resolver os casos destacados: conferir mecanismo nas imagens/receita, confirmar usos comerciais e propor nome/objetivo quando o cadastro não os explica.
3. Aprovar vínculos e nomes por ficha. Nenhum estilo pode entrar ao vivo por um fallback automático; todos devem ter pelo menos uma relação confirmada, com aliases e IDs preservados.
4. Implementar os vínculos como metadados independentes, com leitura compatível de URLs e projetos antigos.
5. Validar cada objetivo, subcategoria, filtros cruzados, busca pelos nomes novos/antigos, contagens únicas, favoritos e retomada do pedido. Conferir os 1.425 estilos na auditoria de cobertura e a navegação em celular/tablet/computador.
6. Publicar uma prévia da nova organização e revisar navegação/nomes antes de substituir o menu atual. Pacotes e prompts seguem a mesma versão de taxonomia; o briefing continua com um estilo por vídeo.

Arquivos: [matriz de revisão CSV](matrix.csv), [matriz com evidências JSON](matrix.json), [inventário atual](inventory.json) e [gerador da triagem](prepare-plan.py).
