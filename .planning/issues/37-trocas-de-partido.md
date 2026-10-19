---
titulo: "Histórico de trocas de partido no perfil"
rotulos: ["funcionalidade", "ingestão", "ajuda bem-vinda"]
---
## Contexto
O perfil mostra só o partido atual. O partido na data de cada voto já é guardado (`voto.partido`, base do
alinhamento), e a Câmara publica o histórico do deputado (`GET /deputados/{id}/historico`, já usado para a
janela de exercício).

## O que fazer
- Baixar uma amostra real do histórico e conferir se ele traz a sigla do partido em cada evento (registrar em
  `docs/FONTES.md`). No Senado, conferir `/senador/{codigo}/filiacoes` ou equivalente.
- Guardar os períodos de filiação (nova tabela) na tarefa `camara:exercicio` / `senado:exercicio`.
- No perfil: "Partidos no mandato: PSL (2019–2022), PL (desde 2022)", em ordem, sem comentário.

## Pronto quando
- Função pura de conversão testada com um histórico real que tenha troca de partido.
- Definição em `docs/METRICAS.md` e "Como calculamos" no perfil.
