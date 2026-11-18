# Fundamentos de composição e cor

## Contrato de entrada

Plate = filmagem base; clean plate = reconstrução sem o elemento removido; matte = cobertura/seleção; holdout = máscara de elemento que oclui outra camada. Distinga tracking de ponto, tracking planar, tracking de objeto e solve de câmera 3D. Movimento aparente em tela pode ter múltiplas soluções; paralaxe, lente e referências de chão ajudam a testar a coerência.

Registre fps como razão quando necessário (por exemplo 30000/1001), resolução, pixel aspect, orientação, primeiro/último frame **inclusivos**, timecode e handles antes/depois. Não faça optical flow, interpolação ou conversão de fps implicitamente. Câmera de telefone pode ter frame rate variável, estabilização e rolling shutter; compare tempos e teste o conform antes do tracking.

A seleção de rota precisa considerar: movimento, paralaxe, oclusão, compressão, textura trackeável, blur, reflexos e material transparente. Solicite metadados de lente, sensor, distância e escala apenas quando afetarem solve/integração. Na captação, planeje clean plates, referência de exposição/cor, lente, chão, HDRI e esferas cinza/cromada quando pertinentes. Não exigir nova filmagem se os materiais já resolverem.

## Cor: planejar antes de mesclar

1. Identifique a interpretação **real** por metadados, documentação e origem: primárias, curva de transferência, range, white point e exposição quando conhecidos. Não adivinhe log de câmera nem atribua ACEScg a todo EXR.
2. Escolha um espaço de trabalho scene-linear adequado ao projeto. ACES com OCIO é uma rota; não é obrigação universal. Registre configuração OCIO e versão, transforms de entrada, view/display e transform de saída. OCIO gerencia transforms; não é sinônimo de ACES nem LUT de look.
3. Converta plate e CG de seus espaços conhecidos para o espaço comum. Material já display-referred pode não permitir recuperar valores scene-linear originais; documente essa limitação. Rec.709 pode designar primárias/contextos diferentes: confirme curva, faixa e exibição pretendida.
4. Componha luz e cobertura em linear. A transformação de monitor serve para visualizar; evite gravá-la no EXR intermediário ou aplicá-la novamente na montagem.
5. Para preview SDR, aplique uma única transformação de saída acordada e metadados corretos; compare com o compositor e editor. Para master/passes scene-linear, preserve dados e declare o transform necessário para exibir.

Texturas de cor recebem interpretação apropriada; Z, normal, motion vector, posição, IDs e mattes são **dados**, sem view transform/grade criativo. Não normalize Z automaticamente; documente unidade e convenção de profundidade. Não faça grade de passes de IDs/Cryptomatte.

## Alpha e premultiplicação

Alpha descreve cobertura/transparência segundo o contrato do asset; confirme straight/unassociated versus premultiplied/associated. Para foreground RGB premultiplicado, a operação over é `Cout = Cfg + Cbg * (1 - Afg)`; `Aout = Afg + Abg * (1 - Afg)`. Não multiplique alpha novamente em foreground já premultiplicado.

Quando uma correção de cor exige RGB straight: unpremultiply → correção → premultiply, usando a convenção correta e proteção em alpha zero. Filtros e transforms podem exigir outra ordem conforme o nó/host; consulte documentação e teste bordas sobre preto, branco e cinza. Não aplicar essa cadeia indiscriminadamente a todo nó. RGB em áreas de alpha zero pode conter valores úteis ou lixo; bordas escuras/coloridas também podem vir de filtro, fringe, key ou interpretação de cor.

OpenEXR oferece canais e precisão apropriados a intermediários VFX. Half-float pode ser adequado para cor; dados que exigem mais precisão precisam de formato acordado. Formato EXR não garante profundidade de bits, canais, compressão ou espaço corretos. Prefira compressão sem perdas quando o contrato de passes/dados exigir; confira nomes, data/display windows e overscan. PNG pode servir a elementos gráficos, mas não substitui toda a faixa dinâmica de CG.

## Ordem de trabalho

Ingest/conform → preparação/denoise se necessário → tracking/lente → roto/key/cleanup → integração/grade local → defeitos ópticos coerentes → textura/grão → output. Preserve um ramo original para referência. Se reduzir ruído para comp/tracking, reintroduza textura coerente ao final; não denoise repetidamente sem avaliar perdas.

Workflow de lente: resolver/calibrar distorção → trabalhar no domínio sem distorção com overscan → comp → redistorcer para plate original. Se trabalhar diretamente no plate distorcido, leve CG e transforms para o mesmo domínio; não misture os dois workflows nem redistorça o plate duas vezes. Reamostragem altera nitidez: agrupe transforms compatíveis.

Confirme perspectiva/escala/contato antes de grade e glow. Combine direção, dureza e cor da luz, exposição, sombras, reflexão, atmosfera, desfoque de profundidade, motion blur e grão da captura. Light wrap só quando motivado e na intensidade correta; não esconde recorte ruim.
