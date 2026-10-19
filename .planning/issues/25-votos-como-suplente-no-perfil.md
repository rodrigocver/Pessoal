---
titulo: "Aba Votações do perfil: marcar votos dados como suplente"
rotulos: ["funcionalidade", "interface", "ajuda bem-vinda"]
status: feito
---
## Contexto
A página de cada votação já marca quem votou como suplente e de quem era a vaga (`suplenteNaVotacao` e
`detalhesVotacao` em `src/lib/consultas.ts`). A aba Votações do perfil não mostra isso: no histórico de um
suplente, não dá para saber quais votos foram dados ocupando a vaga de outra pessoa.

## O que fazer
- Reaproveitar a mesma regra (não duplicar SQL) para marcar, em `votos(...)`, os votos dados como suplente.
- Na lista, um selo "como suplente de Fulano", igual ao da página de votação.
- Atualizar "Como calculamos" da aba e `docs/METRICAS.md` (seção "Votou como suplente"), se o texto mudar.

## Pronto quando
- Teste de integração: no cenário de `tests/integracao/dados.ts`, Beto Lima aparece "como suplente de Davi Rocha"
  na v1 e Ana Souza não tem selo.
- Desempenho: a aba continua respondendo em menos de 300 ms com 200 votos (sem uma consulta por voto).

## Feito
- Os trechos SQL "exercia como suplente" e "de quem era a vaga" viraram funções compartilhadas em
  `src/lib/consultas.ts` (`sqlComoSuplente`, `sqlVagas`), usadas pela página da votação e por `votos()`.
- Selo "suplente · na vaga de Fulano" na aba Votações (componente `SeloSuplente`, o mesmo da votação).
- Teste de integração (Beto Lima na v1 como suplente de Davi Rocha) e teste de ponta a ponta.
- A aba é estática (CDN), então o custo da consulta extra só existe na primeira visita depois da ingestão.
