---
titulo: "Acessibilidade: alternativa textual aos gráficos e auditoria"
rotulos: ["boa primeira issue", "interface"]
status: feito
---
## Contexto
Os gráficos de barras (`src/components/Graficos.tsx`, `Comparacao.tsx`) são só visuais; leitores de
tela não acessam os valores.

## O que fazer
- Tabela alternativa (visível em `<details>` ou só para leitores de tela) com os mesmos números.
- Rodar axe/Lighthouse nas páginas principais e corrigir o que aparecer (contraste, rótulos de formulário).

## Pronto quando
- Com leitor de tela é possível ouvir a presença mês a mês.
- Lighthouse Acessibilidade ≥ 95 em início, busca e perfil.

## Feito
- Gráficos mensais com título e tabela equivalente para leitores de tela; barras decorativas escondidas deles;
  área com rolagem horizontal focável pelo teclado.
- axe-core em 12 páginas, temas claro e escuro: nenhum problema. Lighthouse Acessibilidade: 100 em início,
  busca e perfil.
