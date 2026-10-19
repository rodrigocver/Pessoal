---
titulo: "Usar orientação de blocos parlamentares no alinhamento"
rotulos: ["métricas", "câmara"]
status: feito
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

## Feito
- Abordagem diferente da proposta: o nome da bancada na votação já lista os partidos do bloco naquela data
  ("Bl MdbPsdRepPode"), então não foi preciso ingerir `/blocos`. `partidosDoBloco()` lê as siglas e expande
  federações ("Fdr" + partido). Prioridade: partido > federação > bloco.
- Votações com orientação aplicável na legislatura: MDB 550 → 12.448, União 833 → 24.557, PP 1.306 → 22.791.
- Limitação: partidos escondidos pelo corte ("...") não recebem orientação do bloco. Ingerir `/blocos` resolveria;
  vale uma issue nova se fizer diferença.
