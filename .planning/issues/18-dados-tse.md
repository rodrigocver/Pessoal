---
titulo: "Dados do TSE: patrimônio declarado e doações de campanha (v2)"
rotulos: ["v2", "funcionalidade", "ingestão", "discussão"]
status: feito
---
## Contexto
O TSE publica bens declarados e prestação de contas das candidaturas. Ligar isso ao parlamentar
completa o retrato público.

## O que fazer (discutir antes)
- Casar candidato do TSE com parlamentar (CPF não é público; usar nome de urna + UF + cargo + eleição).
- Ingerir bens declarados e receitas de campanha por eleição.

## Pronto quando
- Aba "Campanha" com patrimônio declarado por eleição e principais doadores.

## Feito
- Tarefa `tse`: candidaturas de 2018, 2022 e 2026 (inclui a eleição suplementar de senador de MT em 2020).
  Deputados ligados pelo CPF publicado pela Câmara (não pelo nome de urna); senadores pelo nome completo e estado.
  Cobertura: 513/513 deputados e 81/81 senadores. O CPF não é gravado.
- Nova aba "Eleições" no perfil: patrimônio declarado por eleição, bens por tipo (sem a descrição, que pode
  trazer endereços), receitas por origem e partidos/candidatos doadores.
- Receitas lidas só do CSV de cada estado dentro do zip de ~1 GB, por requisições de intervalo.

## Para discutir
- **Nomes de doadores pessoas físicas.** São públicos no TSE, mas mostramos só o total e o número de doadores.
  Exibir os nomes ajudaria a ver influência econômica; por outro lado expõe cidadãos comuns que doaram pouco.
  Uma opção intermediária: nomes só acima de um valor (ex.: R$ 10 mil). Precisa de decisão da comunidade.
- Eleições anteriores a 2018 (parlamentares com carreira longa).
