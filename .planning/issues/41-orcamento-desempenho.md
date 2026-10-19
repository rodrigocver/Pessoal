---
titulo: "Orçamento de desempenho no CI (Lighthouse)"
rotulos: ["infra", "interface", "ajuda bem-vinda"]
---
## Contexto
O site foi pensado para celular e redes lentas (`docs/ESCALA.md`): perfil com 4–15 kB comprimidos, busca no
navegador. Nada impede que uma mudança futura traga uma biblioteca pesada ou uma imagem grande.

## O que fazer
- Lighthouse CI (`@lhci/cli`) depois do build, nas páginas de `tests/e2e/paginas.spec.ts` mais importantes
  (início, busca, perfil, votação), com perfil de celular.
- Limites: desempenho ≥ 90, acessibilidade = 100, JavaScript total da página ≤ valor atual + 10%.
- Medir os valores atuais e registrá-los na issue antes de fixar os limites.

## Pronto quando
- O CI falha se um limite for ultrapassado; relatório guardado como artefato.
