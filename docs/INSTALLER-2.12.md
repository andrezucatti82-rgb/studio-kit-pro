# Instalação compacta e fichas interativas · candidato 2.12.0

Escopo escolhido: um instalador compacto com internet, Codex e Claude Code locais, finalização das 60 fichas/orientações. Os 60 vídeos completos ficam para etapa posterior. Entrega na PR #20 para revisão, sem merge/deploy ou APIs pagas.

## Fluxo do usuário

1. Site → Instalar ferramenta → um ZIP → extrair → executar o instalador.
2. Reaproveitar Node.js 22+ ou obter Node.js 24 portátil e conferir SHA-256. Não altera PATH global nem políticas de execução.
3. Obter a revisão imutável completa do GitHub, inclusive referências visuais, validar caminhos/tipos e hashes antes de executar código. O download inicial tem menos de 1 MB; depois são centenas de MB. Reservar pelo menos 3 GB.
4. Preparar Git/FFmpeg ausentes pelo gerenciador suportado, com eventuais confirmações locais. Inicializar Git com remoto oficial e histórico superficial sem blobs, preservando os arquivos verificados. Não precisa de login GitHub para ler este repositório público.
5. Instalar dependências travadas por npm ci, conferir as sete skills locais e testar a abertura real do navegador de renderização. Sem executar etapa, não anunciar sucesso.
6. Abrir tutorial e depois a pasta no Codex/Claude Code. Login e acesso dos agentes são requisitos próprios; nenhuma conta, crédito ou plugin web é transferido. Os launchers studio.sh/STUDIO.cmd aproveitam o runtime portátil.
7. Escolher estilo, preparar pedido, enviar prompt/JSON/originais e seguir roteiro → moodboard → storyboard → amostra → filme → tratamento/revisão.

## Fonte e release

`packaging/installer/` contém os instaladores públicos; `scripts/package-installer.py` produz o ZIP, manifesto de arquivos e recibo de download em `style-atlas/dist/installation.json`, também associado ao manifesto do release. Os ZIPs em `dist/` e no site são byte a byte iguais. Contas, credenciais, node_modules e projetos privados não entram no bootstrap.

O código deve ser commitado primeiro. O empacotador então fixa esse SHA e só marca `sourceReady:true` quando não há diferenças nos arquivos protegidos. Um segundo commit pode registrar somente os arquivos de distribuição/metadados gerados. Isso permite uma origem imutável real sem a autorreferência impossível do hash do próprio pacote dentro do seu commit.

O botão fica indisponível se o pacote não corresponde a uma revisão fixa ou não pôde ser verificado. Preparação na PR não publica o domínio; os novos downloads dependem da futura publicação autorizada.

A origem imutável pode conter metadados de download da preparação anterior, bloqueados pelo mesmo mecanismo; o projeto instalado e o tutorial funcionam independentemente de baixar outro instalador. Para atualizar, usar o download vigente do site e uma pasta nova.

## Preservação e diagnóstico

O instalador recusa pasta pessoal, fonte adulterada, links/paths inseguros e troca de revisão. Em rede com proxy, usa curl sem exibir os valores de configuração; fora dela, usa o download nativo do Node. A retomada da mesma revisão verifica arquivos e preserva projects/. Git existente com outro remoto/HEAD também é preservado e interrompe a etapa. Não instala em projetos pessoais automaticamente, não faz commit/push do usuário nem fornece aprovações criativas.

`installation-report.json` distingue fonte verificada, runtime pendente, instalação em andamento, falha por etapa e ready. Ready comprova somente os testes locais executados, não acesso ao agente, provedor, qualidade ou publicação de vídeo. Falhas de download/ferramenta/gerenciador têm causa visível e são retomáveis.

## Fichas e prompts

As 60 direções em 17 segmentos mantêm seus IDs; as referências visuais foram revistas após a crítica aos esquemas. Cada ficha possui interactionPlan editável com fala, pessoa, informação, função, som, insumos e perguntas por momento. O usuário navega pelos quatro estados no site; prompt/JSON preservam a receita e os escopos. sourceTimes:null e timingEvidence:pending_actual_source evitam transformar roteiro em tempo medido. Quatro momentos não obrigam quatro cenas. Nenhuma fala, avatar ou vídeo novo foi gerado.

A skill especializada lê o plano e resolve somente faltas pertinentes. Video-tratamento separa acabamento/diagnóstico da montagem; video-revisao continua exigindo playback e escuta reais. Não inventar ASR, segmentação ou detector de gestos por selecionar a ficha.

## Verificações e limites

Antes de fixar a origem: 198 testes JavaScript + 9 Python, typecheck, integridade dos pacotes, fontes/links e regressões de site. No Chromium em 375/1440 px: quatro momentos, prompt realmente copiado, projeto baixado, tutorial e bloqueio do download indisponível. O registro final da PR acrescenta a prova do ZIP liberado e da instalação a partir do GitHub.

A inicialização de FFmpeg/FFprobe e Chromium foi executada em Linux. Windows/macOS têm wrappers preparados e instruções específicas, mas não foram executados em máquinas nativas nesta sessão. Instalação de sistema, política administrada, bibliotecas de browser e autenticação podem exigir ação local. Não prometer um instalador universal sem requisitos.

Na revisão visual 4.7, as fotos conceituais e os perfis de composição entram na revisão fixa obtida pelo instalador. O site deve preservar crop de painel completo no prompt/JSON e nos PNGs. Nenhuma aprovação de um esquema anterior é herdada automaticamente para a nova referência visual.
