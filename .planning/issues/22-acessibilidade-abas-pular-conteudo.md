---
titulo: "Acessibilidade: indicar a aba ativa e link “Pular para o conteúdo”"
rotulos: ["boa primeira issue", "interface"]
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
