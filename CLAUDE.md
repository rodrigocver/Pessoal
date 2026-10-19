# Instruções para assistentes de IA

Este repositório aceita contribuições feitas com ajuda de assistentes de código. Siga o
[CONTRIBUTING.md](CONTRIBUTING.md); os pontos abaixo são os que mais costumam ser esquecidos.

- **Princípios inegociáveis:** só dados públicos oficiais; neutralidade (sem adjetivos, rankings ou
  juízo de valor); toda métrica com "Como calculamos" e definição em `docs/METRICAS.md`; o site nunca
  consulta APIs do governo em tempo real.
- **Idioma:** código, comentários, commits e textos em português, como o restante do projeto.
- **Métricas têm duas implementações** que precisam concordar: `src/lib/consultas.ts` (páginas) e
  `src/ingest/estatisticas.ts` (médias). Mudou uma, mude a outra; `tests/integracao/` confere que batem.
- **Ingestão:** conversão em funções puras testadas com exemplo real da fonte; gravação idempotente.
  Antes de depender de um campo novo da fonte, baixe uma amostra real e confira o formato —
  `docs/FONTES.md` lista armadilhas já encontradas.
- **Escala:** páginas públicas são estáticas e servidas da CDN. Nelas, nada de `auth()`, `cookies()`, `headers()`
  ou `searchParams`; filtros vão no caminho (`src/lib/caminhos.ts`) e o que é pessoal vem de `/api/eu` no navegador.
  `npm run conferir:cache` (no CI, depois do build) acusa a regressão. Ver `docs/ESCALA.md`.
- **Banco:** altere `src/db/schema.ts` e rode `npm run db:generate`; nunca edite migrações existentes.
- **Antes de abrir o PR:** `npm run format && npm run verificar && npm run build` (`verificar` = lint, tipos, testes de unidade e de integração; para na primeira falha).
