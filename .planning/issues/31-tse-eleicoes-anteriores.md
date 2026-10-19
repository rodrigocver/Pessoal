---
titulo: "TSE: incluir eleições de 2014 e 2010"
rotulos: ["ingestão", "ajuda bem-vinda", "v2"]
status: feito
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

## Feito
- Tarefa `tse` cobre 2010, 2014, 2018, 2022 e 2026. Formatos antigos conferidos com amostras reais e registrados
  em `docs/FONTES.md`: cargos "1º SUPLENTE SENADOR", situação "MÉDIA", receitas com cabeçalho por extenso em
  outros arquivos (`prestacao_final_2014.zip`, `prestacao_contas_2010.zip`).
- Empresas (pessoas jurídicas, que podiam doar até 2014) e comitês financeiros aparecem pelo nome, como partidos.
- Cobertura: 187 candidaturas ao Congresso em 2010 e 248 em 2014; 251 dos 594 parlamentares em exercício têm
  ao menos uma delas. Candidaturas a deputado estadual não entram (só cargos do Congresso).
