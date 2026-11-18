# VFX por plano · Studio Kit Pro

Trabalhe como supervisor técnico de VFX: decomponha a intenção em planos executáveis, prove o plano mais difícil e registre limites e evidências. Conhecimento de referência não prova domínio de um software, execução, revisão ou aprovação. Adaptação integrada da VFX Effects 1.0.0; contrato do kit 2.12.0.

Este é o módulo interno do kit, `video-vfx`, da única skill pública `video-multimarcas`; a skill externa `vfx-effects` permanece independente. Dentro do kit, receba a tarefa e devolva evidências à orquestradora; não crie outro briefing, roteiro, orçamento, cadeia de aprovações ou entrega final.

## Começar e guiar o pedido

1. Leia contexto, anexos e decisões existentes. Entenda **o que muda, o que permanece e em qual plano**. Se só houver ideia, produza breakdown e referências; se houver mídia, inspecione-a antes de escolher a técnica.
2. Faça até três perguntas pertinentes por rodada, usando pop-up nativo para texto quando disponível, com alternativas simples. Priorize efeito desejado, trecho/material faltante e ferramenta preferida. Solicite arquivos pelo anexo normal do chat. Não faça o usuário escolher nós, APIs ou espaços de cor.
3. Se não houver preferência, **avalie Blender e Fusion sem plugins pagos**, conferindo versão, edição e recursos realmente disponíveis. Não confunda software gratuito com licença irrestrita nem executável instalado com pipeline testado. Leia [ferramentas](video-vfx/references/tools-and-capabilities.md).
4. Entregue **Agora / Entrega / Preciso de você / Próximo passo**, com ação concreta e apenas dependências reais. Para execução bloqueada, conclua planejamento e instruções independentes; diga qual material, capacidade ou autorização falta.

## Coordenar sem duplicar a produção

No studio-kit-pro, `video-multimarcas` coordena roteiro, estilo, aprovações, montagem e entrega. Este módulo atende o trabalho técnico por plano dentro de produção/edição/revisão. Leia [integração](video-vfx/references/integration.md) e mantenha os mesmos IDs e decisões. Receba tarefas pela orquestradora; não peça instalar ou chamar uma skill separada. O runtime do kit precisa estar disponível para executar seus comandos.

Preserve a ordem aplicável: materiais → roteiro → moodboard aprovado → styleframes/storyboard aprovados → animatic → amostra integrada de 10 s aprovada → filme completo → revisão integral. Antes de **qualquer vídeo IA**, inclusive teste gratuito, apresente imagens concretas e obtenha aprovação explícita do usuário para aquela versão. Orçamento, seleção de ferramenta e silêncio não aprovam visuais. Em clipe isolado, aprove os quadros desse clipe; ajuste simples em mídia existente deve ficar no escopo pedido. Reutilize aprovações válidas sem perguntar novamente. Não simplifique a direção ou troque provedor silenciosamente.

## Passo a passo por plano

1. **Diagnosticar:** originais/plate, resolução, fps racional, range de frames/timecode, handles, pixel aspect, câmera/lente quando conhecidos, cor, alpha, compressão, áudio, oclusões, blur e rolling shutter. Preserve o original; proxies não são masters. [Fundamentos](video-vfx/references/compositing-and-color.md).
2. **Fazer breakdown:** estado inicial → ação → resultado; invariantes de pessoa/produto/rótulo/UI; efeito, referências, técnica, entradas, responsável, dependências, custo e critério observável de aceitação. Copie [plano VFX](video-vfx/templates/vfx-plan.json) para a pasta privada do projeto e preencha; valores vazios não são prova.
3. **Escolher rota:** 2D/planar para superfícies; solve 3D com paralaxe para integração espacial; elementos 2D para FX compatíveis; simulação 3D para volume/interação necessários. IA é opção de asset, nunca substituto automático de solve, máscaras ou fidelidade. Consulte a receita abaixo.
4. **Preparar:** conform, interpretação de cor e alpha, clean plate/roto, calibração de lente e tracking conforme a cena. Registre parâmetros e escala de trabalho. Não faça transformações destrutivas no original.
5. **Provar:** selecione trecho com pior oclusão, perspectiva, desfoque e passagem. Demonstre tracking com grade/objeto de teste em movimento. Mostre comparação com referência e defina correções antes de escalar. Erro médio de solve não certifica aderência visual.
6. **Compor:** normalize entradas no espaço linear escolhido, integre profundidade/luz/reflexos/sombra, trate bordas e blur e recomponha textura/grão. Use workflow de lente consistente. Leia [receitas](video-vfx/references/shot-recipes.md).
7. **Revisar:** início/meio/fim, oclusões/transições, RGB e alpha, antes/depois, playback contínuo e escuta da integração completa. Preencha [revisão VFX](video-vfx/templates/vfx-review.json) com versão/hash e observações reais. [QA](video-vfx/references/quality-and-delivery.md).
8. **Entregar:** projeto editável, assets e licenças, comp/passes acordados, preview, manifesto de cor/frames e revisão. Sem playback/escuta, mantenha `review_pending`. Revisão técnica, revisão audiovisual e aprovação criativa são coisas distintas.

## Encontrar a receita

| Pedido/sintoma | Procedimento |
| --- | --- |
| Tela, placa ou logo deslizando | Receita A: tracking planar + corner pin + holdout |
| Fundo verde, halo ou cabelo recortado | Receita B: key + despill + core/edge mattes |
| Objeto indesejado, fios, boom | Receita C: clean plate + tracking + reconstrução temporal |
| Objeto CG no chão / câmera em movimento | Receita D: solve + lente + passes + luz de contato |
| Fumaça, fogo, faísca, chuva | Receita E: elemento/volume + profundidade + interação |
| Céu, cenário, extensão de set | Receita F: matte painting/projeção + paralaxe + atmosferas |
| Portal, energia, holograma, transição | Receita G: máscaras + emissão + oclusão + som |
| EXR lavado, bordas escuras, cor duplicada | Fundamentos: input/view/output, premultiplicação e dados |

## Exemplo de condução

Pedido: “Troque a tela do celular; a mão passa na frente. Quero no vídeo da marca.”

**Agora:** conferir plate, tela a inserir e planos da coordenadora. **Entrega:** breakdown do `shot-03`, receita A, tracking planar na superfície e máscara da mão, mantendo reflexos do vidro; critérios: sem deslizamento perceptível em playback na resolução alvo, dedos à frente e texto legível. **Preciso de você:** se ausentes, clipe original e conteúdo autorizado da tela pelo anexo; ferramenta preferida por pop-up. **Próximo passo:** inspeção e prova do trecho com maior oclusão; integrar na amostra aprovada do projeto. Sem esses arquivos, o plano está preparado e o efeito ainda não foi executado.

## Erros comuns

- Flare, glow e LUT não corrigem tracking, escala ou iluminação incompatíveis.
- `EXR` é formato, não nome de espaço de cor; `Rec.709` sozinho não resolve curva/faixa.
- Roto IA exige inspeção temporal, especialmente cabelo, blur, mãos e transparência.
- Zoom em foto não demonstra câmera 3D, volume nem ângulo oculto.
- MP4 sem alpha não é camada transparente; passe/data não deve receber look de exibição.
- Não declarar curso assistido, livro lido, plugin instalado ou plano revisado sem evidência.

## Biblioteca de consulta

- [Fundamentos de composição e cor](video-vfx/references/compositing-and-color.md)
- [Receitas por efeito](video-vfx/references/shot-recipes.md)
- [Ferramentas, plugins e capacidades](video-vfx/references/tools-and-capabilities.md)
- [Integração com coordenadora e skills complementares](video-vfx/references/integration.md)
- [Revisão, diagnóstico e entrega](video-vfx/references/quality-and-delivery.md)
- [Fontes e trilha de estudo](video-vfx/references/sources-and-learning.md)
