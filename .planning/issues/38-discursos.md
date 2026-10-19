---
titulo: "Discursos em plenário (Câmara e Senado)"
rotulos: ["v2", "funcionalidade", "ingestão", "ajuda bem-vinda"]
---
## Contexto
Os discursos são dado oficial e mostram os temas de que o parlamentar fala. Conferido em 19/10/2026:
- Câmara: `GET /deputados/{id}/discursos?dataInicio&dataFim` traz `dataHoraInicio`, `tipoDiscurso`
  ("PELA ORDEM", "BREVES COMUNICAÇÕES"...), `sumario`, `transcricao`, `urlTexto`, `urlAudio`, `urlVideo`.
- Senado: `/senador/{codigo}/discursos.json?dataInicio&dataFim` responde (formato a conferir).

## O que fazer
- Tarefas `camara:discursos` e `senado:discursos` (por ano), com funções puras testadas com amostras reais.
- Nova aba "Discursos" no perfil: data, tipo, sumário e links oficiais (texto, áudio, vídeo). Guardar a
  transcrição só se couber no banco sem pesar (avaliar volume); senão, link para a fonte.
- Contagem de discursos no período, sem classificar conteúdo (neutralidade).

## Pronto quando
- Cobertura da legislatura informada na issue; tempo da tarefa medido.
- "Como calculamos" e `docs/METRICAS.md`.
