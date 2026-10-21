# Escala: milhões de acessos

O Fiscaliza foi organizado para que o número de visitantes não chegue ao banco de dados. Este documento explica
como, o que foi medido e o que precisa ser configurado nos serviços antes de uma divulgação grande.

## Como funciona

```
 Visitante ──► CDN (Vercel) ──► página pronta (HTML em cache)        ← quase todos os acessos param aqui
                   │
                   └── na 1ª visita de cada endereço, ou depois da ingestão diária:
                       Next.js gera a página uma vez ──► Postgres

 Logado ──► /api/eu (quem é e quem acompanha) ──► Postgres            ← no máximo 1 vez a cada 10 min por aba
 Busca  ──► /indice-busca.json (estático, ~200 kB, ~25 kB comprimido) ──► filtro no próprio navegador
```

- **Páginas públicas são estáticas (ISR).** Início, busca, perfil, votação, comparação, status, metodologia, imagem
  de compartilhamento, sitemap e índice da busca saem prontos da CDN. Cada endereço é gerado uma vez e guardado.
- **Filtros no caminho, não em `?`.** `/parlamentar/camara/204534/votacoes/2025` é uma página estática; com
  `?aba=votacoes&periodo=2025` o Next.js geraria a página a cada pedido. Endereços antigos com `?` são
  redirecionados pelo middleware (`src/middleware.ts`), e caminhos inválidos dão 404 (não ocupam o cache).
- **O que é pessoal vem depois, do navegador.** "Entrar/Conta", o botão "Acompanhar" e "Seus parlamentares" na
  votação são montados no navegador (`src/components/conta.ts`). Um cookie de aviso (`fiscaliza-logado`, sem dado
  nenhum) diz se vale perguntar a `/api/eu`; visitantes sem login nunca perguntam.
- **Busca no navegador.** O índice de ~900 parlamentares é baixado uma vez e filtrado no aparelho
  (`src/lib/busca.ts`), com a mesma regra que valia no SQL (sem acento, relevância). Nenhuma busca chega ao servidor.
- **Renovação após a ingestão.** O workflow de ingestão chama `POST /api/revalidar`. Cada página é refeita no
  primeiro acesso seguinte, enquanto os demais recebem a versão anterior; o banco não recebe um pico. Sem a chamada,
  as páginas se renovam sozinhas a cada hora.
- **Resumo mensal em lote.** O resumo de cada parlamentar é calculado uma vez e reaproveitado para todos os
  usuários; usuários são lidos em páginas de 1.000; e-mails saem em lotes de 100 (API de lote do Resend), com
  nova tentativa no limite de taxa; o workflow roda em 4 partes paralelas (`--parte k/n`).

## O que foi medido

Num único processo `next start` (4 vCPUs, sem CDN, sem compressão), 200 conexões simultâneas por 15 segundos,
contando transações no Postgres durante o teste (ver "Como repetir"):

| Página | Antes (dinâmica) | Depois (estática) | Transações no banco (antes → depois) |
|---|---|---|---|
| Perfil, aba Votações | ~40 pedidos/s | ~400 pedidos/s | 4.467 → 2 |
| Início | ~130 pedidos/s | ~600 pedidos/s | 1.611 → 2 |
| Busca ("silva") | ~70 pedidos/s | ~600 pedidos/s | 4.796 → 4 |

O ganho principal não é o número por processo: é que, com a CDN na frente, os pedidos nem chegam ao processo, e
o banco deixa de crescer com o número de visitantes.

Resumo mensal: 50.000 usuários fictícios, 4 parlamentares cada, montados em 34 s num processo (`--simular`).
Um milhão levaria ~12 minutos de montagem; o tempo real fica limitado pela taxa de envio do Resend.

### Como repetir

```bash
npm run build && npx next start -p 3100
npx autocannon@7 -c 200 -d 15 http://localhost:3100/parlamentar/camara/204534/votacoes/2025
npm run resumo-mensal -- --simular
```

## O que configurar nos serviços (dono do projeto)

O código não depende de servidor próprio, mas cada serviço tem limites de plano:

| Serviço | Para milhões de acessos |
|---|---|
| **Vercel** | Plano Pro (o Hobby não permite uso comercial e tem cota de banda baixa). Ligar o **Firewall** com limite de pedidos para `/api/eu`, `/api/auth/*` e ações (`POST`), que são os únicos pontos que chegam ao banco. A banda é o maior custo: 4–15 kB comprimidos por página (HTML), mais os scripts, que ficam no cache do navegador. |
| **Supabase (Postgres)** | Usar o **Transaction pooler** (porta 6543) no site e `DATABASE_POOL_MAX=3`. O tráfego anônimo não chega ao banco; o plano deve ser escolhido pelo número de usuários **logados** ativos (cada um consulta `/api/eu` no máximo a cada 10 minutos). |
| **Tamanho do banco** | 317 MB em out/2026 (legislatura desde 2023 e eleições desde 2010), cabendo nos 500 MB do Supabase gratuito. A cota parlamentar cresce ~70 MB por ano: o plano pago será necessário em ~2 anos (a página `/status` e o painel do Supabase mostram o uso). |
| **Resend** | O plano gratuito envia 100 e-mails/dia. Para o resumo mensal de muitos usuários, um plano com limite de envio compatível e domínio verificado. A conta padrão aceita 2 pedidos/s, ou seja, 200 e-mails/s em lote (~1 milhão em 1h30). Para mais, peça aumento do limite e aumente as partes do workflow. |
| **GitHub Actions** | Sem mudança: a ingestão não depende do número de usuários; o resumo mensal já roda em partes. |
| **Imagens** | As fotos oficiais passam pela otimização de imagens da Vercel (cerca de 900 imagens, guardadas na CDN). |

## Pontos que ainda chegam ao banco

- `/api/eu`, `/minha-lista` e `/conta`: proporcionais aos usuários **logados**.
- Login (`/entrar`, link mágico e Google): limitado por IP e por e-mail (`src/lib/limite.ts`).
- Acompanhar/deixar de acompanhar: uma escrita por clique.
- A primeira visita de cada página depois da ingestão diária (uma por endereço, não por visitante).
