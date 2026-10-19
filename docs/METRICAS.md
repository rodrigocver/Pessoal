# Métricas

Definições oficiais de cada número exibido. O texto "Como calculamos" no site deve dizer o mesmo
que este arquivo. Mudou a definição? Atualize os dois no mesmo pull request.

Implementação: `src/lib/consultas.ts` (páginas) e `src/ingest/estatisticas.ts` (médias). As duas
precisam seguir a mesma definição.

## Janela de exercício

Só contam as sessões em que o parlamentar estava **em exercício** (fora disso, um suplente ocupava a vaga):
- **Câmara:** `GET /deputados/{id}/historico`. Eventos cuja descrição começa com "Entrada" (posse,
  reassunção) abrem um período; os que começam com "Saída" (licença com suplente, afastamento, fim de
  mandato) fecham. O campo `situacao` não é usado: há reassunções registradas como "CONVOCADO".
- **Senado:** `GET /senador/{codigo}/mandatos.json`, lista de `Exercicios` (data final inclusiva).

Implementação: tabela `exercicio` (tarefas `camara:exercicio` e `senado:exercicio`) e visão
`janela_exercicio`, recalculada pela tarefa `estatisticas`. Para quem não tem histórico ingerido, a visão
usa a aproximação antiga: da primeira à última atividade registrada (presença ou voto), ou até hoje se em
exercício. A expressão SQL única fica em `src/lib/exercicio.ts` (`sessaoConta`).

Licenças curtas, em que o titular não é substituído, **continuam contando como ausência** (no Senado, o
motivo aparece na lista de ausências).

## Presença

**Câmara:** sessões deliberativas do plenário (`descricaoTipo = "Sessão Deliberativa"`, exceto
canceladas) com registro de presença do deputado ÷ sessões deliberativas dentro da janela de exercício.
Sessões solenes, não deliberativas e reuniões de comissão não entram. Faltas justificadas contam
como ausência.

Só entram sessões que **já aconteceram e têm alguma presença publicada**. Isso exclui as sessões do
Congresso Nacional realizadas no plenário da Câmara (vetos, orçamento), para as quais a Câmara não
publica presença, e evita que uma sessão recente, com a lista ainda não divulgada, vire falta de todos.

**Senado:** não há lista de presença publicada. Usamos as sessões com **ao menos uma votação nominal**.
Presente = teve em alguma votação da sessão um destes códigos: `Sim`, `Não`, `Abstenção`, `Obstrução`,
`Votou` (secreto), `P-NRV` (presente sem voto), `Presidente (art. 51 RISF)`. Os demais códigos
(`AP`, `MIS`, `LS`, `LP`, `NCom`...) são ausência, e o motivo aparece na lista de ausências.

## Votações

Só **votações nominais de plenário** (o voto de cada parlamentar fica registrado). Na Câmara: órgão
`PLEN` com total de votos > 0. Votações simbólicas não entram, porque não dizem como cada um votou.

**Votos efetivos** (cartões e médias): `Sim`, `Não`, `Abstenção`, `Obstrução`, `Votou (secreto)`.

## Alinhamento

Votações em que o voto foi **igual à orientação** ÷ votações em que **havia orientação aplicável**.
Só entram votos e orientações `Sim`, `Não`, `Abstenção` ou `Obstrução` (orientação "Liberado" e
ausências ficam de fora).

- **Partido:** usa o partido do parlamentar **na data do voto**. Vale a orientação do próprio partido;
  se não houver, a da federação que ele integra; se não houver, a do bloco. A composição do bloco vem do
  próprio nome da bancada na votação ("Bl MdbPsdRepPode" = MDB, PSD, Republicanos, Podemos; "Fdr" seguido
  de um partido inclui a federação dele). Partidos escondidos quando a fonte corta o nome ("Bl UniPpPsd...")
  não recebem a orientação do bloco. Implementação: `src/ingest/alinhamento.ts`.
- **Governo:** orientação da bancada "Governo".

## Projetos apresentados

Proposições em que o parlamentar é autor ou coautor (proponente), pela data de apresentação.
- Câmara: PEC, PLP, PL, PDL, PRC, MPV, RIC (requerimento de informação), INC (indicação).
- Senado: PEC, PL, PLP, PDL, PRS.

## Gastos

Soma do valor **líquido reembolsado** da cota parlamentar (CEAP na Câmara, CEAPS no Senado) por mês
de competência. Não inclui salário, verba de gabinete nem auxílio-moradia pago em dinheiro.

## Médias da casa e do partido

Média simples entre os parlamentares **em exercício hoje** da mesma casa (e do mesmo partido atual),
com cada parlamentar pesando igual. Calculadas pela tarefa `estatisticas`.
