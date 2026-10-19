---
titulo: "Emendas parlamentares (Portal da Transparência)"
rotulos: ["v2", "funcionalidade", "ingestão", "discussão"]
---
## Contexto
Para onde o parlamentar mandou dinheiro do orçamento é uma das perguntas mais comuns do eleitor. O Portal da
Transparência publica tudo num arquivo único (conferido em 19/10/2026):
`https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares/UNICO` (zip de 32 MB,
`EmendasParlamentares.csv` com 26 MB, mais `_PorFavorecido.csv` com 180 MB e `_Convenios.csv`).
Colunas principais: ano, tipo de emenda, código e **nome** do autor, município/UF de aplicação, função,
programa, ação, valores empenhado, liquidado e pago.

## Para discutir antes
- **Ligação ao parlamentar:** o arquivo traz código e nome do autor, não o CPF. Regra proposta: nome + casa,
  conferindo homônimos (como fizemos com os senadores no TSE, `src/ingest/tse.ts`). Emendas de bancada e de
  comissão não têm autor individual: mostrar à parte ou não mostrar?
- **Qual valor mostrar:** empenhado, pago ou os dois? Restos a pagar entram?
- **Favorecidos:** o arquivo `_PorFavorecido` traz CNPJ/CPF de quem recebeu; pessoas físicas devem ficar de fora
  (mesma linha de privacidade dos doadores, #30 do backlog).

## O que fazer (depois de decidido)
- Tarefa `emendas` (só na carga completa, como `tse`), funções puras testadas com linhas reais.
- Aba "Emendas" no perfil: total por ano, por município/UF e por área (função), com link oficial.

## Pronto quando
- Decisões registradas aqui e em `docs/METRICAS.md`; cobertura informada.
