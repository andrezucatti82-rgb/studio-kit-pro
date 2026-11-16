# Evidências da integração 2.11.0

Esta validação distingue software, renderização real, conexões e publicação. Não concede aprovação estética nem autoriza chamadas pagas futuras.

## Percurso realmente executado

1. Chromium abriu a galeria local com o mesmo frontend preparado para publicação, selecionou `tipografia-cinetica`, informou o assunto de engenharia e baixou `projeto-video.json` pelo botão da interface.
2. O arquivo baixado incluiu `orchestrator.runtimeVersion:2.11.0`, seleção, formato, duração, briefing e instruções de execução. Foi importado pelo comando público `npm run video -- import`, não por um conversor paralelo de teste.
3. O contexto conservou a escolha, quatro referências e a contribuição `style_direction/film`; mídia óptica original foi criada pelo gerador local e registrada com procedência/rights. Não houve stock externo, voz pessoal ou geração cobrada.
4. Um plano declarativo autorado para o teste, com `provider:agent`, cenas/camadas e bindings do estilo, passou no validador. O worker executou edição FFmpeg, Remotion e verificação integral.
5. `npm run video -- stills` produziu os quadros das quatro cenas pelo mesmo plano. A entrega aprovada permaneceu bloqueada pela ausência de revisão/aceites reais, como esperado.

Pasta privada da evidência: `projects/site-agent-proof/project-final/`. Job `fe7abe8e-34cb-45c4-9f9a-022764145857`, em `runtime/jobs/`.

| Medida | Resultado |
|---|---|
| Estado técnico | `completed`, progresso 100 |
| Revisão | `review_pending` |
| Duração / frames | 30,000 s / 900 |
| Resolução / FPS | 1280×720 / 30 |
| Vídeo / áudio | H.264 / AAC estéreo 48 kHz |
| Bytes | 3.978.107 |
| SHA256 | `baeabce735245561ef398d3a3330098d75fc6c178fc109324a21eb45244ddfec` |
| Loudness / true peak | −16,01 LUFS / −5,03 dBTP |
| Decodificação / conformidade | Passaram |

O plano usa quatro durações explícitas de 6, 8, 9 e 7 segundos, duas mudanças por corte e um wipe motivado no encerramento, mídia original em janela preservada, tipografia por palavra/caractere, formas, caminho SVG e música original. Não usa o layout/paleta fixa do executor anterior nem um MP4 anterior como substituto. Foram produzidos 13 quadros de inspeção; não equivalem a playback/escuta integral.

O harness `site-handoff-proof.mjs` aceita apenas o assunto, estilo e formato fechados dessa fixture e valida os hashes da mídia original que ele mesmo criou. Não está exposto pela API e não autoriza uploads arbitrários, produção comercial ou vídeo IA sem seus gates. A prova é de engenharia; não representa uma conversa autônoma de um segundo modelo nem um teste real no Claude Code.

## Testes de software e navegador

A suíte existente foi preservada. Foram acrescentados testes para:

- Pedido, Page e pacote convergindo para um mesmo exportador e protocolo de execução.
- Importação da ficha inteira, todas as contribuições/escopos, referências e fonte; detecção de contexto alterado.
- Rejeição de estilo omitido/trocado, contribuição fora do escopo, referência inventada, comando, fonte insegura, mídia desconhecida e keyframes inválidos.
- Preservação de tipografia explícita, exigência de narração/legendas em anúncio narrado e avatar somente quando selecionado.
- Amostra com aprovações independentes, vinculada ao storyboard e executada sem replanejar depois do aceite.
- Ducking com ataque/release, sem reduzir a música por um SFX; looping de trilha autorizado por FFmpeg real, sem repetir narração silenciosamente.
- ZIPs Codex, Claude e runtime iguais à fonte canônica e aos hashes/versões do manifesto; exclusão de segredos e mídia privada.
- Instalação Claude de projeto com backup da versão anterior e preservação de outra skill.

Os testes de estados que usam stubs os identificam como bytes de teste; a renderização acima usa Remotion real. As fixtures de aprovação dos testes são sintéticas e não registram aceites do usuário em projetos reais.

O teste de navegador `tests/browser-guided-start.py` passou na galeria atual: cópia, destino Claude, downloads independentes, PNGs, importação, retomada, falha de armazenamento, teclado, movimento reduzido e larguras de 320 a 1920 px sem overflow. O pacote baixado pelo botão real também foi conferido; essa inspeção encontrou e corrigiu a duplicação anterior entre o exportador do botão e o kit de início.

Comandos de regressão: `npm run check`, `npm test`, `npm run validate`, `git diff --check`. Resultado: **162 testes JavaScript e 9 Python passaram**. O log completo fica no arquivo privado `projects/site-agent-proof/full-suite.log` e no resumo da entrega; nenhum resultado de geração externa é inferido desses testes.

## Pacotes e instalações

O runtime foi extraído numa pasta isolada, com verificação dos hashes internos, seguido de `npm ci`, `npm run check` e `npm run doctor`; esses passos passaram sem depender do checkout principal. O pacote não inclui todas as fixtures/imagens da regressão, conforme seu manifesto.

Codex CLI confirmou o plugin `video-multimarcas@video-multimarcas-kit` **2.11.0**, instalado e habilitado a partir do marketplace local desta versão. Isso confirma instalação neste ambiente, não em outro dispositivo. O helper de instalação de projeto foi exercitado para `.agents/skills` e `.claude/skills`, sem transferir contas ou credenciais.

Claude Code não está instalado neste ambiente: manifesto, arquivos de descoberta, pacote e instalador foram verificados, mas uma conversa/produção dentro do Claude Code local ainda precisa de teste ali. Nenhuma instalação remota no computador do usuário foi presumida.

## Conexões e publicação

As duas conexões HeyGen disponíveis autenticaram na mesma conta por uma consulta de leitura. Não houve geração ou cobrança. O token HTTP direto não foi copiado para o shell; ausência de `HEYGEN_API_KEY` não foi tratada como ausência dessa conexão.

O arquivo `.env.cpanel` foi criado apenas como template local ignorado pelo Git. O visualizador do aplicativo não permitiu edição; o usuário foi orientado ao mecanismo de variáveis do ambiente. Os valores não são solicitados no chat nem incluídos nos arquivos de distribuição.

A inspeção pública a partir deste ambiente retornou HTTP 406 para o domínio; a tentativa direta de Node sem proxy também falhou. Isso é uma limitação de acesso observada, não prova de que o site esteja fora do ar para pessoas. A publicação deve verificar backup e leitura do destino autorizado; não se deve declarar sucesso somente por um upload ou remover os gates de readback para contornar a restrição.

Esta versão prepara a integração e distribuição; publicação e merge devem ter recibos próprios. Nenhum claim de atualização do domínio é inferido da PR, dos pacotes locais ou da conexão HeyGen. Qualidade estética, escuta integral e homologação de todos os estilos permanecem avaliações distintas.
