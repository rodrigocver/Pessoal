---
titulo: "Baixar os dados do perfil em CSV"
rotulos: ["funcionalidade", "interface", "ajuda bem-vinda"]
status: feito
---
## Contexto
Jornalistas e pesquisadores pedem os números em planilha. Tudo já está no banco do Fiscaliza; falta oferecer o
download, no mesmo recorte (parlamentar e período) que a tela mostra.

## O que fazer
- Rota `src/app/parlamentar/[casa]/[id]/csv/route.ts?aba=votacoes|presenca|gastos|proposicoes&periodo=...`.
- Reaproveitar as consultas de `src/lib/consultas.ts` (nada de consultar APIs oficiais em tempo real).
- CSV com separador `;`, UTF-8 com BOM (abre direto no Excel em português), datas `AAAA-MM-DD`, valores com ponto
  decimal, e uma coluna `fonte_url` com o link oficial de cada linha.
- Link "Baixar CSV" no rodapé de cada aba.
- Nada de dados pessoais além do que já aparece na tela.

## Pronto quando
- Teste de integração da rota com o cenário de `tests/integracao/`.
- O arquivo abre corretamente no LibreOffice e no Excel (acentos e valores).

## Feito
- `/dados/{casa}/{id}/{aba}-{periodo}.csv` para presença (cada sessão que conta), votações (com suplência),
  projetos e gastos (cada lançamento, com nota fiscal). Mesmas consultas das abas; em cache na CDN.
- Formato: `;`, **vírgula decimal** (com `;` é o que o Excel e o LibreOffice em português esperam; a issue
  previa ponto), datas `AAAA-MM-DD`, UTF-8 com BOM, `fonte_url` em cada linha, proteção contra fórmulas.
- Conferido no LibreOffice (pt-BR): datas e valores viram números, acentos corretos. Testes de unidade e de
  integração (o CSV bate com os números da tela).
