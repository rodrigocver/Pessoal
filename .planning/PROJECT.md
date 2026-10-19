# Fiscaliza — Acompanhe seus parlamentares

> Nome provisório.

## O que é

Site web responsivo onde cada pessoa monta a sua lista de deputados federais e senadores
(os candidatos em quem votou ou quer acompanhar) e vê, ao longo do mandato, como eles atuam:
presença em plenário, como votaram, que projetos apresentaram e quanto gastaram da cota parlamentar.
Tudo a partir de dados públicos oficiais da Câmara dos Deputados e do Senado Federal.

## Valor central

**Em menos de 1 minuto, o eleitor sabe se o parlamentar que ele escolheu está aparecendo,
votando e gastando de forma coerente — e recebe isso todo mês sem precisar procurar.**

## Público

- Eleitores comuns, a maioria acessando pelo celular, sem familiaridade com portais de transparência.
- Uso recorrente: abre o resumo mensal no e-mail e entra no painel quando algo chama atenção.

## Decisões já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Plataforma | Web responsivo (PWA) | Lança mais rápido; app nativo fica para depois |
| Contas | Login (Google + link mágico por e-mail) | Lista salva na nuvem e permite e-mail mensal |
| Dados v1 | Presença, votações nominais, proposições, cota parlamentar | Escolha do usuário |
| Alertas | Resumo mensal por e-mail | Engajamento recorrente sem complexidade de push |
| Contas externas | Criadas só na última fase | Todo o desenvolvimento roda localmente (Postgres local) |
| Escopo | Câmara + Senado, nível federal | Ambas as casas têm APIs abertas |

## Stack proposta

- **Next.js (App Router) + TypeScript + Tailwind** — front e rotas de API num só projeto.
- **Postgres + Drizzle ORM** — qualquer Postgres serve (local no desenvolvimento; Supabase ou Neon em produção).
- **Auth.js** — login com Google e link mágico por e-mail; não prende o projeto a um provedor.
- **Ingestão**: jobs agendados (GitHub Actions cron) que baixam os dados das fontes oficiais e gravam no Postgres.
  O site **nunca** consulta as APIs do governo em tempo real (são lentas e instáveis — ver research).
- **Resend** (ou similar) para o e-mail mensal.
- **Hospedagem**: Vercel (site) + Supabase/Neon (banco). Planos gratuitos bastam para o MVP. Contas criadas na Fase 7.

## Restrições

- Somente dados públicos oficiais; sempre mostrar fonte e data da última atualização.
- Neutralidade: apresentar fatos e métricas, sem juízo de valor ou ranking "bom/ruim" editorial.
- LGPD: guardar apenas e-mail e a lista de parlamentares seguidos; permitir excluir a conta.
- Custo de infraestrutura próximo de zero no MVP.

## Fora de escopo (v1)

- App nativo iOS/Android.
- Vereadores, deputados estaduais, governadores.
- Notificações push em tempo real.
- Comentários, rede social, comparação pública entre usuários.
- Dados de campanha/TSE (doações, patrimônio) — candidato para v2.
