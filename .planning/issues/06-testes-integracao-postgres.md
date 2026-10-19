---
titulo: "Testes de integração com Postgres no CI"
rotulos: ["infra", "ajuda bem-vinda"]
---
## Contexto
Os testes atuais cobrem só funções puras. As consultas SQL (`src/lib/consultas.ts`) e o cálculo das
médias (`src/ingest/estatisticas.ts`) não têm teste, e precisam dar o mesmo resultado.

## O que fazer
- Serviço Postgres no workflow de CI; migrações aplicadas antes dos testes.
- Fixture pequena (2 parlamentares, algumas sessões, votos, despesas) inserida por código.
- Teste de consistência: `presenca()` == presenças/sessões da tabela `estatistica` para o mesmo período.

## Pronto quando
- `npm run test:integracao` roda local (com `docker compose up -d`) e no CI.
