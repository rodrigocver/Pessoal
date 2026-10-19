# Estado do projeto

- **Fase atual:** 4 — Ingestão Senado
- **Concluídas:** 1 (Fundação), 2 (Ingestão Câmara), 3 (Site)
- **Última atualização:** 19/10/2026

## Decisões
- Web responsivo/PWA; login com Google + link mágico; dados v1 = presença, votações, proposições, gastos; **resumo mensal** por e-mail.
- Ingestão em lote para banco próprio — o site não consulta as APIs oficiais em tempo real.
- **Criação de contas externas fica para a Fase 7.** Até lá tudo roda com Postgres local; por isso trocamos Supabase Auth por Postgres + Drizzle + Auth.js (independente de provedor).

## Aprendizados
- Câmara: rótulo da matéria votada vem de `votacoesProposicoes` (o arquivo `votacoesObjetos` traz só peças acessórias).
- Câmara: CSV de proposições tem aspas malformadas — usar JSON.
- Câmara regenera os arquivos em lote de madrugada (~01h–02h BRT); downloads nesse horário vêm truncados. Agendar a ingestão para depois das 06h BRT. O código confere Content-Length e tenta de novo em JSON inválido.
- Carga histórica completa da Câmara (2023–2026) leva ~6 min localmente.

## Pendências / riscos
- Presença no Senado: não há endpoint direto — pesquisar na Fase 4.
- API de despesas da Câmara deu timeout — usar arquivos CSV anuais.
- Serviço antigo de votações do Senado foi desativado (02/2026) — usar `/votacao`.
- Push para o GitHub bloqueado: instalar o app Claude no repositório (Fase 7 ou antes).
