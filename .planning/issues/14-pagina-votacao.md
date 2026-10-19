---
titulo: "Página de cada votação: como cada partido e parlamentar votou"
rotulos: ["funcionalidade", "interface"]
status: feito
---
## Contexto
Na aba Votações dá para ver o voto de um parlamentar, mas não o placar completo nem como os
outros votaram.

## O que fazer
- Página `/votacao/[casa]/[id]` com placar, orientações das bancadas e votos por partido.
- Destaque para os parlamentares que o usuário acompanha.
- Link a partir de cada item da aba Votações.

## Pronto quando
- A página abre em < 2s e funciona no celular.

## Feito
- `/votacao/[casa]/[id]`: resultado, orientação das bancadas (governo em destaque), votos por partido
  (partido na data do voto) e lista nominal agrupada por voto; "Seus parlamentares" para quem está logado.
- Link "Ver votação completa" em cada item da aba Votações. Página pública, disponível offline após visitada.
- Orientação "LIVRE" do Senado padronizada como "Liberado".
