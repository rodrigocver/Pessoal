---
titulo: "Acessibilidade: indicar a aba ativa e link “Pular para o conteúdo”"
rotulos: ["boa primeira issue", "interface"]
status: feito
---
## Contexto
No perfil (`src/app/parlamentar/[casa]/[id]/page.tsx`), a aba ativa (Presença, Votações...) e o período ativo só
se distinguem pela cor. Leitores de tela não sabem qual está selecionada. Também não há link para pular o menu do
topo, o que obriga quem navega pelo teclado a passar por ele em toda página.

## O que fazer
- `aria-current="page"` no link da aba ativa e no do período ativo (o filtro de temas já faz isso).
- Link "Pular para o conteúdo" no início de `src/app/layout.tsx`, visível só ao receber foco, apontando para o
  `<main>` (que precisa de `id`).

## Pronto quando
- Com o teclado, o primeiro Tab mostra "Pular para o conteúdo" e Enter leva ao conteúdo.
- O axe continua sem problemas nas páginas do perfil.

## Feito
- `aria-current="page"` na aba e no período ativos do perfil e no período da comparação; o seletor de período
  virou `<nav>` (o `aria-label` de uma `div` sem papel não é lido).
- Link "Pular para o conteúdo" em `src/app/layout.tsx`, visível só com foco, levando ao `<main id="conteudo">`.
- Conferido com o teclado e com o axe (perfil, comparação e início sem problemas).
