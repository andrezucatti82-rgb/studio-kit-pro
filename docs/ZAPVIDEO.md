# ZapVideo no Studio Kit Pro

O ZapVideo usa o domínio canônico [zapvideo.com.br](https://zapvideo.com.br/) e abre com duas opções: editar um original ou montar o briefing de um vídeo com IA. O catálogo ocupa `/catalogo`. O instalador fica em `/catalogo#instalar`. O kit instalado continua com `npm run atlas` e seus comandos de produção.

## Edição e exportação

1. Escolha o vídeo original. Você pode combinar legendas de um SRT, três cortes verticais e ajustes de som e cor.
2. Informe os tempos de cada corte. A prévia permite ajustar horizontal e verticalmente a janela sobre a tomada original. Se enviar uma transcrição SRT com os tempos da fala, a página sugere intervalos pelas pausas entre as legendas. Cada sugestão mostra texto, motivo e tempos no original.
3. Baixe a ficha e mantenha os originais na mesma pasta, ou baixe o ZIP que inclui os arquivos selecionados. A alternativa online usa o código do piloto e pede autorização para enviar o material.
4. Assista às prévias e confira áudio, enquadramento e legendas antes de divulgar.

Use **Enquadramento** para ver a área conservada pelo corte 9:16. **Imagem** compara um quadro do vídeo selecionado com uma aproximação dos ajustes de brilho, contraste e saturação. **Áudio** reproduz uma amostra demonstrativa original e a versão com as opções de volume e redução de ruído selecionadas. As amostras de imagem e enquadramento funcionam antes do upload.

```sh
npm run video -- import --preset caminho/projeto-video.json --out projects/zapvideo-local
npm run video -- context --project projects/zapvideo-local
npm run video -- edit --project projects/zapvideo-local --source "caminho/câmera.mp4" --srt "caminho/legendas.srt" --out projects/zapvideo-local/entrega
```

Com o ZIP extraído ou com um pacote recuperado pelo importador, a ficha de arquivos liga IDs aos originais. Use `npm run video -- edit --preset caminho/projeto-video.json --out caminho/entrega` para editar diretamente. A pasta de entrega precisa ser nova. FFmpeg e FFprobe devem estar no PATH ou ser indicados em `FFMPEG_PATH` e `FFPROBE_PATH`. A ficha nova tem formato `zapvideo-project` v1. O importador mantém os formatos legados de catálogo. O seletor do navegador pode precisar de outra ferramenta para pré-visualizar certos codecs que o FFmpeg aceita.

O pacote criptografado temporário pode ser enviado ao Codex ou Claude Code. Sua validade é de duas horas. O comando histórico `scripts/retrieve-disteven-handoff.mjs` aceita a rota de pacote em `https://zapvideo.com.br/api/zapvideo/handoff` e as rotas PHP explicitamente permitidas da origem antiga. O limite da rota anterior é 64 MiB. O limite do novo pacote criptografado é 32 MiB, separado do upload retomável. Para materiais maiores, use o ZIP local, o upload de edição ou envie os originais separadamente. Trate a instrução com o link como credencial temporária.

Em **Entrega**, revise o MP4 da montagem completa ou da edição, escolha **Temporário** ou **Sem validade** e clique em **Gerar link de entrega**. A página permite assistir e baixar a saída verificada para quem tiver o link, sem código do piloto. O link temporário expira sete dias após a criação do trabalho. **Tornar link sem validade** mantém o endereço já compartilhado. O dono do projeto pode desativar o link a qualquer momento. As amostras integradas, os clipes de planos e os materiais de trabalho usam somente a revisão privada.

## Infraestrutura

| Componente | Papel |
| --- | --- |
| Worker + Static Assets | Aplicação e API na mesma origem. A hospedagem mantém as páginas da galeria, fontes, referências e binários do instalador compatível. |
| R2 público por aplicação | Bucket privado no painel, com leitura pública somente do catálogo pelo Worker. O build registra o tamanho e o SHA-256 do catálogo. O Worker usa ETag e aceita cache por versão. |
| R2 privado | Originais, saídas e pacotes. O app confirma acesso por projeto e trabalho. Um cookie HttpOnly temporário e restrito à rota do arquivo libera reprodução e downloads com HTTP Range. |
| D1 | Pessoas do piloto, projetos por proprietário, revisões, uploads e partes, jobs, reservas, grants e metadados de aprovação. Familiarizar-se com a tabela de aprovações antes de ligar qualquer serviço de geração. O briefing atual envia somente o assunto. |
| Workflows | Recebe IDs, entrega os originais ao renderer, consulta o andamento e publica os objetos após validação. A etapa Gemini de proposta tem zero retries da chamada. Timeout de resultado incerto precisa de conciliação antes de repetir. |
| Container | Uma imagem própria com FFmpeg/FFprobe e rede externa desativada. Candidato `standard-2` de 1 vCPU, 6 GiB e 12 GB. A capacidade online fica desativada até homologação real da imagem. |

Staging e produção usam bancos, buckets, Workflows e Containers próprios. O renderer GDA serviu como referência. A API da conta confirmou sua configuração de 1 vCPU, 6 GiB e 12 GB. O ZapVideo v1 limita vídeo a 512 MiB e duração a 15 minutos, SRT a 2 MiB, partes a 8 MiB e um job simultâneo por pessoa, dois no total. A reserva global é de 4 GiB para originais e 4 GiB para saídas. O teto diário é de 12 jobs por pessoa e 40 globais. O projeto Gemini GDA Insight Flow foi autorizado para testes protegidos no staging. A liberação da IA em produção requer validação própria. Consulte limites e preços antes de habilitar renderização. A referência oficial do Workers Paid é US$ 5 por mês e a franquia de Containers é compartilhada na conta. [Limites de Workers](https://developers.cloudflare.com/workers/platform/limits/) · [Containers e preços](https://developers.cloudflare.com/containers/platform/pricing/).

O original é validado por tamanho, SHA-256 e FFprobe antes do processamento. O FFmpeg usa um conjunto fixo de filtros, sem shell. Cada MP4 entregue tem dimensões, duração, streams, decodificação e hash verificados. As saídas permanecem em revisão. O cron exclui uploads inativos vencidos, pacotes e entregas temporárias. Se houver um link sem validade ativo, o trabalho e suas saídas ficam no R2 privado e continuam sujeitos às cotas de armazenamento. Use a limpeza da aplicação para as saídas em R2 e a regra de lifecycle para abortar multiparts incompletos. O TTL é de 24 horas para upload em aberto, 7 dias para originais completos e saídas temporárias, duas horas para pacotes e 15 minutos para acesso privado aos arquivos. As fichas em D1 são dados do piloto; a exclusão solicitada exige revogar a conta e remover seus registros e objetos com operação administrativa rastreável. Observabilidade remota começa desativada. Em logs de operação, mantenha apenas identificadores e estado.

## Homologação local

O assistente aceita um link público HTTPS como ponto de partida. No modo local, a leitura retorna um produto fictício; a seleção de estilo, os quadros de exemplo e a ficha do storyboard funcionam localmente. Os quadros do catálogo servem para escolher a direção. Cada plano usa o quadro associado pelo usuário no diálogo de aprovação visual antes de cotar um clipe.

A leitura real usa URL Context no mesmo canal privado e orçamento diário do briefing. Antes de configurar `GEMINI_PRODUCT_URL_VERIFIED=1` no piloto, valide o retorno de `url_context_result` do modelo de briefing, o custo da página lida e a reserva exibida. O recurso exige `GEMINI_BRIEF_PAID_VERIFIED=1` e uma reserva positiva. A entrada manual continua disponível com a leitura desativada ou se a página exigir login, tiver bloqueio ou não retornar um produto verificável.

O Wrangler está fixado no projeto. Staging e produção usam os UUIDs dos bancos remotos provisionados. O UUID iniciado em zero é reservado ao emulador local. O build exclui PHP e `catalog.json` dos Assets.

```sh
npm ci
npm run zapvideo:prepare
npx wrangler d1 migrations apply zapvideo-local --local --env local
node tests/zapvideo-fixtures.mjs
npx wrangler d1 execute zapvideo-local --local --env local --file .cache/zapvideo/fixture-access.sql
```

Leia `catalogKey` da saída do build ou a chave em `.cache/zapvideo/assets/catalog-version.json`. Substitua `<catalogKey>` pela chave completa.

```sh
npx wrangler r2 object put "zapvideo-local-public/<catalogKey>" --file style-atlas/dist/catalog.json --local --env local
npm run zapvideo:renderer
npx wrangler dev --env local --port 8792 --ip 127.0.0.1
```

Execute os dois últimos comandos em terminais separados. O servidor de FFmpeg de desenvolvimento usa loopback e só recebe o protocolo interno. Rode `node tests/zapvideo-worker-smoke.mjs`, `node tests/zapvideo-clip-smoke.mjs`, `node tests/zapvideo-clip-budget.mjs` e `python tests/browser-zapvideo.py --chrome caminho/do/chrome`. O script de teste do navegador requer Playwright. O ambiente local usa Gemini simulado e FFmpeg real com insumos sintéticos. Para testar a proteção do estágio, aplique as migrações e semeie o catálogo em `zapvideo-staging` e `zapvideo-staging-public` com `--local --env staging`, depois abra `npx wrangler dev --env staging --port 8791`. O segredo de staging local é gerado em `.dev.vars.staging`. Todos os arquivos de credenciais de fixture são ignorados pelo Git.

```sh
npx wrangler deploy --dry-run --env staging
# Verificação do pacote do Worker sem compilar a imagem
npx wrangler deploy --dry-run --env staging --containers-rollout=none
```

## Homologação remota e publicação

1. Confirme conta, franquia de Containers e R2 e qualquer custo, via painel. Não ative plano ou recarga para executar a prova. Crie primeiro somente recursos de staging. No Docker em Linux ou ambiente compatível, compile a imagem usando o contexto raiz. Registre tamanho, memória, CPU, espaço e tempo consumidos pelas fixtures.
2. Na conta confirmada, confira o D1 `zapvideo-staging` e os buckets `zapvideo-staging-public` e `zapvideo-staging-private`. Em uma conta nova, crie esses recursos e atualize o UUID do banco na configuração. Proteja a URL temporária. `STAGING_ACCESS_SHA256` é o SHA-256 do valor completo do cabeçalho Basic, de um usuário operacional com senha aleatória, instalado como segredo do Worker. Gere um código distinto de 32 bytes aleatórios por pessoa, guarde só seu SHA-256 em `people.token_hash` e defina expiração em Unix seconds. Use um canal privado para credenciais.
3. Execute a migração D1 remota com `npx wrangler d1 migrations apply zapvideo-staging --remote --env staging`. Suba o catálogo ao bucket público de staging com `npx wrangler r2 object put "zapvideo-staging-public/<catalogKey>" --file style-atlas/dist/catalog.json --remote --env staging`. Faça o deploy com Docker ou com a referência da imagem publicada no registro privado da Cloudflare. Instale a autenticação na mesma operação de implantação com `--secrets-file` e um arquivo local ignorado pelo Git. Confira 401 sem credencial, 200 com credencial, catálogo com ETag, referências, instalador e API. Habilite `RENDER_ENABLED=1` somente no staging autorizado para provar FFmpeg em Container. A montagem também exige `ASSEMBLY_ENABLED=1`. Enquanto a janela de teste estiver ativa, o comando `node tests/zapvideo-assembly-smoke.mjs --staging` lê as credenciais das fixtures pelo cache privado e mantém os geradores de IA desligados. Faça o percurso completo com as fixtures e valide recuperação do pacote, Range, falhas e isolamento. Registre URL, versão do Worker, imagem, migrações e estado anterior.
4. Compare o DNS público com a zona atual no Portal HostGator. Exporte a zona e identifique os registros de serviço. O MX público apontava ao próprio apex. Antes de trocar seu A por um Custom Domain, identifique o destino real do e-mail no painel e preserve o roteamento. Adicione a zona `zapvideo.com.br` em Full setup na conta Cloudflare e confira os importados. Se existir DS, trate a transição conforme o procedimento Cloudflare. Use exatamente o par atribuído àquela zona no registrador HostGator, valide em dois resolvedores e aguarde `Active`. [Cloudflare Full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) · [Troca de nameservers na HostGator](https://suporte.hostgator.com.br/hc/pt-br/articles/30821922972691-Como-configurar-para-outra-empresa-um-dom%C3%ADnio-registrado-na-HostGator).
5. Após homologação real, repita a criação e migração com `zapvideo-production`, `zapvideo-production-public` e `zapvideo-production-private` em `--env production`, usando credenciais próprias. Publique o Worker, inspecione conflitos e vincule `zapvideo.com.br` como Custom Domain. Se `www` estiver disponível e for validado, vincule-o ao mesmo Worker que redireciona com 308 ao apex e mantém caminho e parâmetros. Confira HTTP → HTTPS, certificado, canonical, links internos, catálogo, previews, API, instalador, cookie seguro e rotas impróprias. Registre recibo e resultados. [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
6. Preserve a implantação antiga em videos.gerenciadordeanuncios.com.br. Ao liberar o novo instalador, regenere com `python scripts/package-installer.py` depois do commit fonte limpo e publique somente após provar o download da mesma revisão pelo GitHub.

O [relatório de verificação](ZAPVIDEO-VERIFICACAO.md#publicação-no-domínio-canônico-em-20-de-novembro-de-2026) registra a implantação do domínio, as provas do piloto e o estado de cada função.

### Piloto temporário no domínio oficial

No domínio oficial, a pessoa entra em **Editar um vídeo que já tenho** ou **Criar um vídeo com IA**, abre **Acesso ao piloto** e conecta seu código pessoal. A produção confere a expiração do código em D1 e a da janela em `ZAPVIDEO_PILOT_EXPIRES_AT`. O navegador renova a lista de capacidades após conectar. A expiração encerra a criação de trabalhos de renderização e de IA desse piloto. As fichas, os originais, os arquivos e os trabalhos usam os recursos de produção.

O Service Binding `GEMINI_PROVIDER` chama o ponto de entrada privado `ZapVideoGeminiProvider` da homologação. Ele acrescenta a chave do Gemini apenas nas rotas permitidas do Google e tem a mesma expiração em `GEMINI_BRIDGE_EXPIRES_AT`. A URL HTTPS da homologação continua protegida por Basic. Faça o deploy da homologação com o ponto de entrada antes de publicar a configuração do piloto em produção. As variáveis de expiração e capacidade são aplicadas na implantação do piloto. Os padrões no repositório mantêm os geradores desativados. [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/).

#### Build Linux e imagem de homologação

O workflow `.github/workflows/zapvideo-renderer.yml` compila o Dockerfile em um runner Ubuntu, sobe o serviço restrito a loopback e prova SRT e três cortes com vídeo sintético. O artefato contém a imagem testada e o SHA-256 do arquivo compactado e expira em um dia. A imagem pode ser publicada no registro privado com uma credencial de vida curta da Cloudflare. Use sua referência no campo `containers[0].image` da configuração de staging. Preserve `RENDER_ENABLED=0` enquanto a capacidade de render não estiver liberada para teste. O processo dispensa Docker na máquina que implanta a imagem publicada. Cada job encerra sua instância após gravar os resultados verificados no R2. O limite de inatividade encerra instâncias interrompidas. [Implantação de Containers](https://developers.cloudflare.com/containers/guides/deploy/).

### Retorno

Em caso de incidente de aplicativo, suspenda as capacidades do piloto e volte à versão anterior do Worker, com catálogo da mesma versão ainda no R2. Mantenha migrações D1 aditivas e não remova tabelas como parte do retorno de código. Se o problema for no Custom Domain, remova somente o vínculo criado do ZapVideo e restaure os registros do apex/www que constarem do inventário. Se for a delegação, recoloque os nameservers anteriores documentados na HostGator e trate o DS de acordo com o provedor efetivo. Confira A, MX, resolução pública e TLS. O endereço anterior continua como alternativa enquanto isso.

## Planejamento guiado com Gemini

A criação começa com uma receita, um link público HTTPS ou uma frase e o rumo escolhido. **Gerar objetivos e estilos com IA** usa o Gemini 3.8 Flash para sugerir três objetivos. Para um link, a resposta exige confirmação de leitura via URL Context. O resultado do Google indica direções da lista do kit. O ZapVideo filtra e ordena os estilos reais do catálogo pela direção, pelo assunto e pelo segmento. A lista tem busca, filtros e carregamento por páginas, com prévias verticais. A escolha do estilo é explícita.

O wizard oferece perguntas sobre abordagem visual, ritmo e som. **Gerar storyboard com IA** usa o Gemini 3.1 Pro Preview para propor três cenas de acordo com essas escolhas. O ritmo define os tempos dos planos em um vídeo de 15 segundos. Os quadros exibidos são referências do catálogo. **Pedir ajustes** cria uma nova proposta no mesmo fluxo. Aprovações de mídia, geração e montagem continuam exigindo os registros dessas etapas. A amostra integrada tem exatamente 5 segundos.

O modelo do storyboard é configurado em `GEMINI_BOARD_MODEL`. Leitura de links, objetivos e storyboard usam a autorização e a reserva dos trabalhos de briefing. O piloto mantém o acesso por código, limites diários e o provedor atrás do Service Binding. A alternativa **Planejar manualmente** continua disponível sem a API.

## Gemini e aprovações

`Me ajude a montar` envia um assunto à Interactions API, valida um retorno estruturado e registra a proposta na revisão pedida. Aplicar a proposta exige uma ação explícita. Se o assunto, material ou plano mudar durante a espera, a página mantém a edição atual e bloqueia a aplicação daquela resposta. Os testes cobrem respostas válidas, rejeição do provedor e saída inválida com dublês da API. O piloto mantém `GEMINI_BRIEF_FREE_VERIFIED=0`. Para uma prova real futura, identifique projeto e região, capacidade e modelo específico, verifique o tipo de faturamento no Google AI Studio, confira os termos de uso de dados e instale `GEMINI_API_KEY` como segredo. [Saída estruturada](https://aistudio.google.com/docs/structured-output) · [Preços](https://aistudio.google.com/docs/pricing) · [Termos do Gemini](https://aistudio.google.com/docs/terms).

Em staging, o modo pago usa `GEMINI_BRIEF_PAID_VERIFIED=1`, um modelo em `GEMINI_BRIEF_MODEL` e uma reserva por proposta em `GEMINI_BRIEF_RESERVE_MICROS`. A página mostra a reserva antes da confirmação. O Worker compara o valor aceito com a configuração atual e registra a reserva no mesmo teto diário de clipes, imagens e áudio. Um trabalho pago só inicia uma chamada ao Gemini. A prova com `gemini-3.8-flash` e os artefatos de voz e trilha estão no [relatório de verificação](ZAPVIDEO-VERIFICACAO.md#briefing-e-áudio-em-homologação).

A análise de materiais roda em modo simulado no ambiente local. A pessoa escolhe até quatro arquivos (8 MiB combinados) e uma URL pública HTTPS sem parâmetros. O Worker valida assinatura e hash dos bytes e a análise identifica as fontes selecionadas. A URL usa a ferramenta URL Context do Google quando habilitada, com checagem de compatibilidade do modelo. A capacidade usa seu próprio `GEMINI_ANALYSIS_FREE_VERIFIED` e modelo e requer prova real autorizada por tipo de mídia. [URL Context](https://aistudio.google.com/docs/url-context) · [Análise de vídeo](https://aistudio.google.com/docs/video-understanding).

### Clipe isolado por plano

1. Marque a mídia de apoio no plano, informe 3 a 15 segundos inteiros, escolha 9:16 ou 16:9 e abra a imagem de referência. A revisão aceita PNG, JPG ou WebP de até 2 MiB.
2. Confira o quadro, confirme o uso e registre o aceite por escrito. O Worker só aceita o mesmo SHA-256 enviado pelo navegador após carregar a imagem. A aprovação em D1 vincula proprietário, revisão, cena, plano, instruções, quadro, proporção e modelo. Alterações em outra cena permitem reutilizar o aceite. Alterações no escopo exigem outro aceite.
3. Confira a estimativa em USD. Ela expira em 15 minutos e só pode originar um trabalho. A confirmação explícita do valor é separada da aprovação visual.
4. Acompanhe o status, baixe ou assista à prévia verificada e vincule-a ao plano da ficha na revisão correspondente. A prévia simulada é um padrão sintético com áudio, gerado pelo FFmpeg de loopback. Ela tem a etiqueta de simulação.

A rota Omni usa a Interactions API com `store=false` e recebe o MP4 na resposta. O Google exige armazenamento de interação para entrega por URI. O Worker aceita até 4 MiB de MP4 na resposta direta e grava os bytes no R2 privado antes de enviar o arquivo à verificação. Uma resposta com URI, se recebida, segue a lista de origens permitidas e o limite de 24 MiB. A solicitação tem zero retries automáticos. D1 registra a tentativa antes do POST e guarda os identificadores disponíveis. Sem confirmação, a reserva e o bloqueio ficam registrados até a conciliação. O FFmpeg verifica 720p, duração, codecs, áudio, decodificação e SHA-256 antes de liberar a prévia. [Guia do Omni](https://aistudio.google.com/docs/omni) · [Retenção da Interactions API](https://aistudio.google.com/docs/interactions-overview#data-storage-retention).

Nos ambientes remotos, `GEMINI_CLIP_VERIFIED=0` e `GEMINI_CLIP_DAILY_BUDGET_MICROS=0`. Para um piloto autorizado, confirme a franquia do Container, a conta e a região do Gemini, o modelo `GEMINI_CLIP_MODEL`, a chave como segredo e a autorização formal de gastos. Configure `GEMINI_CLIP_RESERVE_MICROS_PER_SECOND` a partir dos preços e de uma margem aprovada. A reserva limita novas submissões no aplicativo. O faturamento efetivo precisa ser conciliado no Google. A tabela oficial consultada indica somente plano pago para Omni 1.2 Flash e cerca de US$ 0,07 por segundo de saída em 720p, além dos tokens de entrada e de eventuais saídas de texto. [Guia do Omni](https://aistudio.google.com/docs/omni) · [Preços do Omni](https://aistudio.google.com/docs/pricing#gemini-omni-1.2-flash).

### Quadros, narração e trilha

A partir de um plano, a pessoa prepara um quadro com Nano Banana 2.1. A prévia pode ser baixada ou adicionada ao projeto para revisão visual. Na cena, o Gemini TTS recebe a fala exibida no aceite e uma voz do catálogo. Lyria 3 Clip prepara uma trilha de 30 segundos a partir da descrição escolhida. Cada material tem estimativa separada, confirmação explícita, limite de bytes e registro de tentativa. FFprobe e FFmpeg conferem o JPEG, o WAV mono a 24 kHz e o MP3 estéreo a 44,1 kHz antes de liberar o arquivo. Os testes com mídia sintética exercitam o mesmo percurso de armazenamento e descarga. [Nano Banana](https://aistudio.google.com/docs/models/gemini-nano-banana-2.1) · [TTS](https://aistudio.google.com/docs/speech-generation) · [Lyria](https://aistudio.google.com/docs/music-generation).

O teto aprovado para testes no Google em 19/11/2026 foi de R$ 50 por dia. O ZapVideo reserva no máximo US$ 5 por janela móvel de 24 horas no staging, somando briefing pago, clipes, imagens e áudio e mantendo reservas de resultados incertos. Pela PTAX venda de R$ 5,8889, US$ 5 representam R$ 29,44 antes dos encargos, preservando margem para variação. O teto no aplicativo controla reservas e o projeto Google deve ter faturamento real conciliado. A ativação de uma capacidade exige modelo disponível na conta, reserva por tipo, chave isolada e aprovação aplicável. [PTAX do Banco Central](https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao=%2711-19-2026%27).

`node zapvideo/google-check.mjs` consulta metadados com a credencial do ZapVideo e nunca gera mídia. Quando a conta estiver ligada, `node tests/zapvideo-google-pilot.mjs --run` reserva US$ 0,10 para uma única imagem sintética por dia no horário de Brasília. Mantenha provas manuais fora da mesma janela de uso ativo dos limites de staging até haver conciliação de todos os pedidos. O recibo fica em `.cache/zapvideo/google-pilot`. O segredo deve ser instalado no ambiente do ZapVideo. Um segredo vinculado ao Worker GDA pertence àquele runtime.

### Montagem

Organize os planos em ordem e vincule uma tomada, B-roll, quadro ou clipe verificado a cada um. Escolha 9:16 ou 16:9, informe a duração, adicione títulos com entrada animada, selecione a aproximação suave nas imagens e marque se quer manter o áudio da tomada. A narração é selecionada por cena. A trilha e o SRT podem ser selecionados para o vídeo. A amostra tem exatamente 5 segundos. Quando a cena indicada tem uma seguinte, a amostra inclui a transição. A montagem precisa de pelo menos 5 segundos de material. O piloto aceita 16 planos e 120 segundos. O FFmpeg preserva os materiais enviados e valida o MP4 H.264/AAC de saída.

O botão de montagem completa exige que a pessoa apresente a prancha de moodboard, styleframes e storyboard, o animatic e a amostra verificada. O aceite grava os três hashes e a marca digital da versão dos planos e insumos. Editar um título, mudar o tempo, trocar um material ou mudar a trilha invalida o aceite da montagem. Todo resultado sai como prévia para revisão audiovisual.

```sh
npm run video -- assemble --preset projeto-video.json --out entrega-amostra
```

Para clipes vinculados, guarde o MP4 com o ID do job seguido de `.mp4` e indique `--clips pasta`. O modo local `--phase full --workflow workflow.json` exige o aceite do fluxo completo e a chave `assemblyBasisSha256` com o `basis` da mesma amostra, disponível em `relatorio-tecnico.json`. [Protocolo visual](VISUAL-APPROVAL.md).
