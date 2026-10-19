---
titulo: "Usar orientação de blocos parlamentares no alinhamento"
rotulos: ["métricas", "câmara"]
---
## Contexto
Muitos partidos orientam pelo bloco ("Bl UniPpPsd..."). Como a fonte abrevia e corta os nomes, hoje
ignoramos orientações de bloco (`prioridadeOrientacao` em `src/ingest/alinhamento.ts`). Com isso,
parte das votações fica sem orientação aplicável.

## O que fazer
- Ingerir `GET /blocos` e `GET /blocos/{id}/partidos` (Câmara) com o período de vigência.
- Casar o nome abreviado da orientação com o bloco vigente na data da votação.
- Prioridade: partido > federação > bloco.

## Pronto quando
- O total de votações com orientação aplicável aumenta para partidos de bloco (PP, PSD, MDB...).
- Testes para o casamento nome abreviado → bloco.
