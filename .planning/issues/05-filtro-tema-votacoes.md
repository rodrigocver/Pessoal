---
titulo: "Filtro por tema na aba de votações (PROF-03)"
rotulos: ["funcionalidade", "interface", "câmara"]
---
## Contexto
O requisito PROF-03 pede filtro por tema e por período; só o período foi implementado.

## O que fazer
- Ingerir `arquivos/proposicoesTemas/json/proposicoesTemas-{ano}.json` (Câmara) e associar temas à
  proposição de cada votação.
- No Senado, avaliar `assunto` em `/processo/{id}`.
- Chips de tema na aba Votações (parâmetro `tema` na URL, como `periodo`).

## Pronto quando
- É possível ver só as votações de "Saúde" de um deputado em 2025.
- Funciona no celular; parâmetros de URL compartilháveis.
