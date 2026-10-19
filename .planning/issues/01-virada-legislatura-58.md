---
titulo: "Suportar a 58ª legislatura (posse em 1º/02/2027)"
rotulos: ["prioridade alta", "ingestão", "câmara", "senado"]
status: feito
---
## Contexto
A legislatura está fixa como 57 em `src/ingest/fontes.ts` (`LEGISLATURA_ATUAL`, `INICIO_LEGISLATURA`).
Em 1º/02/2027 tomam posse os eleitos em outubro de 2026. Sem ajuste, a busca e o cadastro deixam de
incluir os novos parlamentares, justamente quando os eleitores querem acompanhar quem acabaram de eleger.

## O que fazer
- Descobrir a legislatura atual pela fonte (Câmara: `GET /legislaturas?ordem=DESC&itens=1`;
  Senado: `/plenario/lista/legislaturas`) em vez de constante.
- Cadastrar parlamentares das legislaturas 57 e 58 (quem acompanha um deputado reeleito não pode perder o histórico).
- Períodos (`src/lib/periodo.ts`): oferecer "Legislatura 2023–2027" e "Legislatura 2027–2031".
- Senadores eleitos em 2022 seguem no mandato: conferir que não são duplicados.

## Onde mexer
`src/ingest/fontes.ts`, `src/ingest/parlamentares.ts`, `src/lib/periodo.ts`, `src/ingest/estatisticas.ts`.

## Pronto quando
- Em 02/2027 a ingestão traz os 513 deputados e 81 senadores em exercício da 58ª.
- O perfil de um deputado reeleito mostra as duas legislaturas no seletor de período.
- Testes cobrindo a escolha de legislatura e os períodos.

## Feito
- A legislatura é calculada pela data (`legislaturaEm` em `src/ingest/fontes.ts`), sem constante.
- Cadastro de deputados e senadores da 57ª até a atual; quem não for reeleito mantém o histórico.
- Seletor de período com uma opção por legislatura (`leg57`, `leg58`); o valor antigo `legislatura` aponta para a atual.
- Testes em `tests/periodo.test.ts`, incluindo a virada exata em 01/02/2027.
- **Conferir em 02/2027:** rodar `npm run ingest -- deputados senadores` após a posse e verificar 513 + 81 em exercício.
