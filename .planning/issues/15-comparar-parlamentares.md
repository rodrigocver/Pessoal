---
titulo: "Comparar dois parlamentares lado a lado"
rotulos: ["funcionalidade", "interface"]
status: feito
---
## Contexto
Eleitores querem comparar, por exemplo, os dois senadores do seu estado.

## O que fazer
- Página `/comparar?a=camara/204534&b=camara/220593` com presença, votos, alinhamento, projetos e gastos.
- Votações em que votaram diferente.
- Mesmas definições de `docs/METRICAS.md`; sem "vencedor".

## Pronto quando
- É possível comparar a partir da lista do usuário, com link compartilhável.

## Feito
- `/comparar?a=camara/ID&b=senado/ID`: métricas lado a lado no período escolhido (sem "vencedor") e, se forem
  da mesma casa, quantas vezes votaram igual e a lista das votações em que divergiram.
- Ponto de entrada "Comparar com…" no perfil, com busca para escolher o segundo parlamentar.
- Aviso quando as casas são diferentes (presença medida de forma distinta).
