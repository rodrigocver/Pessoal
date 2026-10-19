# Fiscaliza — Acompanhe seus parlamentares

> Nome provisório.

## O que é

Site web responsivo onde cada pessoa monta a sua lista de deputados federais e senadores
(os candidatos em quem votou ou quer acompanhar) e vê, ao longo do mandato, como eles atuam:
presença em plenário, como votaram, que projetos apresentaram e quanto gastaram da cota parlamentar.
Tudo a partir de dados públicos oficiais da Câmara dos Deputados e do Senado Federal.

## Valor central

**Em menos de 1 minuto, o eleitor sabe se o parlamentar que ele escolheu está aparecendo,
votando e gastando de forma coerente — e recebe isso toda semana sem precisar procurar.**

## Público

- Eleitores comuns, a maioria acessando pelo celular, sem familiaridade com portais de transparência.
- Uso recorrente: abre o resumo semanal no e-mail e entra no painel quando algo chama atenção.

## Decisões já tomadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Plataforma | Web responsivo (PWA) | Lança mais rápido; app nativo fica para depois |
| Contas | Login (Google + link mágico por e-mail) | Lista salva na nuvem e permite e-mail semanal |
| Dados v1 | Presença, votações nominais, proposições, cota parlamentar | Escolha do usuário |
| Alertas | Resumo semanal por e-mail | Engajamento recorrente sem complexidade de push |
| Escopo | Câmara + Senado, nível federal | Ambas as casas têm APIs abertas |

## Stack proposta

- **Next.js (App Router) + TypeScript + Tailwind** — front e rotas de API num só projeto.
- **Supabase** — Postgres, autenticação (Google / e-mail) e Row Level Security para as listas dos usuários.
- **Ingestão**: jobs agendados (GitHub Actions cron) que baixam os dados das fontes oficiais e gravam no Postgres.
  O site **nunca** consulta as APIs do governo em tempo real (são lentas e instáveis — ver research).
- **Resend** (ou similar) para o e-mail semanal.
- **Hospedagem**: Vercel (site) + Supabase (banco). Ambos têm plano gratuito suficiente para o MVP.

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
