---
titulo: "Comissões: participação e relatorias (v2)"
rotulos: ["v2", "funcionalidade", "ingestão", "discussão"]
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
