# Toolchain VFX local e gratuita

O kit mantém **uma única skill pública**, `video-multimarcas`. Os módulos internos escolhem a técnica; os programas abaixo executam o trabalho. Não pedir ao usuário que instale ou chame especialistas separados.

## Descobrir antes de prometer

No runtime do kit, execute `npm run tools:doctor -- --profile all-free`. Para provas reais, `npm run tools:smoke -- --profile all-free`. O manifesto canônico é `tools/free-vfx/manifest.json`; os relatórios locais ficam em `.studio-tools/free-vfx/records/`. A instalação deste mantenedor não comprova a máquina do usuário, e nomes na galeria não comprovam ferramenta disponível.

Estados diferentes: `missing`, `installed`, `unverified`, `startup_passed`, `smoke_passed`, `failed`, bloqueios de plataforma/gerenciador/modelo. `startup_passed` verifica abertura/versão, não edição/render completo. Um smoke técnico não é prova de acabamento, playback/escuta ou aprovação criativa. Não herdar recibo de outro computador.

## Instalar

O download **Instalar ferramenta** do site fornece o bootstrap do projeto; ele obtém fontes fixadas e instala a toolchain gratuita por padrão (`all-free`). Precisa de internet e vários GB livres. Aplicativos, dependências e modelos são obtidos de fontes oficiais e ficam localmente, preservando licenças; não estão todos dentro do ZIP. Importar uma skill no ChatGPT não instala aplicativos no computador do usuário.

Com o projeto completo e Python 3.10–3.12 com venv/ensurepip (recomendado 3.12; `STUDIO_PYTHON` pode indicar o executável):

```bash
npm run tools:plan -- --profile all-free
npm run tools:install -- --profile all-free --apply
npm run tools:smoke -- --profile all-free
```

Sem `--apply`, install apenas apresenta o plano. Perfis menores: `base`, `automation`, `ai`. No bootstrap, `--free-tools none` instala apenas o projeto existente; isso não comprova toolchain instalada. Sem capacidade de execução no chat, conclua direção/instruções e explique o ambiente local necessário, sem pedir chave de provedor.

## Roteamento

| Necessidade | Rota gratuita |
| --- | --- |
| 3D, track/solve, simulação e comp | Blender, com projeto/script por plano |
| Comp 2D, roto, key e plugins | Natron + OpenFX-Misc; G'MIC/frei0r nos hosts compatíveis |
| Edição e acabamento de timeline | Kdenlive ou Shotcut |
| Transformações/composição em lote | FFmpeg; OpenCV/MoviePy para operações em código |
| Recorte temporal de pessoas | Robust Video Matting com peso oficial local e revisão do alpha |
| Máscara de objeto | SAM 2 com ponto explícito e propagação em vídeo; refinar bordas/cabelo/blur |
| Nós locais de IA | ComfyUI pelo comando `node scripts/free-tools.mjs serve --tool comfyui`: força CPU, `--disable-api-nodes`, `--disable-all-custom-nodes` e acesso em localhost. O código upstream contém nós de APIs pagas, desativados nesse lançador. Nenhum modelo generativo é incluído automaticamente |
| Interpolação / upscale | RIFE / Video2X, selecionando modelo apropriado e conferindo artefatos |

Somente software/modelos realmente gratuitos no manifesto. Excluir APIs pagas, assinaturas, trials e pesos restritos a uso não comercial. O histórico de pesquisa pode citar ferramentas comerciais; isso não as habilita no perfil gratuito. Não usar ProPainter em anúncios/clientes sem permissão comercial; ele está fora do instalador. Resolve/Fusion, Mocha e Sapphire não são dependências desta toolchain.

O renderer Remotion já existente tem condições comerciais próprias e **não é a base universalmente gratuita**. O novo caminho gratuito usa FFmpeg/Blender/Python e pode entregar clipes ao scene graph quando essa rota existente for escolhida com licença adequada. Não substituir a direção aprovada para contornar a ferramenta.

## Comandos integrados

```bash
npm run tools:run -- --operation filter --effect grayscale --input original.mp4 --output novo.mp4
npm run tools:run -- --operation filter --effect glow --input original.mp4 --output brilho.mp4
npm run tools:run -- --operation matte --input apresentador.mp4 --output mascara-pessoa.mp4
npm run tools:run -- --operation segment --point-x 120 --point-y 200 --input original.mp4 --output mascara-objeto.mp4
npm run tools:run -- --operation composite --input fundo.mp4 --foreground pessoa.mp4 --mask mascara-pessoa.mp4 --output composicao.mp4
npm run tools:run -- --operation interpolate --engine ffmpeg --fps 48 --input original.mp4 --output interpolado.mp4
npm run tools:run -- --operation upscale --input original.mp4 --output ampliado.mp4
```

Entradas/saídas devem ser caminhos reais; não sobrescrever originais. `matte` e `segment` geram **máscara em tons de cinza**, não MP4 transparente. Confira fps, duração, enquadramento e alinhamento antes de `alphamerge`. Pontos SAM 2 estão em pixels do frame original; pedir/inspecionar a região pertinente, não selecionar outro objeto silenciosamente. Nenhuma transcrição ou detecção de gesto é inferida dessas máscaras.

O upscale integrado usa o modelo padrão de demonstração Real-ESRGAN do Video2X; avalie adequação ao tipo de imagem antes de produção. RIFE e Video2X podem deformar mãos/oclusões e criar detalhes; não certificam fidelidade. CPU pode executar provas pequenas, mas não garante prazo de produção. Em Linux sem GPU física, o instalador tenta Mesa/Vulkan em CPU quando suportado, identificando a emulação; não anunciar GPU disponível.

## Interoperabilidade e aprovações

Reusar IDs, arquivos, planos e aceites da coordenadora. Exportar comp/máscaras/passes e ligar aos planos originais; cor, alpha, fps e frame range precisam concordar. CLI entrega saída técnica e SHA, nunca concede aceites. Geração de vídeo IA criativo continua exigindo visuais concretos aprovados; paid APIs não participam do perfil gratuito. Problemas bloqueiam o recurso afetado, sem transformar código, uma conexão ou uma máscara num vídeo final aprovado.

## Verificação desta entrega

No Linux deste ambiente, 15 ferramentas foram verificadas: 13 passaram em processamento/render/inferência técnica; Kdenlive e Shotcut passaram em inicialização/versão. SAM 2 e RVM também geraram máscaras de vídeo decodificadas. Video2X executou upscale com Mesa lavapipe em CPU, sem GPU física. ComfyUI executou um nó local de imagem, sem modelo generativo ou API. [Evidências](vfx/free-toolchain-verification.json). As provas usam padrões sintéticos, não demonstram acabamento em filmagem real. Windows/macOS não foram executados nativamente.

Para RIFE real: `npm run tools:run -- --operation interpolate --engine rife --fps 48 --input original-24fps.mp4 --output rife-48fps.mp4`. Aceita multiplicadores 2, 4 e 8; preserva áudio quando presente. O adaptador do kit evita as APIs antigas de NumPy/MoviePy do script upstream. Relatórios precisam usar arquivos novos distintos dos vídeos.

O renderizador de navegador é opcional: se sua inicialização falhar, o instalador registra o bloqueio e segue com a toolchain gratuita. Em sistemas sem Python compatível, informa o bloqueio em vez de alegar que os modelos funcionam. Rotas automáticas sem suporte no sistema ficam marcadas para instalação oficial manual.
