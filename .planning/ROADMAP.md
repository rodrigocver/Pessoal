# Roadmap — v1

## Fase 1 — Fundação
**Meta:** projeto rodando com banco e cadastro de parlamentares.
- Next.js + TypeScript + Tailwind; Supabase (Postgres + Auth); deploy na Vercel.
- Esquema do banco comum Câmara/Senado (`parlamentar`, `sessao`, `presenca`, `votacao`, `voto`, `proposicao`, `despesa`, `usuario_parlamentar`), com `casa`, `fonte`, `atualizado_em`.
- Job de ingestão diário (GitHub Actions) para deputados e senadores em exercício.
- **Requisitos:** DATA-01, DATA-07
- **Pronto quando:** a tabela `parlamentar` tem os 513 deputados e 81 senadores e se atualiza sozinha todo dia.

## Fase 2 — Ingestão Câmara
**Meta:** histórico completo da Câmara desde 2023.
- Presença via `eventos?codTipoEvento=110` + `eventos/{id}/deputados`.
- Votações e votos via arquivos anuais `votacoesVotos-{ano}.json`.
- Proposições de autoria via API; despesas via `cotas/Ano-{ano}.csv.zip`.
- Ingestão incremental, idempotente, com retentativas.
- **Requisitos:** DATA-02, DATA-04, DATA-05, DATA-06, DATA-08 (Câmara)
- **Pronto quando:** para um deputado qualquer, os números batem com o portal oficial da Câmara (amostra de 5 deputados).

## Fase 3 — Site: busca, lista pessoal e perfil
**Meta:** usuário entra, monta sua lista e entende a atuação dos deputados.
- Login (Google / link mágico), exclusão de conta.
- Busca com filtros; adicionar/remover da lista; painel "Meus parlamentares".
- Página de perfil pública com abas Presença, Votações, Proposições, Gastos; seletor de período; "como calculamos".
- Layout mobile-first + PWA.
- **Requisitos:** AUTH-01, AUTH-02, LIST-01..03, PROF-01..03, PROF-05..07, UX-01..03
- **Pronto quando:** um usuário novo consegue, no celular, criar conta, seguir 3 deputados e ver a presença de cada um em < 1 minuto.

## Fase 4 — Ingestão Senado
**Meta:** senadores com os mesmos dados dos deputados.
- Pesquisa: definir método de presença no Senado (DATA-03).
- Votações via novo serviço `/votacao`; despesas via CEAPS; proposições de autoria.
- Perfil e busca passam a exibir senadores.
- **Requisitos:** DATA-03, DATA-04..06, DATA-08 (Senado)
- **Pronto quando:** perfis de senadores mostram as 4 abas com dados conferidos contra o portal do Senado.

## Fase 5 — Métricas comparativas
**Meta:** contexto para os números.
- Alinhamento com orientação do partido e do governo.
- Comparação com a média da casa e do partido.
- **Requisitos:** PROF-04, PROF-08

## Fase 6 — Resumo semanal por e-mail
**Meta:** usuário recebe toda semana o que seus parlamentares fizeram.
- Job semanal gera e envia o e-mail (Resend); preferências e descadastro.
- **Requisitos:** MAIL-01, MAIL-02
- **Pronto quando:** e-mail chega toda segunda com dados da semana anterior e o link de descadastro funciona.
