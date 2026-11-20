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
| Gemini, geração de mídia e montagem completa | Clipe por trecho, imagens, TTS, trilha, montagem completa e seus novos gates no aplicativo seguem pendentes. As ferramentas e os gates do Studio Kit Pro continuam disponíveis no seu fluxo local. |
| Container remoto | Configurado no manifesto, com o dry-run do Worker concluído sem rollout. O dry-run que compila a imagem parou por falta do Docker. Sem prova de uso de CPU, disco, memória ou tempo no Container remoto. |
| DNS, TLS e publicação | DNS público inventariado. A zona ainda não foi criada na Cloudflare. Delegação, vínculo do Worker e HTTPS do aplicativo seguem pendentes. |

As provas usam mídia sintética. Um MP4 foi reproduzido até o fim em Chromium. Foram inspecionados um quadro com legenda queimada, a decodificação de todos os arquivos e métricas do sinal de áudio, com média de −18,3 dBFS e pico de −13,3 dBFS na prova legendada. Os arquivos estão marcados como prévias para revisão.

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
