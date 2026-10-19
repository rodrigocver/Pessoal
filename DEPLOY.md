# Colocar no ar (Fase 7)

Tudo já está pronto no código. Falta só criar as contas e copiar as chaves para os lugares certos.
Todas têm plano gratuito suficiente para começar. Tempo estimado: ~40 minutos, de preferência no computador.

## 1. GitHub — liberar o acesso do Claude ao repositório
Necessário para os commits desta sessão chegarem ao GitHub.
- Instale o app do Claude no repositório `rodrigocver/Pessoal`: https://github.com/apps/claude/installations/select_target
- Ou reconecte o GitHub em https://claude.ai/connect-github

## 2. Banco de dados — Supabase (ou Neon)
1. Crie um projeto em https://supabase.com (região São Paulo).
2. Em **Project Settings → Database → Connection string**, copie:
   - a string **Session pooler** (porta 5432) → usada pelas tarefas agendadas;
   - a string **Transaction pooler** (porta 6543) → usada pelo site na Vercel.
3. No seu computador, com a string de sessão em `DATABASE_URL` no `.env`:
   ```bash
   npm run db:migrate
   npm run ingest -- --desde 2023      # carga histórica, ~10 min
   ```
   (Também dá para rodar a carga pelo GitHub: Actions → "Ingestão de dados" → Run workflow → desde = 2023.)

## 3. E-mail — Resend
1. Crie a conta em https://resend.com e verifique um domínio (ou use o domínio de teste para começar).
2. Crie uma **API key**.
3. Defina o remetente, ex.: `Fiscaliza <nao-responda@seu-dominio.com.br>`.

## 4. Login com Google (opcional — o login por e-mail já funciona com o Resend)
1. Em https://console.cloud.google.com → **APIs e serviços → Credenciais → Criar ID do cliente OAuth** (tipo: aplicativo da Web).
2. URI de redirecionamento autorizado: `https://SEU-SITE/api/auth/callback/google`.
3. Guarde o **Client ID** e o **Client secret**.

## 5. Site — Vercel
1. Em https://vercel.com, **Add New → Project** e importe o repositório.
2. Em **Settings → Environment Variables**, cadastre:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | string do **Transaction pooler** (porta 6543) |
| `AUTH_SECRET` | gere com `npx auth secret` |
| `AUTH_RESEND_KEY` | API key do Resend |
| `EMAIL_FROM` | remetente do passo 3 |
| `APP_URL` | URL do site, ex.: `https://fiscaliza.vercel.app` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | opcional, passo 4 |
| `REVALIDAR_SEGREDO` | gere com `openssl rand -hex 32`; o mesmo valor vai no GitHub (passo 6) |
| `DATABASE_POOL_MAX` | `3` (poucas conexões por instância; ver `docs/ESCALA.md`) |

3. Faça o deploy.

## 6. Tarefas agendadas — GitHub Actions
No repositório: **Settings → Secrets and variables → Actions**.
- **Secrets:** `DATABASE_URL` (string do **Session pooler**), `AUTH_RESEND_KEY`, `EMAIL_FROM`, `REVALIDAR_SEGREDO`
  (o mesmo da Vercel: depois de cada ingestão, o site renova as páginas em cache)
- **Variables:** `APP_URL`

Os agendamentos já estão em `.github/workflows/`:
- **Ingestão de dados:** todo dia às 06:17 (Brasília). Aos domingos, recarrega a legislatura inteira.
- **Resumo mensal:** dia 1º às 10:07 (Brasília), em 4 partes paralelas.

Para milhões de acessos, veja os limites de cada serviço em `docs/ESCALA.md` antes de divulgar.

## 7. Conferir
- [ ] Abrir o site, buscar um parlamentar e ver as quatro abas.
- [ ] Criar conta pelo link do e-mail e acompanhar alguém.
- [ ] Em **Conta → Ver como fica o resumo do último mês**, conferir o e-mail.
- [ ] Rodar manualmente Actions → "Resumo mensal" com o seu e-mail na lista e ver se chega.
