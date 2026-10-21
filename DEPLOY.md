# Colocar o site no ar

Depois destes passos, qualquer pessoa usa o Fiscaliza só abrindo um endereço (ex.: `https://fiscaliza.vercel.app`),
no celular ou no computador, sem instalar nada. No celular, dá para "Adicionar à tela inicial" e usar como app.

Tudo é feito **no navegador**, sem instalar programas. Os três serviços têm plano gratuito e aceitam entrar com a
conta do GitHub. Tempo: ~30 minutos, mais ~20 minutos esperando a primeira carga de dados.

Você vai gerar duas chaves secretas. Para cada uma, abra https://generate-secret.vercel.app/32 e copie o texto
que aparece (cada visita gera uma chave nova):
- **chave A** → `AUTH_SECRET`
- **chave B** → `REVALIDAR_SEGREDO`

## 1. Banco de dados — Supabase
1. Entre em https://supabase.com com o GitHub e clique em **New project**.
   - Nome: `fiscaliza`. Região: **South America (São Paulo)**. Crie uma senha para o banco e **guarde-a**.
2. Com o projeto criado, clique em **Connect** (no topo) e copie duas strings, trocando `[YOUR-PASSWORD]` pela senha:
   - **Session pooler** (porta **5432**) → vai para o GitHub (passo 2);
   - **Transaction pooler** (porta **6543**) → vai para a Vercel (passo 3).

## 2. Dados — GitHub Actions
O GitHub cria as tabelas e baixa os dados oficiais; depois atualiza tudo sozinho todo dia.
1. Em https://github.com/rodrigocver/Pessoal → **Settings → Secrets and variables → Actions → New repository
   secret**, crie:
   - `DATABASE_URL` = string **Session pooler** (porta 5432);
   - `REVALIDAR_SEGREDO` = **chave B**.
2. Vá em **Actions → Ingestão de dados → Run workflow**, preencha **desde** com `2023` e clique em **Run workflow**.
   Espere ficar verde (~20 minutos). Se ficar vermelho, abra a execução e me mande o erro.

## 3. Site — Vercel
1. Entre em https://vercel.com com o GitHub → **Add New → Project** → importe o repositório **Pessoal**.
2. Em **Environment Variables**, adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | string **Transaction pooler** (porta 6543) |
| `DATABASE_POOL_MAX` | `3` |
| `AUTH_SECRET` | **chave A** |
| `REVALIDAR_SEGREDO` | **chave B** (a mesma do GitHub) |

3. Clique em **Deploy**. Ao terminar, a Vercel mostra o endereço do site (ex.: `https://pessoal-xyz.vercel.app`).
   Para um nome melhor: **Settings → Domains** (ex.: `fiscaliza.vercel.app`, ou um domínio próprio).
4. De volta ao GitHub, **Settings → Secrets and variables → Actions → Variables → New repository variable**:
   `APP_URL` = endereço do site. Assim, depois de cada atualização diária, o site renova as páginas sozinho.

**Pronto: o site já está no ar** para consulta de todos os parlamentares. Mande o endereço para quem quiser.
Sem o passo 4 abaixo, o site funciona sem contas: o botão "Entrar" e o "Acompanhar" não aparecem.

## 4. Contas e resumo mensal por e-mail (quando quiser)
Para os usuários criarem a própria lista e receberem o resumo mensal:
1. Crie a conta em https://resend.com e, em **Domains**, verifique um domínio seu (sem domínio, o Resend só envia
   para o seu próprio e-mail, o que serve para testar).
2. Crie uma **API key**.
3. Na **Vercel** (Settings → Environment Variables) e no **GitHub** (Secrets), adicione:
   - `AUTH_RESEND_KEY` = a API key;
   - `EMAIL_FROM` = remetente, ex.: `Fiscaliza <nao-responda@seu-dominio.com.br>`.
4. Na Vercel, **Deployments → ⋯ → Redeploy**. O "Entrar" aparece no site.

Login com Google (opcional): em https://console.cloud.google.com → **APIs e serviços → Credenciais → Criar ID do
cliente OAuth** (aplicativo da Web), com o URI de redirecionamento `https://SEU-SITE/api/auth/callback/google`.
Adicione `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` na Vercel e faça o Redeploy.

## O que roda sozinho depois
- **Todo dia às 06:17 (Brasília):** atualização dos dados; aos domingos, recarga da legislatura e das eleições.
- **Dia 1º às 10:07:** resumo mensal por e-mail (quando o passo 4 estiver feito), em 4 partes paralelas.
- **A cada mudança no código** enviada ao GitHub, a Vercel publica a nova versão.

## Conferir
- [ ] Abrir o site no celular, buscar um parlamentar e ver as abas.
- [ ] Abrir `/status`: as tarefas aparecem com a última atualização.
- [ ] (Com o passo 4) Criar conta pelo link do e-mail, acompanhar alguém e ver **Conta → Ver como fica o resumo**.

Para muitos acessos ao mesmo tempo (milhões), veja os limites de cada serviço em `docs/ESCALA.md` antes de divulgar.

## Para quem desenvolve
Rodar no próprio computador (Node.js 22 e Docker) está no `README.md`. Não é necessário para usar o site.
