---
titulo: "sitemap.xml e robots.txt"
rotulos: ["boa primeira issue", "infra"]
status: feito
---
## Contexto
O site não tem `sitemap.xml` nem `robots.txt`. Buscadores demoram a achar os perfis, que são a principal porta de
entrada de quem pesquisa um parlamentar pelo nome.

## O que fazer
- `src/app/robots.ts`: libera tudo, menos `/conta`, `/minha-lista`, `/entrar`, `/descadastrar` e `/api`; aponta o
  sitemap.
- `src/app/sitemap.ts`: páginas públicas fixas (`/`, `/buscar`, `/metodologia`, `/status`) e um perfil por
  parlamentar, lendo do banco (nunca das APIs oficiais). A URL base vem de `baseUrl()` em `src/lib/email.ts`
  (variável `APP_URL`; ver `DEPLOY.md`).
- Votações podem ficar de fora na primeira versão (são muitas).

## Pronto quando
- `curl /robots.txt` e `curl /sitemap.xml` respondem e o sitemap lista os ~600 perfis.
- `npm run build` continua passando sem banco disponível na hora do build (gerar sob demanda, não estático).

## Feito
- `src/app/robots.ts` e `src/app/sitemap.ts`, gerados a cada pedido (o build não depende do banco).
- O sitemap traz as páginas fixas e todos os parlamentares do banco (893 em 19/10/2026), inclusive os que já
  saíram, cujos perfis continuam públicos. Teste de integração.
