---
titulo: "Comissões: participação e relatorias (v2)"
rotulos: ["v2", "funcionalidade", "ingestão", "discussão"]
status: feito
---
## Contexto
Boa parte do trabalho parlamentar acontece nas comissões, que hoje não aparecem.

## O que fazer (discutir antes)
- Câmara: `/orgaos`, `/orgaos/{id}/membros`, eventos e presenças de comissão
  (`eventosPresencaDeputados` já inclui reuniões de comissão).
- Senado: `/senador/{codigo}/comissoes.json`, `processo/relatoria`.
- Definir a métrica em `docs/METRICAS.md` antes de implementar.

## Pronto quando
- Nova aba "Comissões" com comissões de que é membro, presença nas reuniões e relatorias.

## Feito (escopo definido pelos dados disponíveis)
- Nova aba "Comissões" no perfil: comissões de que foi membro, com cargo e período; grupos e frentes à parte.
- Câmara: presença nas reuniões deliberativas das comissões em que é titular, com médias do partido e da casa,
  também na comparação. 2025: média de 66,6% entre 463 deputados.
- Senado: relatorias com designação, saída e motivo (8.045 desde 2023). O Senado não publica presença em comissões.
- Câmara não publica relatorias; registrado em `docs/FONTES.md`.
