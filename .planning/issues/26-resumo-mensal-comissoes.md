---
titulo: "Resumo mensal: incluir presença em comissões (Câmara) e relatorias (Senado)"
rotulos: ["funcionalidade", "métricas"]
---
## Contexto
O e-mail mensal (`src/lib/resumoMensal.ts`) traz presença em plenário, votos, projetos, gastos e afastamentos.
As comissões ganharam aba própria no perfil, mas não aparecem no resumo.

## O que fazer
- Deputados: "Esteve em X de Y reuniões deliberativas de comissões em que é titular", usando `comissoesDe`
  (mesma definição do perfil e das médias; ver `reuniaoConta` em `src/lib/exercicio.ts`).
- Senadores: número de relatorias designadas no mês, usando `relatoriasDe`.
- Omitir a linha quando não houver reunião no mês (não escrever "0 de 0").
- Texto neutro, sem comparação ou adjetivo.

## Pronto quando
- Teste em `tests/` cobrindo as três situações: com reuniões, sem reuniões e senador com relatoria.
- Visualização do e-mail em `/conta/resumo` mostra a nova linha.
