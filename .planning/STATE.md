# Estado do projeto

- **Fase atual:** 7 (contas e publicação) e 8 (abrir o repositório) — código pronto; faltam passos do dono no GitHub e nos provedores
- **Concluídas:** 1 (Fundação), 2 (Ingestão Câmara), 3 (Site), 4 (Ingestão Senado), 5 (Métricas comparativas), 6 (Resumo mensal)
- **Última atualização:** 19/10/2026
- **Backlog:** #01–#19 e #21 concluídas. Novas para a comunidade: #22–#31 (boas primeiras issues: #22, #23, #24, #29; discussão: #30).

## Decisões
- Web responsivo/PWA; login com Google + link mágico; dados v1 = presença, votações, proposições, gastos; **resumo mensal** por e-mail.
- Ingestão em lote para banco próprio — o site não consulta as APIs oficiais em tempo real.
- **Criação de contas externas fica para a Fase 7.** Até lá tudo roda com Postgres local; por isso trocamos Supabase Auth por Postgres + Drizzle + Auth.js (independente de provedor).

## Aprendizados
- Câmara: rótulo da matéria votada vem de `votacoesProposicoes` (o arquivo `votacoesObjetos` traz só peças acessórias).
- Câmara: CSV de proposições tem aspas malformadas — usar JSON.
- Câmara regenera os arquivos em lote de madrugada (~01h–02h BRT); downloads nesse horário vêm truncados. Agendar a ingestão para depois das 06h BRT. O código confere Content-Length e tenta de novo em JSON inválido.
- Carga histórica completa da Câmara (2023–2026) leva ~6 min localmente.
- Alinhamento: partido na data do voto; orientação do partido > federação > bloco (composição lida do nome abreviado do bloco). Tabela `estatistica` é recalculada pela tarefa `estatisticas` (última da ingestão, ~1 min).

## Afastamentos e suplentes (pedido do dono do projeto)
- Cobertura na legislatura: Câmara 229 afastamentos (179 com suplente identificado pelas datas, 19 com candidatos
  possíveis, 31 sem suplente); Senado 36, todos com suplente oficial.
- Aprendizado: casar só pelo horário erra (ministros reassumem juntos para votar). Estado + partido/federação +
  alinhamento da volta + continuidade resolvem a maioria.

## Requisitos v1
Todos concluídos, exceto DEPLOY-01 (publicação), que depende das contas externas (Fase 7, `DEPLOY.md`).

## Pendências / riscos
- ✅ Virada para a 58ª legislatura implementada (backlog #01). Conferir a ingestão logo após a posse, em 01/02/2027.
- Fontes e armadilhas documentadas em `docs/FONTES.md`; métricas em `docs/METRICAS.md`.
- Presença no Senado: resolvida via comparecimento às votações nominais (cobre só sessões com votação nominal, ~36/ano).
- Conferir em aparelho real: instalação do app (Android/iPhone) e cartão de compartilhamento no WhatsApp.
- Não rodar `npm run dev` e `npm run build`/`next start` ao mesmo tempo: os dois usam a pasta `.next` e o build sai corrompido (erro 500 sem log).
- API de despesas da Câmara deu timeout — usar arquivos CSV anuais.
- Serviço antigo de votações do Senado foi desativado (02/2026) — usar `/votacao`.
- Push para o GitHub bloqueado: instalar o app Claude no repositório (Fase 7 ou antes).
