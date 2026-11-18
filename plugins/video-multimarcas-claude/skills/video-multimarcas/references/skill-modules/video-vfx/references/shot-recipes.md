# Receitas de VFX por plano

São procedimentos de planejamento/execução, não presets já renderizados. Registre versão do aplicativo, parâmetros usados, teste e evidências no projeto. Nomes e recursos variam por edição.

## A · Substituição de tela, placa e logo

**Entradas:** plate original, conteúdo autorizado, frame range/fps, invariantes de UI e superfície. **Rota:** tracker planar no plano físico; corner pin/homografia para inserir conteúdo. Use tracking de objeto/malha quando a superfície deformar; solve 3D quando a geometria exigir. Quatro cantos visíveis não são requisito de tracking planar em todo frame, mas regiões ocultas exigem continuidade e teste.

1. Inspecione distorção, blur, reflexos e obstrução. Escolha frame de referência nítido e região coplanar com textura; exclua mão, reflexos móveis e elementos em outra profundidade.
2. Trackeie ida/volta e confira a superfície com grade. Se o track falhar, corrija por trechos/keyframes apoiados em frames válidos. Não invente aderência no intervalo totalmente oculto.
3. Corner pin do conteúdo com proporção e enquadramento certos. Controle brilho/contraste e pretos para a tela fotografada; mantenha texto/interface editáveis quando solicitados.
4. Rotoscopia da mão/dedos e bordas do dispositivo como holdout, com feather e blur coerentes. Organize conteúdo abaixo do holdout; recupere reflexos/vidro por ramo separado quando disponíveis, sem duplicar a imagem antiga.
5. Ajuste foco, motion blur, lente e grão. Confira se conteúdo, mão e reflexos seguem o mesmo espaço/movimento.

**Aceitação:** grade e conteúdo aderem por todo o trecho, sem saltos nos frames corrigidos; dedos permanecem à frente; vidro/reflexos coerentes; bordas sem halo e UI legível. Se não houver plate, entregar apenas breakdown e pedido de material.

## B · Chroma key, roto e extração

**Entradas:** plate e fundo pretendido. Determine se há tela verde/azul utilizável, diferença de foco, spill, compressão e transparências.

1. Garbage matte elimina áreas externas; selecione key evitando destruir cabelo e blur.
2. Separe core matte sólido e edge matte para detalhe, inspecionando alpha e RGB. Use holdouts para áreas que precisam permanecer opacas.
3. Despill corrige contaminação sem descolorir roupas/pele deliberadamente verdes. Reconstrua bordas e RGB quando necessário, preservando transparências.
4. Sem chroma adequado, use roto manual/assistida; propague por trechos e corrija mudanças de topologia, cruzamentos de mãos, cabelo e objetos finos.
5. Integre iluminação e contato ao novo fundo; avalie matte sobre preto/branco/cinza e no fundo final em playback.

**Aceitação:** sem chattering, buracos, bordas duras indevidas, fringe ou recorte de motion blur. Ferramenta IA ter terminado a propagação não comprova matte correto.

## C · Remoção de objeto e clean plate

1. Delimite o objeto, sua sombra/reflexo e o fundo que precisa aparecer. Procure informação real em frames vizinhos ou clean plate fornecido.
2. Estabilize/trackeie o fundo. Faça patch/paint no domínio adequado e devolva o movimento; para paralaxe, separe planos/projeções 3D.
3. Reconstrua textura, iluminação, defocus e grão, mantendo o foreground e oclusores em camadas.
4. Inpainting IA pode auxiliar um asset de fundo autorizado, mas exige continuidade e fidelidade verificadas. Se faltarem dados para reconstruir algo factual, declare a reconstrução; não invente produto, arquitetura ou conteúdo documental.
5. Examine início/fim do patch, revelações, reflexos e sombras em loop e velocidade normal.

**Aceitação:** sem repetição perceptível de textura, fervura temporal, ghosting, salto de perspectiva ou sombra residual. Um frame limpo não prova um plano limpo.

## D · Objeto CG, matchmove e integração 3D

1. Determine se há paralaxe suficiente para solve de câmera; em pan puro ou baixo detalhe, avalie solução de rotação/planar com limites explícitos.
2. Trackeie pontos estáticos distribuídos no quadro e em profundidade, removendo outliers e objetos móveis. Resolva câmera/lente com parâmetros conhecidos e confira distorção/rolling shutter.
3. Oriente chão, origem e escala; coloque grade/cubo de teste. Reproduza todo o plano: não pode deslizar, flutuar ou mudar perspectiva. Erro médio em pixels é diagnóstico, **não prova**; não imponha limiar universal independente da resolução/cena.
4. Modele geometria de contato/oclusão suficiente. Use HDRI/referências quando existentes; ajuste luz, sombra, bounce e reflexos segundo o plate.
5. Renderize beauty e passes necessários (por exemplo alpha, shadow, diffuse/specular, emission, Z e Cryptomatte), registrando convenções. Não some passes que duplicam contribuições nem aplique transform de cor a dados.
6. Componha em espaço linear comum; ajuste contato, atmosfera, foco, blur e textura. Shadow catcher não substitui reflexão e luz interativa quando visíveis.

**Aceitação:** alinhamento em profundidade e contato estáveis, oclusões corretas, luz/lente compatíveis e cor consistente entre DCC/compositor/editor. Sem geometria/ângulos de produto real, não prometer rotação fiel de 360°.

## E · Fumaça, fogo, explosões, partículas e clima

**Decisão:** elementos 2D são adequados quando câmera, perspectiva e interação são compatíveis. Volume/simulação 3D é indicado para câmera atravessando, paralaxe forte, interação física, colisões ou luz volumétrica necessárias. Não chamar billboard de simulação volumétrica.

1. Fixe escala, direção do vento/gravidade, origem, duração, densidade e comportamento. Verifique licença, resolução, fps, premult e se elemento filmado sobre preto representa emissão ou opacidade.
2. **Produto protegido:** mantenha original/rótulo em ramo protegido; separe fumaça atrás e à frente com holdout/depth masks. Não regenere o produto para acomodar o efeito. Contorno plausível não equivale a simulação de colisão.
3. Para elemento 2D, ajuste perspectiva e tempo dentro de limites; repetir/esticar excessivamente denuncia o asset. Over/alpha para fumaça opaca; adição de emissão quando fisicamente apropriada. Screen não é substituto universal de composição.
4. Para 3D, teste solver em baixa resolução, unidades/escala, timestep/substeps, colisores e forças; fixe seed e cache antes de escalar. Água/destruição/cabelo/tecido exigem estudo próprio de solver, materiais, contato e orçamento.
5. Integre extinção/oclusão, luz interativa, sombras, reflexos e atmosfera quando cabíveis. Fogo brilhante sem iluminar ambiente pode parecer colado; fumaça opaca não emite luz por padrão.
6. Renderize passes/caches necessários, preserve originais e revise flicker, repetição, volume e contato no tempo.

**Aceitação:** comportamento e escala críveis, oclusões coerentes e invariantes preservadas. Sem DCC verificado, preparar plano/receita; não declarar simulação executada. FX digitais não autorizam instruções de pirotecnia real.

## F · Céu, matte painting e extensão de cenário

Trackeie câmera/planos; recorte skyline/vegetação; escolha céu com horizonte, direção de luz e exposição compatíveis. Em pan distante, projeção simples pode bastar; com translação/paralaxe, use camadas/projeções/3D sustentadas pela cobertura. Integre haze, reflexos, bordas, movimento atmosférico e grão. Para imóvel real, preserve volumetria/entorno e identifique alterações conceituais; não invente vista vendável.

**Aceitação:** sem horizonte deslizante, bordas fervendo ou escala atmosférica incompatível. Reveja reflexos e vazios que surgem na câmera.

## G · Energia, portal, holograma e passagem estilizada

Defina estado inicial → transformação → resultado e função narrativa. Combine geometria/máscaras, distorção, partículas/emissão e oclusão. Faça luz interativa e som motivados; reserve leitura da marca/texto. Glow e flare devem responder a fontes e câmera, sem esconder falhas. Travessia de portal precisa de entrada/saída espacialmente compatíveis e prova em movimento; círculo mascarado em foto é outra proposta e precisa ser apresentado como mudança.

**Aceitação:** ação compreensível, continuidade espacial, ausência de cortes acidentais e flashes excessivos; invariantes e texto legível. Linguagem estilizada muda o alvo estético, não elimina QA temporal.
