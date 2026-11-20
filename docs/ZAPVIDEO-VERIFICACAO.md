# Verificação do ZapVideo em 19 de novembro de 2026

Base remota `origin/main` em `86b09382` (PR #52). Implementação isolada em `codex/zapvideo-online`. O checkout principal tinha alterações e referências do usuário. Foram encontradas 25 imagens na pasta de referências, usadas como mockups para o fluxo de edição e a identidade do aplicativo.

| Função | Resultado |
| --- | --- |
| Entrada editar/criar, formulário manual, resumo, TXT e ficha | Passou em Chrome desktop e mobile. Navegação por teclado e foco no formulário no desktop. |
| ZIP com originais e manifesto | Passou em desktop e mobile. CRC do ZIP verificado e originais comparados byte a byte. |
| SRT + vídeo | Passou pela CLI e pelo Worker local com FFmpeg. MP4 H.264/AAC e SRT separado, com texto acentuado. |
| Três cortes verticais, quadro ajustável, som e cor | Passou pela CLI e pelo Worker local. Três MP4 720×1280, conferência de tempo, áudio e decodificação. |
| Vídeo sem áudio, rotação, VFR e arquivo corrompido | Passou em teste FFmpeg. O original rotacionado preservou a orientação. O arquivo corrompido foi recusado. |
| Sugestões de corte com transcrição fornecida | Passou no navegador com SRT temporizado e no teste da função de agrupamento. A transcrição automática segue indisponível. |
| Upload, isolamento e entrega | Passou no emulador usando D1, R2 e Workflows. Retomada após a primeira parte, rejeição de parte inválida, finalização idempotente, acesso cruzado negado, clique duplicado, cancelamento, Range e arquivos expirados. |
| Pacote temporário | Passou do Worker local ao importador. Comparação do original com o arquivo recuperado. A CLI importou os materiais e abriu os originais com hashes de saída iguais aos do Workflow. A rota HTTPS canônica do pacote ainda precisa de prova remota. |
| Catálogo e instalador | Staging emulado pediu autenticação. Catálogo de 35.311.530 bytes com ETag e 304 na revalidação. ZIP do instalador com 200. PHP com 404 no Worker. |
| Gemini, proposta e análise por fonte | Simulados. Delimitação de permissões, preservação de edições mais recentes, resposta inválida e erro do provedor testados. Nenhuma chamada real de IA. |
| Gemini, clipe isolado por plano | Passou no modo simulado local. Quadro apresentado e registrado por SHA-256, aceite com texto literal, estimativa separada, trabalho idempotente, MP4 720×1280 H.264/AAC com 3 segundos verificado, download e vínculo ao plano. O adaptador Omni foi testado com respostas simuladas. |
| Gemini, quadro, narração e trilha | Percurso local simulado entregou JPEG vertical, WAV mono e MP3 estéreo de 30 s. O navegador adicionou o quadro ao projeto e abriu sua revisão antes do aceite do clipe. |
| Montagem | Prova do Worker local gerou amostra de 6 s e montagem de 9 s com três cenas, títulos, movimento, narração, trilha e SRT. A CLI reproduziu os mesmos hashes. O Worker recusou montagem completa sem aceite e com título alterado após o aceite. |
| Acesso ao Google | O segredo existe no GDA. O ZapVideo não tem Worker remoto nem credencial local. A requisição real segue sem ocorrer. O teto autorizado é R$ 50 por dia e o staging reserva no máximo US$ 5 em 24 horas. |
| Container remoto | Configurado no manifesto, com o dry-run do Worker concluído sem rollout. O dry-run que compila a imagem parou por falta do Docker. Sem prova de uso de CPU, disco, memória ou tempo no Container remoto. |
| DNS, TLS e publicação | DNS público inventariado. A zona ainda não foi criada na Cloudflare. Delegação, vínculo do Worker e HTTPS do aplicativo seguem pendentes. |

As provas usam mídia sintética. Um MP4 foi reproduzido até o fim em Chromium. Foram inspecionados um quadro com legenda queimada, a decodificação de todos os arquivos e métricas do sinal de áudio, com média de −18,3 dBFS e pico de −13,3 dBFS na prova legendada. Os arquivos estão marcados como prévias para revisão.

Na prova de clipe, o navegador exibiu a imagem real usada na simulação antes do aceite de teste. O Worker recusou aprovação sem confirmação visual, imagem trocada, acesso cruzado, confirmação de valor ausente e uso de estimativa de outra revisão. Permitiu reutilizar o aceite após uma edição em outro trecho. Uma alteração de direção no plano invalidou o aceite. Teste separado com SQLite e fila simulada confirmou orçamento zero, limite cumulativo, reserva em USD e bloqueio de nova tentativa após estado incerto. A migração `0003_clip_approvals.sql` passou localmente nos três ambientes.

## DNS observado

Cloudflare DNS e Google Public DNS responderam com os mesmos dados principais.

| Nome e tipo | Resposta |
| --- | --- |
| `zapvideo.com.br NS` | `dns3.hostgator.com.br.`, `dns4.hostgator.com.br.` |
| `zapvideo.com.br A` | `162.240.81.81` |
| `zapvideo.com.br MX` | Prioridade 0 para `zapvideo.com.br.` |
| `zapvideo.com.br AAAA, CNAME, TXT, CAA, DS` | Sem resposta para esses tipos no apex. |
| `www.zapvideo.com.br CNAME` | `zapvideo.com.br.` |
| `mail.zapvideo.com.br CNAME` | `zapvideo.com.br.` |

A consulta autenticada à conta Cloudflare exibiu zero zonas com esse nome. O OAuth do Wrangler tinha leitura de zona, sem escrita; o endpoint de assinaturas recusou o acesso. Os painéis dos portais também ficaram inacessíveis no mecanismo de controle da interface. O endereço apex e a variante www atingiram timeout no teste HTTPS. A página anterior respondeu 200. Catálogo, instalador, helper de imagens e instruções legadas responderam 200 na base publicada `/atlas-20261120002100/`. A rota legada `cloud-handoff.php` respondeu 405 a HEAD, coerente com a implementação antiga. A compatibilidade do importador foi testada com pacote sintético e a allowlist da rota anterior.

A troca do apex exige confirmação no portal dos registros de e-mail. O MX e o alias `mail` dependem atualmente do apex. Os dois nameservers acima são o caminho de retorno da delegação, sujeito ao inventário completo dos registros e à conferência de DNSSEC/DS no registrador. Nenhum DNS, serviço existente ou plano foi alterado. A prova não consumiu chamadas pagas.


## Homologação protegida em 20 de novembro de 2026

A branch incorporou a `origin/main` em `74d45378` e preservou as atualizações do catálogo, do guia e de tipografia. O commit `bd23328c` configurou o D1 de staging e a prova automatizada da imagem Linux. O [build 44695830780](https://github.com/andrezucatti82-rgb/studio-kit-pro/actions/runs/44695830780) compilou e rodou a imagem com 1 vCPU e 6 GiB como limites. Edição legendada, três cortes verticais com áudio e SRT passaram em 5,2 segundos no teste sintético. Os hashes dos cinco arquivos corresponderam ao relatório de saída. A medição é do runner Linux.

| Item | Resultado em homologação remota |
| --- | --- |
| Worker e acesso | HTTPS em `zapvideo-staging.andrezucatti82.workers.dev`, com 401 sem credencial e 200 com credencial. Chrome abriu a interface em 390 e 1280 px e acionou a edição por teclado. |
| Catálogo, instalador e PHP | Catálogo de 35.311.566 bytes entregue pelo R2. SHA-256 verificado e 304 com ETag. O instalador baixado correspondeu ao hash de seu manifesto. A rota PHP devolveu 404. |
| D1, R2 e Workflows | Cinco migrações aplicadas. Dois buckets e um Workflow exclusivos de staging. Upload de vídeo retomado depois da primeira de duas partes. Reenvio idempotente, parte inválida recusada e ficha privada para seu proprietário. |
| Pacote criptografado | O mesmo importador de produção consumiu as respostas do staging em uma prova autenticada. Original e SRT recuperados com SHA-256 idênticos. URL canônica ainda pendente. |
| Container | Imagem Linux enviada ao registro privado e configuração criada no staging. SHA-256 da imagem `514236ab2d1f12f595d3520d981cb2996c2f9374ac5f3e0dfdbf5d4602545ba5`. Render remoto desligado até autorização. |
| Google e domínio | Segredo Gemini ainda ausente no ZapVideo. Consumo de Google R$ 0. Os dois resolvedores ainda mostraram os nameservers da HostGator. A conta Cloudflare não exibiu zona de `zapvideo.com.br` e o acesso disponível permite leitura. |

A consulta de uso da Cloudflare apontou 45,514 GiB-h de memória antes da prova remota do ZapVideo, acima dos 25 GiB-h mensais incluídos no Workers Paid. A prova com FFmpeg remoto depende de aceite de custo próprio. Os portais da Cloudflare e da HostGator ainda são necessários para criação da zona, conferência do e-mail e delegação. [Preços de Containers](https://developers.cloudflare.com/containers/platform/pricing/).


### Prova de edição e montagem no Container remoto

A edição passou da API ao Container da Cloudflare em 36,2 segundos, incluindo a confirmação dos downloads. Entregou MP4 640×360 de 6,07 s, três MP4s 720×1280 e um SRT acentuado. Os quatro MP4s foram decodificados novamente em outro processo. Houve confirmação de AAC, SHA-256, Range válido e inválido, autenticação, isolamento por proprietário e idempotência.

A primeira amostra de montagem passou. O primeiro job completo falhou antes do FFmpeg enquanto duas instâncias antigas ainda estavam em execução. Após implementar o encerramento explícito por job e por inatividade, o staging gerou amostra de 6,008 s e montagem de 9,008 s com três cenas, títulos, animação de imagem, voz sintética, trilha e SRT. Ambos os MP4s passaram por verificação e decodificação independente em 720×1280, H.264 e AAC. A mesma base de materiais foi confirmada nas duas saídas. O teste recusou a montagem completa sem aceite, rejeitou o aceite de outra pessoa e detectou alteração de título após o aceite. Os aceites usados pertencem à fixture sintética de engenharia.

A versão protegida voltou a desativar o render depois dos testes. O painel registrou zero instâncias em execução. A estimativa conservadora para as métricas de Containers do ZapVideo foi de aproximadamente R$ 0,13, antes da fatura, usando tarifas de excedente até para itens ainda dentro da franquia. O Google segue com R$ 0. [Preços de Containers](https://developers.cloudflare.com/containers/platform/pricing/).

### Zona de produção

A zona `zapvideo.com.br` foi criada no plano gratuito da Cloudflare e confirmada pela API como pendente. O par atribuído é `annabel.ns.cloudflare.com` e `valentin.ns.cloudflare.com`. A zona importou o A 162.240.81.81, os CNAMEs `ftp`, `mail` e `www` e o MX prioridade 0, com proxy desligado. Os resolvedores ainda exibem `dns3.hostgator.com.br` e `dns4.hostgator.com.br`. A aba do registrador está na tela de login, necessária para conferir e preservar os registros de e-mail antes da delegação.

No Google AI Studio, a busca por ZapVideo nos projetos disponíveis retornou zero resultados. As chaves importadas pertencem ao GDA Insight Flow. A criação de projeto e chave exclusivos do ZapVideo aguarda confirmação na sessão do Google.

O Worker de produção `zapvideo` foi provisionado na versão `0721d342-755b-4a99-81f0-d65d8af93fe3`. Tem D1 migrado, dois buckets próprios, catálogo versionado, Workflow e Container dedicado. A API confirmou `workers.dev` e URLs de prévia desativados, zero domínios vinculados e zero instâncias em execução.

## Publicação no domínio canônico em 20 de novembro de 2026

A HostGator confirmou a delegação de `zapvideo.com.br` para `annabel.ns.cloudflare.com` e `valentin.ns.cloudflare.com`. A zona ficou ativa e os resolvedores 1.1.1.1 e 9.9.9.9 confirmaram o novo par. Às 13h24 de Brasília, o Google Public DNS ainda retornava os servidores anteriores do cache. O Chrome local e a CLI abriram o endereço canônico pela resolução normal.

O inventário privado anterior à mudança registrou os servidores da HostGator, os cinco registros, a ausência de DS e o destino de e-mail. A HostGator listava zero caixas de e-mail para o domínio. Antes de substituir os registros do site, foram criados registros A sem proxy para `mail` e `ftp`, ambos em `162.240.81.81`, e o MX do apex passou a apontar a `mail.zapvideo.com.br` com prioridade 0. Os dois servidores autoritativos confirmaram o MX e os endereços preservados.

| Função | Resultado publicado |
| --- | --- |
| Domínio e TLS | `zapvideo.com.br` e `www.zapvideo.com.br` vinculados ao Worker `zapvideo`, versão `50212cef-04a3-43f1-a3f6-2e694c760206`. Certificados válidos. O HTTP e o www redirecionaram com 308, preservando caminho e parâmetros. |
| Página e catálogo | Página inicial, navegação por teclado no desktop, fluxo de criação a 390 px e carregamento da biblioteca verificados no Chrome. Metadados canônicos conferidos. Catálogo R2 de 35.311.566 bytes conferido por SHA-256 e revalidado com ETag e 304. |
| Prévia e instalador | O MP4 de catálogo amostrado foi servido completo com HTTP 200 e decodificado como H.264/AAC de 10 s. O ZIP do instalador (641.390 bytes) correspondeu ao SHA-256 do manifesto, revisão fonte `ecf30430`. Os arquivos privados de edição em staging passaram no teste de HTTP Range. |
| Pacote para Codex e Claude Code | O importador recuperou vídeo sintético e SRT pelo URL HTTPS canônico. Os dois arquivos recuperados eram idênticos aos originais e o FFprobe abriu o vídeo. Upload anônimo recusado com 401, identificador inexistente e pacote expirado devolveram 404. A credencial de teste foi revogada. |
| API e endereço anterior | Sessão sem código devolveu 401. A rota PHP no novo domínio devolveu 404. A página de vídeos do GDA continuou a responder 200. |
| Edição e montagem online | A prova completa de FFmpeg passou em staging. A configuração pública oferece ficha, ZIP, instalador e encaminhamento criptografado. Renderização em produção segue desativada. |
| Gemini com o projeto GDA Insight Flow | Uso autorizado para o staging protegido, até R$ 50/dia em testes do ZapVideo. O segredo foi gravado no Worker de staging, mas seu valor falhou na checagem de formato. O teste parou antes da consulta ao Google e da geração. As capacidades Gemini seguem desligadas. |

O retorno está documentado em [ZapVideo](ZAPVIDEO.md#retorno). O inventário privado preserva os cinco registros anteriores e o par original de servidores para restauração.

### Gemini conectado à homologação

O segredo instalado no Worker de staging autenticou a Gemini Developer API pelo projeto GDA Insight Flow. A listagem e a consulta individual dos modelos `gemini-nano-banana-2.1`, `gemini-3.8-flash-tts`, `lyria-3-clip-preview` e `gemini-omni-1.2-flash` retornaram HTTP 200. Foram feitas chamadas de geração apenas para imagem.

A prova expôs duas incompatibilidades. No Worker, chamadas com o modo de redirecionamento `error` paravam antes de sair da Cloudflare. A implementação passou a usar `manual` e interrompe o pedido diante de um redirecionamento inesperado. A primeira resposta de geração chegou com HTTP de sucesso, mas o ZapVideo não encontrou um identificador utilizável. A reserva desse trabalho foi preservada. A leitura da resposta passou a aceitar mídia válida em uma interação com armazenamento desativado quando não há um identificador utilizável. O estado no D1 e a cópia privada no R2 evitam repetir a geração do mesmo trabalho. [API de Request da Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/request/) · [Retenção da Interactions API](https://aistudio.google.com/docs/interactions-overview#data-storage-retention).

Um trabalho separado confirmou o percurso completo. O Nano Banana 2.1 entregou um JPEG vertical de 768 × 1.376 pixels (535.346 bytes). O Container verificou o formato e a decodificação, o download exigiu a credencial temporária e o SHA-256 conferiu com o arquivo guardado. Reenviar a mesma confirmação devolveu o mesmo trabalho. O resultado permaneceu em revisão visual. SHA-256 `af8e54ec85f98bb981b243e8ac211d543f5182bf681ae288a38e86026a4b98ef`.

Foram reservados US$ 0,10 por trabalho, US$ 0,20 ao todo. A fatura do Google ainda não foi conciliada. A credencial temporária do teste foi revogada. O segredo Google ficou na homologação e as capacidades de geração voltaram a ficar desativadas após a prova. A geração de áudio e vídeo continua pendente de teste real.

### Briefing e áudio em homologação

| Prova | Resultado |
| --- | --- |
| Briefing | O primeiro pedido com Gemini 3.1 Flash-Lite foi recusado. Um segundo trabalho com Gemini 3.8 Flash e esquema de resposta simplificado entregou uma proposta de três cenas e seis planos. A ficha do projeto permaneceu igual à revisão enviada. O Worker recusou a solicitação paga sem confirmação do valor e devolveu o mesmo trabalho no reenvio. |
| Narração | Gemini 3.8 Flash TTS gerou uma prévia de 6,8 s com a voz Kore. O WAV foi decodificado em PCM de 16 bits, mono, a 24 kHz. O download protegido conferiu por SHA-256. |
| Trilha | Lyria 3 Clip Preview gerou uma prévia de 30,77 s. O MP3 estéreo a 44,1 kHz passou na decodificação e conferiu por SHA-256 no download protegido. |
| Clipe vertical | A prancha v1 apresenta três enquadramentos de um plano contínuo de 3 s, em 9:16. A checagem bloqueou a geração até o aceite visual explícito. SHA-256 da prancha `825e29d4dc5f35520c81eed7f0b4a60f05a2eedaef40587b0c3bc60c9717c6cf`. |

Os quatro trabalhos desta rodada reservaram US$ 0,13. A soma com os dois pedidos de imagem chegou a US$ 0,33. A cobrança efetiva segue pendente de conciliação. As prévias de áudio têm verificação técnica e revisão de escuta pendente. A credencial de teste foi revogada e a homologação voltou à configuração protegida com os geradores desligados.

### Tentativa real do clipe vertical

A aprovação visual da prancha v1 e do limite de US$ 0,30 foi registrada antes do teste. O gate executável validou os hashes. A homologação habilitou apenas o clipe Gemini Omni 1.2 Flash com reserva máxima de US$ 0,30 para o teste. A configuração do projeto usou o primeiro quadro autorizado, um plano contínuo de 3 s, proporção 9:16 e saída 720p.

O Worker validou o aceite, recusou uma solicitação sem confirmação de valor e disparou a mesma estimativa em um único trabalho. O Workflow registrou uma tentativa de envio e a recusa do Google. O D1 ficou em `failed`, sem identificador de interação ou arquivo. O painel do projeto mostrou HTTP 400 na janela do teste. A métrica é agregada e a versão do ZapVideo usada para o envio guardava uma mensagem genérica. O campo que motivou a recusa continua desconhecido.

A reserva de US$ 0,30 foi mantida para conciliação. Após o teste, a homologação voltou à configuração protegida com o clipe desativado. A implementação passou a registrar o código HTTP e, quando disponível, um campo reconhecido da solicitação. A cobertura simulada confirma que texto bruto e campos desconhecidos do Google ficam fora do diagnóstico.

### Causa do HTTP 400 e prova com entrega direta

Um reteste com a mesma prancha e os mesmos parâmetros reproduziu o HTTP 400. A Gemini Developer API confirmou que a entrega por URI exige `store=true`. O pedido combinava `delivery: "uri"` com `store: false`. A implementação passou a pedir `delivery: "inline"`, mantendo `store: false`, e grava os bytes no R2 privado antes de liberar o MP4 pelo verificador.

A prova corrigida usou a mesma prancha v1 e o mesmo SHA-256 do quadro de partida. O Gemini Omni 1.2 Flash gerou um MP4 de 1.746.255 bytes. O vídeo tem 3,000 s, 720 × 1.280, 72 quadros em H.264 e uma faixa AAC estéreo de 48 kHz. O Container verificou a duração, a proporção, os codecs e a decodificação. O download protegido devolveu o mesmo SHA-256, `8526d6dbee7ccf5b0757f423a3b35694489eaa35fee3ea1ef7e1239553907649`. Uma decodificação independente leu o arquivo inteiro. Sete quadros mostraram a aproximação contínua sobre os três cartões. A faixa ficou abaixo de −35 dB em toda a duração pela medição do FFmpeg. O resultado segue como prévia para revisão.

O reteste de diagnóstico e a prova corrigida tiveram reservas separadas de US$ 0,30. A API recusou o reteste na validação de parâmetros. A cobrança efetiva segue pendente de conciliação. A configuração temporária foi removida e o gerador voltou a ficar desativado na homologação.

### Piloto no domínio oficial

A produção em `zapvideo.com.br` recebeu a versão `9da89449-9602-4707-be3d-054f8b7afc47`. A janela de teste termina em 21/11/2026 às 17h26, horário de Brasília, com um código temporário e teto de reservas Google de US$ 2,50 no ZapVideo de produção. O Service Binding leva as chamadas Gemini ao ponto de entrada privado da homologação, versão `39c50a43-e147-48e7-8443-3320a0e327db`. Os projetos e arquivos do site usam D1, R2 e Workflows de produção.

O Chrome exibiu a tela pública do piloto com os controles de geração bloqueados até conectar. A sessão sem código respondeu 401, código válido conectou e outro proprietário recebeu 404 ao consultar a ficha de teste. O Gemini 3.8 Flash gerou um briefing de quatro cenas, com uma reserva de US$ 0,03. O site recusou gerar a proposta sem aceite do valor. Quadro, voz e trilha devolveram estimativas e a cotação de clipe sem aprovação visual foi recusada.

A edição sintética em produção gerou MP4 legendado, SRT separado e três cortes verticais. O download retornou o SHA-256 esperado, devolveu 206 para um intervalo de bytes e exigiu a credencial temporária de arquivo. O piloto disponibiliza montagem, briefing e geração de quadro, narração, trilha e clipe. A análise automática de materiais e a transcrição continuam desativadas. A página inicial, o catálogo, o manifesto do instalador e o endereço anterior responderam HTTP 200. O www preservou o caminho ao redirecionar.
