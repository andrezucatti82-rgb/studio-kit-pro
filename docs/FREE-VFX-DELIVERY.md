# Entrega da toolchain VFX gratuita — 18/11/2026

Studio Kit Pro 2.14.0. A implementação integra 15 ferramentas livres à coordenadora única e aos sete módulos internos, ao runtime, ao instalador por sistema e ao prompt de produção. O instalador baixa programas e pesos oficiais quando disponíveis; o ZIP não contém os 4,3 GB do ambiente do mantenedor. Não transfere contas nem instala aplicativos por importar uma skill no ChatGPT.

## O que foi acrescentado neste ambiente

Já existiam FFmpeg/FFprobe, Blender, Kdenlive e MLT. Foram acrescentados Natron, Shotcut, G’MIC, frei0r, OpenFX-Misc, OpenCV, MoviePy, SAM 2, Robust Video Matting, ComfyUI, RIFE e Video2X, com dependências Python isoladas, pesos oficiais selecionados e Mesa lavapipe para Vulkan em CPU. Não há GPU física verificada. O lançador ComfyUI desativa nós de API e customizados, usa CPU e localhost; o código upstream inclui nós de APIs comerciais, que não participam desta rota.

## Provas e limites

257 testes Node e 9 Python passaram; TypeScript e validação do projeto passaram. A revisão de código identificou e motivou correções com testes para sobrescrita por relatórios, disputa de saídas, Python incompatível, propagação do bloqueio Natron, lançador ComfyUI e recuperação dos downloads em falha de publicação. Saídas são renderizadas em arquivo privado e publicadas sem substituir destinos existentes.

As 15 ferramentas foram verificadas no Linux: 13 passaram em processamento/render/inferência; Kdenlive e Shotcut passaram em inicialização/versão. SAM 2 e RVM produziram máscaras de vídeo. RIFE interpolou vídeo real de teste com áudio pelo adaptador do kit; o script upstream antigo não é a rota suportada. Video2X ampliou e decodificou um clipe usando Vulkan em CPU. ComfyUI executou um nó local, sem checkpoint generativo nem API. Evidências sanitizadas: [verificação](vfx/free-toolchain-verification.json).

Os clipes são sintéticos: isso não certifica acabamento em filmagem real, playback/escuta ou aprovação criativa. Windows/macOS possuem rotas e bloqueios explícitos, mas não foram testados nativamente. Algumas ferramentas requerem download oficial manual nesses sistemas. O Python científico fixado suporta 3.10–3.12; o bootstrap procura 3.12 e pode prepará-lo em ambiente privado no Linux.

## Distribuição e convivência com a interface

A implementação incorporou a interface e a ajuda mais recentes de origin/main (96cd5fa), sem editar index.html, CSS ou menus da outra sessão. O espelho recebe apenas instalador, tutorial, metadados e o aviso textual da nova rota no prompt. A skill VFX privada do ChatGPT foi atualizada para 1.1.0; a coordenadora local e a skill VFX externa foram atualizadas com backups.

A API do domínio principal em br154.hostgator.com.br:2083 retornou HTTP 403 nesta sessão; o proxy cPanel do domínio também retornou 403. Nenhum arquivo foi escrito nessa hospedagem. A publicação do instalador e do prompt novos nesse domínio permanece pendente de acesso funcional. O script de atualização de downloads restringe destinos, cria backups, verifica hashes e restaura arquivos em falha; não substitui a interface. GitHub e site espelho são destinos independentes desse bloqueio. Recibos de publicação ficam em deployment-backup/ local, fora do Git, e devem ser conferidos antes de afirmar publicação concluída.

## Exemplos que os recursos permitem

- Recortar um apresentador com RVM, refinar bordas e compor um cenário no Natron/FFmpeg.
- Selecionar um produto com SAM 2 e colocar texto ou brilho atrás dele, preservando o produto e revisando a máscara.
- Trocar a tela de um celular com tracking, corner pin, máscara dos dedos e reflexos no Natron/Blender.
- Integrar fumaça, partículas, fogo ou objeto 3D com Blender, passes de luz/sombra e composição.
- Limpar fios ou microfone com clean plate e roto; não é remoção automática universal.
- Interpolar 24 para 48 fps com RIFE e ampliar vídeo com Video2X, revisando oclusões e detalhes inventados.
- Processar lotes de cortes, glow, lentes, chroma e composição por CLI, preservando originais.

As operações de máscaras, filtros, composição, interpolação e upscale têm comandos integrados; tracking, cleanup e simulação exigem projeto e execução específicos de cada plano. Consulte [guia da toolchain](FREE-VFX-TOOLCHAIN.md).
