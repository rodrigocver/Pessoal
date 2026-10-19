---
titulo: "Página de cada partido"
rotulos: ["funcionalidade", "interface", "métricas", "ajuda bem-vinda"]
---
## Contexto
As médias do partido já são calculadas (tabela `estatistica`, tarefa `estatisticas`) e aparecem no perfil, mas
não há uma página para ver a bancada.

## O que fazer
- `/partido/[sigla]` (estática, em cache): deputados e senadores em exercício do partido, com os cartões de
  sempre, e as médias do partido no período (presença, alinhamento, gastos), ao lado das médias da casa.
- Filtro de período no caminho, como no perfil (`src/lib/caminhos.ts`).
- Neutralidade: sem ordenar por "melhor" ou "pior"; ordem alfabética.
- Link a partir da identificação do parlamentar ("PT-SP" → página do PT).

## Pronto quando
- As médias da página batem com as do perfil (teste de integração com o cenário de `tests/integracao/dados.ts`).
- Página incluída em `tests/e2e/paginas.spec.ts` e em `scripts/conferir-cache.mjs`.
