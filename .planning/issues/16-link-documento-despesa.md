---
titulo: "Mostrar a nota fiscal de cada despesa"
rotulos: ["boa primeira issue", "interface"]
status: feito
---
## Contexto
A ingestão da Câmara já grava `documento_url` (PDF da nota) em `despesa`, mas o site não exibe.

## O que fazer
- Na aba Gastos, ao tocar num fornecedor, listar os lançamentos (data, valor, link da nota quando houver).

## Pronto quando
- É possível abrir a nota fiscal de um gasto de um deputado a partir do perfil.

## Feito
- Cada fornecedor da aba Gastos abre a lista de lançamentos (data, categoria, valor, link da nota).
- Câmara: link oficial do documento (74% dos lançamentos). Senado: "sem nota" (não publica o link).
- Mês de competência indicado quando difere da data da nota.
