---
titulo: "TSE: incluir eleições de 2014 e 2010"
rotulos: ["ingestão", "ajuda bem-vinda", "v2"]
---
## Contexto
A tarefa `tse` (`src/ingest/tse.ts`) cobre 2018 em diante. Muitos parlamentares têm carreira longa, e a evolução
do patrimônio fica curta.

## O que fazer
- Baixar amostras reais de `consulta_cand`, `bem_candidato` e `prestacao_contas` de 2014 e 2010 e conferir os
  campos: os nomes de colunas e o formato do zip mudaram ao longo dos anos (registrar em `docs/FONTES.md`).
- Adaptar a leitura sem quebrar 2018+; funções puras com testes usando linhas reais.
- Deputados: o CPF da Câmara continua servindo para ligar; senadores, nome completo e estado (mesmas regras).

## Pronto quando
- Cobertura informada na issue (quantos parlamentares atuais têm candidatura em 2014 e 2010).
- A aba "Eleições" mostra as eleições antigas sem mudanças na tela.
