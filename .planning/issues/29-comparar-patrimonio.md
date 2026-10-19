---
titulo: "Comparação: patrimônio declarado e receitas de campanha da última eleição"
rotulos: ["boa primeira issue", "interface"]
---
## Contexto
A página `/comparar` mostra presença, votos, alinhamento e gastos lado a lado. Os dados do TSE (aba "Eleições")
ainda não aparecem lá.

## O que fazer
- Em `src/app/comparar/page.tsx`, duas linhas na tabela de números: patrimônio declarado e receitas de campanha da
  candidatura mais recente de cada um, com o ano ao lado (`candidaturasDe` em `src/lib/consultas.ts`).
- Quando não houver candidatura, mostrar "—", como nas outras linhas.
- Valores nominais, sem correção; o "Como calculamos" da página deve dizer isso e apontar para a aba Eleições.

## Pronto quando
- Comparar dois parlamentares com eleições em anos diferentes deixa claro o ano de cada valor.
