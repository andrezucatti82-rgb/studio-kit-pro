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
