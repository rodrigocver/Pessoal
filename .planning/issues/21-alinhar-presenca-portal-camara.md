---
titulo: "Alinhar a presença em plenário com o portal da Câmara"
rotulos: ["métricas", "câmara", "discussão"]
status: feito
---
## Contexto
O perfil de cada deputado no portal da Câmara mostra presença em plenário em **dias**, separando ausências
justificadas e não justificadas. O Fiscaliza conta **sessões** e não tem as justificativas (não estão nos dados
abertos). Exemplo, Tabata Amaral em 2025:

| | Portal da Câmara | Fiscaliza |
|---|---|---|
| Plenário | 117 dias presente, 4 ausências justificadas, 0 não justificadas | 115 de 127 sessões |
| Contando por dia nos dados abertos | — | 112 de 117 dias |

Mesmo contando por dia, os totais não batem: o portal considera dias que não aparecem nos dados abertos. Um
eleitor que compare pode achar que o dado está errado.

## O que decidir / investigar
- Contar por dia, como o portal? (Muda a métrica de todos; exige atualizar `sessaoConta`, médias e textos.)
- De onde vêm os dias a mais do portal (sessões não deliberativas? sessões do Congresso?) e as justificativas.
  Verificar se existe serviço público com essas informações.
- Até decidir, o "Como calculamos" e a metodologia explicam a diferença.

## Pronto quando
- A métrica do Fiscaliza bate com o portal para uma amostra de deputados, ou a diferença restante está explicada
  com precisão na metodologia.

## Decisão (19/10/2026)
O dono do projeto decidiu **manter o critério atual**: presença por sessão deliberativa, só com dados abertos.
- Contar por dia não fecharia a diferença (112 de 117 dias contra 117 no portal), e as justificativas não são
  publicadas.
- A contagem por sessão pode ser reproduzida por qualquer pessoa a partir dos dados abertos e é a mesma lógica
  usada no Senado.
- A diferença está explicada no "Como calculamos" da aba Presença e em `docs/METRICAS.md`.

Reabrir se a Câmara passar a publicar as justificativas ou os dias usados no portal.
