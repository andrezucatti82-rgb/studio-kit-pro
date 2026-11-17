# Tratamento dedicado e auditoria de capacidades

Escopo solicitado: identificar a skill de tratamento e, sem módulo dedicado, criar uma especialidade; comparar o código com as seis áreas técnicas fornecidas. Entrega na PR #20 para revisão, sem merge/publicação e sem APIs pagas.

- [x] Baseline: avaliar cor HDR/Log, master 10-bit, restauração, áudio multicanal e diferenças entre renderizadores. Existiam instruções em edição/revisão, mas nenhum módulo dedicado.
- [x] Reproduzir ausência do módulo/diagnóstico em testes antes da implementação.
- [x] Criar skill com matriz de 70 capacidades e limites explícitos, sem atribuir ao kit filtros externos.
- [x] Criar inspeção somente leitura de fonte/saída, mantendo interpretação desconhecida e revisão não executada.
- [x] Integrar registro, prompts/JSON do site, instalador, plugins e runtime. Rota v2 acrescenta tratamento; preservar pedidos/contextos v1 válidos.
- [x] Regenerar arquivos de distribuição, executar testes/verificações e revisão independente; corrigir falhas encontradas.
- [x] Preparar a atualização da PR #20 com evidência e manter revisão pendente do mantenedor.

Fluxo: video-multimarcas coordena planejamento e especialidades → video-edicao → video-tratamento → video-revisao. Uma correção local executa apenas etapas afetadas. Skill é responsabilidade/instrução; processador precisa existir e ser testado.
