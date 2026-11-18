# Integração com studio-kit-pro

## Contrato de responsabilidades

A coordenadora `video-multimarcas` mantém briefing, roteiro, estilo, orçamento, aprovações e entrega. `video-vfx` é o módulo pertencente ao kit, adaptado da VFX Effects 1.0.0 disponibilizada pelo usuário. A skill externa `vfx-effects` permanece independente. Se ambas estiverem instaladas, execute a responsabilidade uma vez. O fluxo guiado e `coordinator-plan.json` continuam o contrato único; VFX não cria outro roteiro, orçamento ou cadeia de aprovações.

| Responsável | Mantém | Recebe de VFX |
| --- | --- | --- |
| Coordenadora | Briefing, decisões, estilo, orçamento, aprovações, status geral | Viabilidade, dependências, plano VFX e evidências |
| Direção | Moodboard, styleframes, storyboard, invariantes | Frames/diagramas propostos e impacto técnico |
| VFX | Tracking, roto, key, cleanup, CG/FX, cor e passes por plano | Inputs aprovados, plate e contrato de entrega |
| Edição/motion | Timing, texto, legendas, locução, SFX e integração | Comp/render e manifesto de frames/cor/alpha |
| Revisão | Comparação e reprodução do arquivo integrado | QA do plano, versões, falhas conhecidas |

O mesmo executor pode cumprir funções diferentes; não alegar revisão independente nem agentes paralelos sem execução real. Para usuário final, traduza decisões técnicas em resultado e materiais necessários.

## Acionar a skill

Pedido combinado: “Use $video-multimarcas. Quero substituir a tela do celular no shot-03, mantendo mão, reflexos e interface fiel.”

Pedido isolado: “Use $video-multimarcas para VFX. Remova o boom deste clipe e preserve a textura do teto.”

O contrato compartilhado `style-atlas/dist/workflow.js` calcula a rota v3 pelas contribuições/escopos e campos positivos da receita. `masks`/`effects` exigem diagnóstico VFX; direção/movimento/profundidade trazem somente as técnicas pertinentes. Paleta, tipografia e som isolados não importam composição ou pessoa. `productionContract.vfxInput` lista as contribuições que motivaram a rota. A detecção orienta o breakdown; não comprova executor e não cobre todo pedido futuro. Um ajuste explícito na conversa também pode exigir VFX: a coordenadora registra a alteração de escopo/dependências sem modificar bytes/hash do contexto importado. Motion gráfico simples fica em edição. Para outro orquestrador, forneça IDs, assets, decisões, evidências e próxima dependência; não presuma skill instalada na conta destino.

## Registros do projeto

1. Salve em `projects/<slug>/` (ignorado). Reutilize `brief.json`, `shot-plan.json`, `style-execution-plan.json`, `fidelity-plan.json`, `preproduction-plan.json`, `coordinator-plan.json`, `workflow.json` e `review.json` quando existentes.
2. A importação de uma seleção VFX prepara `vfx-plan.json` e `vfx-review.json`, sem sobrescrever arquivos existentes. Para ajuste posterior, copie os templates deste módulo. Associe cada efeito a `styleId/aspect/scope`, `coordinatorShotId`, `shotPlanId` e `fidelityShotId` reais. Preserve IDs; não renumere planos. Templates vazios são planejamento. Esses registros auxiliares **não são entrada schemaVersion 2 do renderizador**.
3. No registro existente de coordenação, associe o trabalho às responsabilidades `production`, `editing` e `review`, apontando `vfx-plan.json` em inputs/outputs/evidence pertinentes. Não adicione enum de papel ou etapa a validadores existentes sem suporte. Não substituir o `coordinator-plan.json` por um exemplo desta skill.
4. Os registros da coordenadora são a fonte das decisões e aprovações. O plano VFX aponta para eles; divergência requer conciliação antes da ação dependente. Mensagem literal/ID, arquivo e hash/versão comprovam o escopo do aceite; status importado não o concede.
5. Mudou plate, track, matte, comp ou cor? Crie nova versão, liste resultados dependentes e invalide somente revisões/aceites afetados. Preserve histórico e retome da primeira dependência pendente.

## Gates existentes

No repositório, leia `docs/VISUAL-APPROVAL.md`, as referências da coordenadora (`universal-visual-approval.md`, `preproduction-approval.md`, `execution-fidelity.md`, `natural-finish.md`, `identity-preservation.md`) e o workflow do projeto antes da produção pertinente.

Execute a partir da raiz do kit, com os caminhos reais:

```bash
node scripts/workflow-gate.mjs ai-video projects/<slug>/workflow.json
node scripts/workflow-gate.mjs full-render projects/<slug>/workflow.json
node scripts/workflow-gate.mjs deliver projects/<slug>/workflow.json projects/<slug>/candidate/video.mp4
```

São etapas distintas: execute cada comando somente quando chegar à etapa correspondente. O primeiro antecede chamadas de geração IA; não é necessário para apenas escrever breakdown. Gate não gera, revisa ou aprova o vídeo e não controla aplicativos externos globalmente. Custos e autorizações continuam com a coordenadora. A preferência por HeyGen no kit aplica-se à geração de clipes compatíveis, não à escolha forçada de compositor/solver de VFX.

## Integrar o render

Finalize o plano no compositor/DCC disponível e exporte clipe/passes acordados. Para montagem no renderer atual, use clipe de vídeo compatível como mídia da cena; preserve tempo e cor. Transparência, EXR/multicanal e outras resoluções precisam de pipeline verificado ou adaptação explícita, não de campos inventados em `project.json`. Leia `src/Film.tsx`, `templates/project.json` e `docs/MIGRATION-2.md` se for integrar no código.

Amostra integrada deve demonstrar o efeito mais difícil no contexto com passagem, texto e áudio pertinentes, conforme a coordenadora. Um teste técnico do plano não aprova o vídeo de marca. Arquivo alterado perde revisão vinculada ao hash anterior.

## Instalação

O kit registra somente `video-multimarcas` para Codex/Claude Code. `video-vfx` é um módulo interno em `references/skill-modules/`, com instruções, referências e templates. A integração não instala compositor/DCC/plugins, conecta contas ou atualiza automaticamente ChatGPT/Claude e o site público. Em chat sem execução, conclua planejamento/diagnóstico possível e identifique a capacidade necessária para produzir o arquivo.
