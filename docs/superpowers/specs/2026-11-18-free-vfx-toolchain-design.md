# Studio Kit Pro — ferramentas VFX realmente gratuitas

## Pedido e decisões do usuário

Auditar instalação e funcionamento, instalar o que faltar, integrar ferramentas, skills, plugins e prompts e atualizar GitHub/site/pacotes. O download do site deve oferecer também os meios para instalar e usar as ferramentas em conjunto. Refinamento explícito: somente ferramentas realmente gratuitas. Escolha explícita: **kit com instalador por sistema**, sem contêiner como requisito.

## Estado observado

- Checkout antigo na branch `work`, kit 2.10.0. A `main` remota verificada está em `c9d15c29a969c0b540f1d3f99068d4311aadb2c5`, kit 2.13.0, com instalador compacto já publicado, produção por scene graph e uma única skill pública com sete módulos internos, incluindo `video-vfx`. A implementação deve partir dessa main atual e preservar os trabalhos anteriores desta conversa em backup/commit próprio. A árvore canônica `.agents/skills/` deve continuar contendo somente `video-multimarcas`; preservar a VFX externa desta conversa fora dela e integrar seu trabalho ao módulo interno.
- Blender, FFmpeg/FFprobe, Kdenlive/MLT encontrados no PATH. FFmpeg expõe filtros de chroma, overlay, perspectiva, blur, lente, interpolação e host frei0r. Presença não prova render nem plugins individuais.
- Natron, Shotcut e G'MIC não encontrados no PATH. No Python inspecionado não há OpenCV, PyTorch, MoviePy ou SAM 2.
- Ambiente atual Linux x86_64, cerca de 59 GiB livres; sem `nvidia-smi` e sem `/dev/dri`. O hardware não oferece GPU verificada. Não haverá contratação de GPU/nuvem.
- Há acesso GitHub autenticado, mas main remota avançou desde o checkout; comparar e integrar sem descartar alterações remotas ou locais.
- O site é estático: escolhe estilos, gera prompts e entrega arquivos; não pode instalar programas no computador do visitante ou executar Blender dentro do navegador.
- Existe plugin VFX privado na conta, com identidade a preservar: `plugins_6afdf2bda12c81918e205ad1a45c123f`.
- Credencial cPanel está parcialmente configurada: token presente, host/usuário não declarados nas variáveis conhecidas. Verificar metadados autorizados sem expor token; solicitar somente os campos faltantes se não puderem ser recuperados. Existe espelho Sites público `appgprj_6aec09533b208191aaa63ba6e104d2ce`, versão 33, e Page vinculada.

## Abordagens consideradas

1. **Instalador por sistema — escolhido:** pacote pequeno com skills, registro de ferramentas, instaladores, verificações e exemplos. Baixa software/modelos de fontes oficiais, preservando suas licenças; execução local do usuário.
2. Instalador mais contêiner opcional: ofereceria repetibilidade adicional, mas exige Docker/disco e não foi escolhido.

Empacotar executáveis de todos os sistemas e modelos em cada skill produziria downloads grandes, atualizações difíceis e combinações inválidas de hardware/licença. O kit escolhido entrega meios executáveis para instalar/verificar; a instalação só é concluída quando o instalador roda no dispositivo. Importar um ZIP no ChatGPT instala instruções/componentes compatíveis, não aplicativos nativos remotos.

## Escopo gratuito

**Base:** Blender, FFmpeg/FFprobe, Kdenlive, Natron, Shotcut, G'MIC, frei0r e OpenFX-Misc. **Automação:** OpenCV e MoviePy. **IA/processamento local:** SAM 2, Robust Video Matting, ComfyUI local, RIFE e Video2X, condicionados a backend/hardware e aos termos dos modelos efetivamente escolhidos.

Somente software e modelos sem taxa obrigatória de licença/uso. A licença do Remotion já presente tem condições comerciais por uso/organização; não classificá-lo como ferramenta universalmente gratuita. O novo caminho VFX gratuito executa em FFmpeg/Blender/Python livre, sem exigir render Remotion; preservar o renderer existente e sua advertência de licença para quem optar por ele. A integração de efeitos deve entregar clipes compatíveis ao scene graph quando essa for a rota autorizada. Não incluir ProPainter (restrição não comercial), versões trial, planos com créditos, serviços/API pagos ou plugins pagos. Não exigir Resolve/Fusion: a rota padrão permanece aberta. No ComfyUI, integrar apenas execução local; nodes/API cobrados e modelos de licença incompatível ficam fora do instalador. Verificar licença específica dos checkpoints; um wrapper livre não altera direitos do modelo.

Não prometer que GPU é dispensável para todas as ferramentas. Tentar rotas CPU suportadas; incompatibilidade concreta fica `blocked_hardware` ou `installed_not_tested`, sem marcar funcionamento. Não baixar pesos de licença indefinida para fingir completude.

## Implementação proposta

### Registro e diagnóstico comuns

Aproveitar o instalador existente em `packaging/installer/setup-studio.mjs` e seus wrappers `.sh/.ps1/.cmd`, `scripts/package-installer.py`, `setup-check.mjs` e o diagnóstico atual; não criar um segundo bootstrap concorrente. Um manifesto versionado, legível por máquina, com ID, finalidade, fonte oficial, licença, plataforma, instalação, executável/ambiente, modelos, requisitos, verificação e limitações. O mesmo registro alimenta instalador, diagnóstico, docs, prompts e catálogo resumido do site.

Estados separados: ausente, instalado, teste técnico passou, não testado, bloqueado por hardware/plataforma/licença. Evidência inclui comando, versão, saída relevante, artefato/hash e data. Diagnóstico ocorre no computador de destino; o resultado deste ambiente não é herdado por quem baixa o kit.

### Instalação e execução

Instalador idempotente por plataforma, com preview de ações e execução explícita, sem comandos de shell vindos da web. Usar gerenciadores confiáveis já presentes e/ou downloads oficiais fixados; conferir hashes quando publicados. Python em ambiente isolado e repositórios em diretório de ferramentas ignorado pelo Git, com versões/commits registrados. Preservar instalações existentes e não substituir Python/Node do sistema. Não embutir credenciais ou home absoluto no pacote público.

Política `freeOnly` da toolchain recusa rotas/API cobradas e recursos não comerciais; os provedores opcionais existentes no kit continuam sujeitos à escolha explícita e não integram o perfil gratuito. Perfis base, automação e IA; opção `all-free` tenta todos os componentes gratuitos compatíveis e relata bloqueios. Modelos volumosos e dependências de hardware são identificados no plano antes do download. Em sistemas não disponíveis para teste, fornecer rota documentada e marcar instalação não verificada; não certificar Windows/macOS por testes Linux.

CLI comum para verificar, instalar e executar operações suportadas, com caminhos de entrada/saída explícitos e sem sobrescrever originais. Primeiras operações integradas: filtros/comp FFmpeg, automação Python/OpenCV/MoviePy e scripts Blender. GUIs e repositórios especializados têm lançamento/receitas próprias, não um efeito automático fictício. Cada chamada verifica disponibilidade no contexto atual.

### Provas técnicas

Gerar padrões técnicos pequenos em área ignorada ou temporária, sem serviço pago ou vídeo IA criativo. Testar composição/chroma/encode/decode FFmpeg; render/compositor Blender; leitura/render pelo stack MLT/Kdenlive quando disponível; versões e render/import mínimo pertinente para ferramentas adicionadas. IA só recebe status de inferência testada quando modelo/backends realmente executarem um exemplo local.

Provas técnicas não aprovam acabamento audiovisual e não passam gates criativos em nome do usuário. Os protocolos existentes de moodboard/storyboard/amostra, fidelidade e revisão permanecem.

### Skills, plugins e pacote

Preservar a única entrada pública `video-multimarcas` e os sete módulos internos, atualizando `video-vfx`, `video-tratamento`, coordenação e revisão conforme necessário. Integrar o manifesto/diagnóstico e a escolha por capacidade verificada. A skill externa VFX privada já criada pode receber a referência pertinente, sem virar nova entrada obrigatória ou novo marketplace do kit. Atualizar prompts e metadados dos plugins Codex/Claude já existentes. Preservar a skill pessoal `video-b-roll`.

Release proposta: kit e coordenadora 2.14.0; a VFX externa somente muda de versão se receber alteração de conteúdo. Gerar de fontes canônicas o plugin completo e os pacotes existentes, incluindo os instaladores/configurações/docs da toolchain, sem dependências binárias instaladas, mídia de cliente ou pesos copiados indiscriminadamente. Manter uma única entrada no marketplace do kit. Cada arquivo tem versão e SHA256; comparar conteúdo dos pacotes com a fonte.

### Site e publicação

Acrescentar acesso claro ao kit gratuito, instalação por sistema, diagnóstico e limites. Incluir as instruções VFX/seleção por capacidade nos pedidos do site. Manter visual atual, IDs/quadros, estado e aprovações. Nenhuma geração de imagem/vídeo IA nova é necessária.

Versionar alterações e integrar main remota sem force push. O release requer dois passos: commit limpo das fontes protegidas; depois gerar e registrar ZIPs/metadados com revisão fixa e `sourceReady:true`. Não anunciar download enquanto esse gate estiver falso. Publicar no repositório autorizado; respeitar proteções de branch, usando PR quando necessário. Atualizar o site principal via mecanismo cPanel existente se credenciais puderem ser validadas, e o espelho Sites no projeto existente. Atualizar Page caso sua fonte/instruções dependam dos prompts alterados. Preservar acesso/audiência. Atualizar o plugin VFX privado existente e instalações locais, sem criar duplicatas de conta.

## Aceitação e limites

1. Inventário completo com evidência de presença/execução e bloqueios reais.
2. Cada ferramenta gratuita tem rota de instalação e uso, ou motivo concreto para não ser instalável/funcional no ambiente.
3. Base gratuita executa testes técnicos integrados; IA/hardware não testados permanecem explicitamente pendentes.
4. Skills e prompts exigem diagnosticar o ambiente do usuário e não inferem instalações a partir do pacote/site.
5. Pacotes contêm skills, manifesto, instaladores, receitas e documentação coerentes; links e hashes conferidos.
6. Suite existente, novos testes comportamentais pertinentes, check, validate e testes dos pacotes passam. Verificação do site cobre download e preservação do pedido/estado.
7. GitHub, site, Page e plugin são confirmados por leitura/recibo ou identificados como bloqueados; nenhum destino é declarado atualizado só porque arquivos locais mudaram.

## A confirmar após revisão

Aprovação deste desenho antes de alterar implementação/instalar dependências, conforme o procedimento de design aplicado. Escolhas rotineiras de bibliotecas, organização dos arquivos e versões compatíveis ficam com o executor. Não há autorização para cobrar serviços, compartilhar dados privados ou gerar vídeos IA sem as aprovações visuais existentes.
