# Estado do projeto

- **Fase atual:** 1 — Fundação (não iniciada)
- **Última atualização:** 19/10/2026
- **Próximo passo:** planejar a Fase 1 (estrutura do projeto Next.js, esquema do banco, job de ingestão de parlamentares).

## Decisões
- Web responsivo/PWA; login com Google + link mágico; dados v1 = presença, votações, proposições, gastos; resumo semanal por e-mail.
- Ingestão em lote para banco próprio — o site não consulta as APIs oficiais em tempo real.

## Pendências / riscos
- Presença no Senado: não há endpoint direto — pesquisar na Fase 4.
- API de despesas da Câmara deu timeout — usar arquivos CSV anuais.
- Serviço antigo de votações do Senado foi desativado (02/2026) — usar `/votacao`.
- Contas Supabase/Vercel/Resend precisam ser criadas pelo dono do projeto.
