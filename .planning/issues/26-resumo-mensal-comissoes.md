---
titulo: "Resumo mensal: incluir presença em comissões (Câmara) e relatorias (Senado)"
rotulos: ["funcionalidade", "métricas"]
status: feito
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

## Feito
- Deputados: "esteve em X de Y reuniões deliberativas das comissões em que é titular" (soma de `comissoesDe`
  no mês). Senadores: "recebeu a relatoria de N matérias" (designadas no mês, de `relatoriasDe`).
- Sem reunião ou relatoria no mês, a linha não aparece. Função pura `linhaComissoes` com testes; conferido com
  dados reais (Tabata Amaral, 4 de 4 em out/2025; Oriovisto Guimarães, 20 relatorias em out/2025).
