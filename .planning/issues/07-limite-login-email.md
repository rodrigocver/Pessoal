---
titulo: "Limitar pedidos de link de login por e-mail"
rotulos: ["segurança"]
---
## Contexto
Qualquer pessoa pode pedir links de login para qualquer e-mail, sem limite. Isso permite usar o site
para enviar spam e gasta a cota do provedor de e-mail.

## O que fazer
- Limite por e-mail e por IP (ex.: 3 pedidos a cada 15 minutos), guardado no Postgres.
- Mensagem amigável quando o limite for atingido.

## Pronto quando
- O 4º pedido em 15 minutos para o mesmo e-mail é recusado sem enviar e-mail.
- Teste cobrindo o limite.
