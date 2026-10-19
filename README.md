# Fiscaliza

Acompanhe a atuação dos deputados federais e senadores em quem você votou: presença, votações,
projetos e gastos — com dados públicos oficiais da Câmara e do Senado.

Planejamento em [`.planning/`](.planning/ROADMAP.md). Para publicar, veja [DEPLOY.md](DEPLOY.md).

## Rodando localmente

Pré-requisitos: Node 22+ e um Postgres (local, sem conta externa).

```bash
npm install
cp .env.example .env            # ajuste DATABASE_URL se necessário
npm run db:migrate              # cria as tabelas
npm run ingest -- --desde 2023  # carga histórica (~10 min); sem --desde, só o ano corrente
npm run ingest -- deputados     # ou só uma tarefa
npm run dev                     # http://localhost:3000
```

Sem contas externas: o link de login aparece no terminal do `npm run dev`, e o resumo mensal
(`npm run resumo-mensal`) é gravado em `.emails/`.

Atrás de um proxy HTTP, rode a ingestão com `NODE_USE_ENV_PROXY=1`.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run ingest -- [tarefa...] [--desde ANO]` | Ingestão de dados (cada execução fica em `ingestao_log`) |
| `npm run resumo-mensal -- [--mes AAAA-MM] [--para email]` | Envia o resumo mensal |
| `npm run db:generate` | Gera migração a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Aplica migrações |
| `npm test` / `npm run typecheck` / `npm run lint` / `npm run format` | Verificações |

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `src/ingest/` | Ingestão: `camara.ts`, `senado.ts`, `parlamentares.ts`, `estatisticas.ts` |
| `src/db/schema.ts` | Modelo de dados comum às duas casas |
| `src/lib/consultas.ts` | Métricas exibidas no site (presença, votos, projetos, gastos, médias) |
| `src/app/` | Páginas (Next.js App Router) |
| `src/emails/` | Template do resumo mensal |
| `.github/workflows/` | CI, ingestão diária e resumo mensal |
