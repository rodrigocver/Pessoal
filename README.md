# Fiscaliza

[![CI](https://github.com/rodrigocver/Pessoal/actions/workflows/ci.yml/badge.svg)](https://github.com/rodrigocver/Pessoal/actions/workflows/ci.yml)
[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
[![Contribuições bem-vindas](https://img.shields.io/badge/contribui%C3%A7%C3%B5es-bem--vindas-brightgreen.svg)](CONTRIBUTING.md)

**Você votou. Agora acompanhe.** O Fiscaliza mostra, com dados públicos oficiais da Câmara dos
Deputados e do Senado Federal, como atuam os parlamentares que você escolheu:

- **Presença** nas sessões de votação do plenário, mês a mês, com os motivos das ausências.
- **Votações**: como votou em cada votação nominal e quanto seguiu o partido e o governo.
- **Projetos** apresentados e em que pé estão.
- **Gastos** da cota parlamentar por categoria e fornecedor.
- Comparação com a **média do partido e da casa**, e um **resumo mensal por e-mail**.

Projeto aberto, neutro e sem fins lucrativos: os mesmos cálculos para todos, de qualquer partido,
sempre com a fonte e a explicação de [como cada número é calculado](docs/METRICAS.md).

## Contribua

Toda ajuda conta: código, design, textos, testes ou um número que não bate com a fonte oficial.

1. Leia o [guia de contribuição](CONTRIBUTING.md) — princípios do projeto e como rodar localmente.
2. Escolha uma tarefa no [backlog](.planning/BACKLOG.md) ou nas issues com o rótulo
   **`boa primeira issue`**.
3. Achou um dado diferente da fonte? Abra uma issue **"Dado divergente"**.

## Rodando localmente

Node 22+ e Docker. Nenhuma conta externa é necessária.

```bash
npm install
docker compose up -d            # Postgres local
cp .env.example .env            # gere AUTH_SECRET com: npx auth secret
npm run db:migrate
npm run ingest                  # dados do ano corrente (~3 min); --desde 2023 para a legislatura
npm run dev                     # http://localhost:3000
```

O link de login aparece no terminal do `npm run dev`, e o resumo mensal (`npm run resumo-mensal`)
é gravado em `.emails/`. Atrás de um proxy HTTP, rode a ingestão com `NODE_USE_ENV_PROXY=1`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run ingest -- [tarefa...] [--desde ANO]` | Ingestão das fontes oficiais (registrada em `ingestao_log`) |
| `npm run resumo-mensal -- [--mes AAAA-MM] [--para email]` | Envia o resumo mensal |
| `npm run db:up` / `db:migrate` / `db:generate` | Sobe o Postgres local / aplica / gera migrações |
| `npm run format` / `lint` / `typecheck` / `test` | Verificações (as mesmas do CI) |

## Documentação

| Documento | Conteúdo |
|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Princípios, ambiente, fluxo de pull request, convenções |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Como as peças se encaixam e por quê |
| [docs/FONTES.md](docs/FONTES.md) | APIs e arquivos oficiais usados, e suas armadilhas |
| [docs/METRICAS.md](docs/METRICAS.md) | Definição de cada métrica |
| [.planning/](.planning/ROADMAP.md) | Visão, requisitos, roadmap e backlog |
| [DEPLOY.md](DEPLOY.md) | Como publicar a sua instância |

## Stack

Next.js (App Router) · TypeScript · Tailwind · Postgres + Drizzle · Auth.js · GitHub Actions.

## Licença

[MIT](LICENSE). Os dados exibidos são públicos e pertencem às respectivas fontes oficiais.
