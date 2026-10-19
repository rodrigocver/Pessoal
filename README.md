# Fiscaliza

Acompanhe a atuação dos deputados federais e senadores em quem você votou: presença, votações,
projetos e gastos — com dados públicos oficiais da Câmara e do Senado.

Planejamento em [`.planning/`](.planning/ROADMAP.md).

## Rodando localmente

Pré-requisitos: Node 22+ e um Postgres (local, sem conta externa).

```bash
npm install
cp .env.example .env            # ajuste DATABASE_URL se necessário
npm run db:migrate              # cria as tabelas
npm run ingest                  # baixa os dados das fontes oficiais
npm run ingest -- deputados     # ou só uma tarefa
npm run dev                     # http://localhost:3000
```

Atrás de um proxy HTTP, rode a ingestão com `NODE_USE_ENV_PROXY=1`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run ingest -- [tarefa...]` | Ingestão de dados (cada execução fica em `ingestao_log`) |
| `npm run db:generate` | Gera migração a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migrações |
| `npm test` / `npm run typecheck` / `npm run lint` | Verificações |
