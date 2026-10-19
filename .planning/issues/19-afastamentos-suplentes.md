---
titulo: "Destacar quando o titular se afasta e o suplente assume"
rotulos: ["funcionalidade", "interface", "ingestão"]
status: feito
---
## Contexto
Pedido do dono do projeto: o eleitor precisa saber quando a pessoa em quem votou deixou a vaga para um suplente
(ministério, secretaria, licença, renúncia) e quem está votando no lugar.

## Feito
- Afastamentos e substituições a partir do histórico oficial (Câmara) e dos mandatos (Senado), com grau de certeza.
- Aviso em destaque no perfil, selo nos cartões e na busca, histórico com retornos curtos, perfil do suplente com a
  vaga que ocupa, frases no resumo mensal.
- Titulares afastados passaram a aparecer na busca padrão.
- Página de votação: selo "suplente" em cada voto, "na vaga de [titular]", contagem no resultado e seção
  "Votaram como suplentes".

## Investigado: resolver os casos "possíveis" da Câmara (19 de 229)
- **Ordem de suplência do TSE:** diz *quem* é convocado, não *qual vaga* cada suplente ocupa quando vários
  titulares do mesmo partido/federação saem juntos — exatamente os casos ambíguos. Além disso, os votos por
  candidato de 2022 só existem num arquivo nacional de 636 MB, e a divulgação em JSON de 2022 saiu do ar.
- **Ordem das datas (1ª vaga aberta ↔ 1º suplente empossado):** testada contra os casos já resolvidos pelo
  alinhamento das datas de volta: acertou 5 de 7 (71%). Não é confiável.
- Conclusão: com os dados públicos da API, esses casos não têm resposta segura; o site mostra todos os
  candidatos e diz que a Câmara não informa o vínculo. Caminho possível, a avaliar: a biografia do suplente
  no portal da Câmara às vezes cita "na vaga de" — mas não está na API e exigiria raspar páginas.
