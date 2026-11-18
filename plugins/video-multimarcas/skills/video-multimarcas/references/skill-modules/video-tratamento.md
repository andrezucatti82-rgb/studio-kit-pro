---
name: video-tratamento
description: Use when footage or a rendered edit needs technical inspection, color correction, natural texture, restoration, audio finishing, source normalization, export specifications, or an honest assessment of HDR and mastering capabilities.
---

# Tratamento e finalização técnica · 2.12.0

Receba originais, montagem atual, referências aprovadas, escopo do ajuste e destino. Separe montagem (`video-edicao`), tratamento (esta skill) e conferência independente (`video-revisao`). Um pedido somente de som ou cor preserva os demais aceites e altera somente dependências afetadas. Leia a [matriz completa de cobertura](video-tratamento/references/coverage.md) antes de prometer um processador. Ela distingue funções integradas, parâmetros fixos, implementação parcial e recursos não integrados. A instalação da skill não instala uma suíte de pós-produção.

## Diagnóstico antes do tratamento

1. Preserve o original e seu hash. No runtime local, rode `npm run video:inspect -- --file CAMINHO --out projects/NOME/source-inspection.json`; acrescente `--measure-audio` para medição opcional. Inspecione também o candidato final. Sem execução, solicite o relatório ou oriente sua obtenção; não invente medições.
2. Confira dimensões, SAR/DAR, FPS médio/nominal, varredura, codec/perfil, pixel format, bits reportados, primárias/transferência/matriz/faixa, streams de áudio, layout, sample rate e timecode disponível. Metadados ausentes permanecem desconhecidos. Tags são declarações da fonte, não prova de interpretação correta, conteúdo Log ou conformidade HDR.
3. Defina o destino real e documente conversões. O grafo atual entrega H.264 8-bit 4:2:0/AAC em quatro dimensões fixas e 24/30 FPS. A rota standalone é diferente. Não chamar upscale de detalhe recuperado nem transformar material entrelaçado, anamórfico, Log/PQ/HLG ou multicanal por suposição. Encaminhe essas necessidades a uma transformação gerenciada e verificada antes da importação.

## Operação com limites claros

O grafo possui `finishing` opcional: brilho, contraste, saturação, elevação limitada de sombras, compressão limitada de realces e grão monocromático. Consulte [acabamento natural](../natural-finish.md) e o schema atual. O `finishProfile` do catálogo é direção declarativa, não o nome do campo executável. É um ajuste global conservador, não balanço Kelvin/tint, LUT, recuperação de altas luzes, correção seletiva de pele, denoise ou gerenciamento de cor. A rota `npm run render` não aplica esse perfil. Nunca tratar ruído com mais grão.

Para redes sociais, preserve textura de pele/produto e ambientes plausíveis. Luz/brilhos suaves devem servir à leitura; transparências e luz gráfica pertencem à composição. Sem aparência plástica, sharpening excessivo, pretos esmagados ou glow permanente. Confira o original lado a lado em quadros representativos e em movimento.

Em áudio, o grafo mistura faixas registradas com níveis, fades e ducking da trilha e aplica loudnorm de uma passagem com alvo −16 LUFS, −1,5 dBTP e LRA 7. Isso não certifica loudness nem atende automaticamente normas de broadcast. A rota standalone não usa esse loudnorm. Meça a saída, escute fala/SFX/trilha e confira clipping e sincronismo; não prometa de-reverb, de-esser, surround ou Atmos nativos.

Se a matriz indicar ausência, descubra a ferramenta local/conexão real e teste somente a etapa necessária. Filtros compilados no FFmpeg não são um fluxo integrado; GPU anunciada não prova aceleração disponível. Não gastar APIs para diagnóstico. Ferramentas externas exigem configuração explícita, originais preservados, saída intermediária documentada e validação; sem ferramenta adequada, entregue a lacuna e uma alternativa concreta, sem anunciar tratamento realizado. Não implementar dezenas de filtros improvisados em um único comando para simular cobertura.

## Saída para revisão

Entregue candidato acessível e hash, relatório antes/depois, receita/valores aplicados, rota/versão, perfil de destino, intermediários pertinentes e limitações. Não sobreponha o original. Só reencodifique quando necessário e mantenha uma fonte de qualidade para revisões. `video-revisao` confere arquivo, movimento, som e entrega. Relatório técnico não comprova playback, escuta, aprovação criativa, conformidade HDR/Dolby/broadcast/DCP nem autorização para publicar.

`video-vfx` responde por cor/alpha/passes dentro da composição e sua ida/volta; este módulo conserva tratamento global e destino final. Use o manifesto VFX para evitar transformação duplicada e preserve identidade/cor factual. Cleanup localizado/roto/integração de efeitos não são restauração global.
