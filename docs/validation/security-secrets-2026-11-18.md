# Revisão de segredos publicados — 18/11/2026

Repositório: `andrezucatti82-rgb/studio-kit-pro` (público). Revisão realizada sobre o estado de `main` no commit `559afcfc21907b006a8a186c6a2f8950adde86c4` e as referências remotas disponíveis nessa data.

**Resultado: nenhum segredo real confirmado nas superfícies examinadas.** Nenhuma credencial precisou ser removida, nenhum histórico foi reescrito e nenhuma chave foi revogada. Os relatórios brutos e os dados privados de comparação ficaram em uma pasta local ignorada pelo Git; seus valores não fazem parte deste registro.

## Cobertura e método

- Todas as branches remotas disponíveis, quatro tags e as referências de 21 PRs: 143 commits e 13.020 blobs Git.
- Inspeção recursiva de 155 arquivos ZIP/skill, com 8.094 membros; expansão de 93 conteúdos gzip incorporados. Foram examinados 1.683.076.415 bytes, sem limites de leitura ou arquivos cifrados reportados pela varredura.
- Busca local com Gitleaks 8.30.1, obtido da distribuição oficial e com checksum conferido, no histórico e em 2.164 textos únicos extraídos dos blobs, pacotes e conteúdos incorporados.
- Comparação exata dos tokens conhecidos disponíveis na sessão, em formato original e Base64, sem registrar seus valores: zero correspondências nos objetos e pacotes examinados.
- Descrições de 21 issues/PRs, comentários disponíveis e mensagens de commits/tags; descrições de quatro releases. Não havia comentários de issues, reviews ou commits, anexos de releases, execuções/artifacts/caches de Actions disponíveis. GitHub Pages estava desativado e não havia wiki Git acessível.
- Varredura adicional dos textos obtidos do GitHub: zero alertas. Código e credenciais não foram enviados a um serviço externo de análise.

## Alertas conferidos manualmente

Os quatro alertas do scanner eram falsos positivos:

| Arquivo | Conteúdo identificado | Avaliação |
| --- | --- | --- |
| `docs/validation/disteven-publication.json` | SHA-256 do arquivo de entrada anterior | Hash de integridade, sem acesso a contas |
| `dist/atlas-4.8-verification.json` | SHA-256 do arquivo de entrada anterior | Hash de integridade, sem acesso a contas |
| `style-atlas/records/segments-440/visual-review.json` | Hash de arte no registro de revisão | Hash de integridade, sem acesso a contas |
| `style-atlas/dist/sequencias.html` | Identificador público de `localStorage` | Chave de armazenamento no navegador, sem autenticação |

Esses dados úteis foram preservados. Arquivos de ambiente e materiais privados locais continuam fora do controle de versão conforme o `.gitignore`.

## Limites e proteção preventiva

A integração autenticada recebeu HTTP 403 (`Resource not accessible by integration`) ao consultar os alertas nativos de secret scanning e ao tentar habilitar secret scanning e push protection. Portanto, esta revisão **não confirma o estado dessas duas proteções nem a ausência de alertas nativos**. O proprietário pode conferir sua disponibilidade em Settings → Code security no GitHub.

O resultado se limita à procura de segredos nas referências e superfícies acessíveis na data da revisão. Não é uma auditoria de todas as vulnerabilidades da aplicação, nem prova sobre cópias externas, forks, caches de terceiros ou referências já removidas. Se uma credencial real vier a ser identificada, removê-la do GitHub deve ser acompanhado de revogação ou rotação no provedor.
