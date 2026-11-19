# DiSteven

O DiSteven é a galeria do Studio Kit Pro. Comece pelo que seu vídeo precisa comunicar: **Explicar**, **Apresentar** ou **Vender**. Esses objetivos organizam as referências; não mudam um pedido que você já preparou.

1. Se quiser, escolha seu segmento em **Todos os nichos**.
2. Deslize as imagens de uma coleção para os lados. No computador, você também pode usar as setas.
3. Toque em **Ver coleção** para explorar todas as referências em duas colunas no celular. Abra uma imagem para examiná-la em tamanho maior.
4. Abra uma referência para entender seus quatro momentos. São estudos visuais; um vídeo pronto aparece apenas quando houver uma amostra identificada.
5. Toque em **Adicionar +**. Em **Minha escolha**, confira as referências e decida quais características quer aproveitar de cada uma.
6. Toque em **Continuar** e siga as perguntas para preparar seu vídeo.

A busca encontra assuntos, nichos, objetos, efeitos e palavras-chave no catálogo. Ao começar uma busca, o DiSteven sai da coleção e do nicho para procurar em todas as categorias. Os filtros explícitos, como Favoritos, continuam identificados na tela. O botão de categorias, no topo, também permite acessar o catálogo completo, os favoritos e a instalação.

Abrir um grupo no menu mostra suas opções. Escolher uma categoria final fecha o menu e abre os estilos correspondentes. O botão **Voltar** retorna às coleções. **Ajuda** explica a instalação e o uso, inclusive para quem está começando.

## Implementation notes

`disteven-model.js` is the pure discovery taxonomy; every catalogue family is reachable in each goal. `disteven-ui.js` adapts the existing search, selections, contributions and workflow. `disteven.css` contains the additive responsive theme; it does not recolor the style references themselves. The mark is an original vector interpretation of the selected folded-paper concept; Source Serif 4 and Geist use the existing licensed font assets.

Each preview frame follows the original artwork’s proportions, including wide panels. The complete panel fills its frame without cropping or stretching. The reference label sits below the image so it cannot hide artwork. On mobile, the shelves and opened collections show two complete columns. Source assets remain unchanged: full panels remain available in the detailed viewer and exported references. Discovery goals, category filters and niche choices never grant approvals or change a saved production brief.

Local preview: `npm ci`, then `npm run atlas`, then open `http://127.0.0.1:8770`.
