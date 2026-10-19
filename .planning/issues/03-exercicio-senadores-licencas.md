---
titulo: "Janela de exercício dos senadores pelas licenças oficiais"
rotulos: ["métricas", "ingestão", "senado", "ajuda bem-vinda"]
status: feito
---
## Contexto
Mesmo problema da issue de deputados, no Senado. A fonte `GET /senador/{codigo}/licencas.json`
lista as licenças com datas, e `/senador/{codigo}/mandatos.json` traz os exercícios.

## O que fazer
- Ingerir licenças/exercícios na mesma tabela de períodos de exercício (combinar com a issue da Câmara).
- Sessões dentro de licença saem do denominador da presença.

## Pronto quando
- Um senador em licença saúde no período não tem essas sessões como ausência.
- Testes com exemplo real da resposta do Senado.

## Feito
- `senado:exercicio` usa os `Exercicios` de `/senador/{codigo}/mandatos.json`: períodos com suplente no
  lugar ficam fora do cálculo.
- **Decisão:** licenças curtas sem suplente continuam contando como ausência (com o motivo exibido),
  igual à Câmara. Mudar isso exige discussão em issue nova.
