---
titulo: "Mostrar nomes de doadores pessoas físicas?"
rotulos: ["discussão", "segurança"]
status: feito
---
## Contexto
Na aba "Eleições", doações de pessoas físicas aparecem só como total e número de doadores; partidos e outros
candidatos aparecem pelo nome. Os nomes de todos os doadores são públicos no TSE (ver #18).

## Para discutir
- **A favor de mostrar:** ajuda a ver influência econômica (grandes doadores, empresários) e é dado oficial.
- **Contra:** expõe cidadãos comuns que doaram pouco, num site focado em parlamentares; facilita perseguição
  política de doadores.
- **Meio-termo possível:** nomes só acima de um valor (ex.: R$ 10 mil ou o teto de 10% da renda) e sem CPF.
- Qualquer opção precisa de texto em "Como calculamos" e em `docs/METRICAS.md`.

## Pronto quando
- Decisão registrada nesta issue e na metodologia; se for mostrar, abrir issue de implementação.

## Decisão (19/10/2026)
O dono do projeto decidiu: **só os 3 maiores doadores pessoas físicas de cada campanha aparecem pelo nome**.
- Maior = soma de todas as doações da pessoa àquela campanha; empate decidido pelo nome (ordem alfabética).
- Os demais continuam somados, com o número de doadores. CPF nunca é guardado nem exibido.
- Implementação: `destacarMaioresDoadores` em `src/ingest/tse.ts` (com testes); lista "3 maiores doadores
  pessoas físicas" na aba Eleições; regra no "Como calculamos" e em `docs/METRICAS.md`.
- Em 19/10/2026: 1.883 campanhas com ao menos um doador nomeado.
