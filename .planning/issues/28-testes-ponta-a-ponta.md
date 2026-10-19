---
titulo: "Testes de ponta a ponta das páginas principais no CI"
rotulos: ["infra", "ajuda bem-vinda"]
---
## Contexto
Os testes cobrem funções e consultas, mas não as páginas. Já houve erro 500 que só apareceu abrindo a página no
navegador. O CI já sobe um Postgres para os testes de integração.

## O que fazer
- Playwright (`@playwright/test`) com um cenário pequeno no banco de teste (reaproveitar
  `tests/integracao/dados.ts`).
- Abrir e conferir: início, busca, perfil (todas as abas), votação, comparação, metodologia, status e offline.
- Rodar o axe em cada página e falhar se houver problema de acessibilidade.
- Novo script `npm run test:e2e` e um passo no CI depois do build.

## Pronto quando
- O CI roda os testes em menos de 3 minutos.
- Uma página quebrada de propósito faz o CI falhar.
