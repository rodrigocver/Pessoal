---
titulo: "Janela de exercício dos deputados pelo histórico oficial"
rotulos: ["métricas", "ingestão", "câmara", "ajuda bem-vinda"]
status: feito
---
## Contexto
Hoje a presença usa como janela de exercício o intervalo entre o primeiro e o último registro de
atividade (ver `docs/METRICAS.md`). Um titular que se licencia e volta tem as sessões do intervalo
contadas como ausência; suplentes também ficam imprecisos.

## O que fazer
- Ingerir `GET /deputados/{id}/historico` (situação: Exercício, Licença, Fim de Mandato...) numa tabela
  de períodos de exercício (`parlamentar_id`, `inicio`, `fim`).
- Usar esses períodos em `presenca()` (`src/lib/consultas.ts`) e em `calcularEstatisticas()`.
- Atualizar `docs/METRICAS.md` e o "Como calculamos".

## Pronto quando
- Para um deputado com licença conhecida, as sessões durante a licença não contam como ausência.
- Perfil e médias continuam dando o mesmo número (mesma definição nos dois lugares).

## Feito
- Tabela `exercicio` alimentada por `camara:exercicio` (regra Entrada/Saída, testada com casos reais).
- Visão `janela_exercicio` e expressão única `sessaoConta` usadas pelo perfil e pelas médias.
- Efeito colateral corrigido: sessões do Congresso Nacional sem presença publicada deixaram de contar como falta.
