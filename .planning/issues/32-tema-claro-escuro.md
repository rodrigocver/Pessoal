---
titulo: "Botão para alternar entre tema claro e escuro"
rotulos: ["boa primeira issue", "interface"]
---
## Contexto
O tema segue só a preferência do sistema (`@media (prefers-color-scheme: dark)` em `src/app/globals.css`). Quem
quer o tema claro num celular em modo escuro (ou o contrário) não tem como escolher.

## O que fazer
- Botão no cabeçalho (`src/app/layout.tsx`) com três estados: automático, claro, escuro.
- Escolha guardada em `localStorage` e aplicada com um atributo no `<html>` (ex.: `data-tema="escuro"`); os tokens
  de cor de `globals.css` passam a valer também para esse atributo.
- Script mínimo no `<head>` que aplica a escolha antes da página aparecer (sem piscar o tema errado).
- A página continua estática (CDN): nada de cookie ou leitura no servidor (ver `docs/ESCALA.md`).

## Pronto quando
- A escolha vale em todas as páginas e sobrevive a recarregar; "automático" volta a seguir o sistema.
- O axe continua sem problemas nos dois temas (`npm run test:e2e`).
