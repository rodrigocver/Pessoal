# Métricas

Definições oficiais de cada número exibido. O texto "Como calculamos" no site deve dizer o mesmo
que este arquivo. Mudou a definição? Atualize os dois no mesmo pull request.

Implementação: `src/lib/consultas.ts` (páginas) e `src/ingest/estatisticas.ts` (médias). As duas
precisam seguir a mesma definição.

## Janela de exercício

As fontes não publicam, de forma simples, quando cada parlamentar esteve licenciado ou foi substituído
por suplente. Aproximação atual: do **primeiro ao último registro de atividade** (presença ou voto)
do parlamentar, estendendo **até hoje** se ele está em exercício. Recortada pelo período escolhido.

> Limitação conhecida: um titular que se licencia no meio do período e volta depois tem as sessões
> do intervalo contadas como ausência. Há issues para usar `/deputados/{id}/historico` e
> `/senador/{codigo}/licencas`.

## Presença

**Câmara:** sessões deliberativas do plenário (`descricaoTipo = "Sessão Deliberativa"`, exceto
canceladas) com registro de presença do deputado ÷ sessões deliberativas dentro da janela de exercício.
Sessões solenes, não deliberativas e reuniões de comissão não entram. Faltas justificadas contam
como ausência.

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
  se não houver, a da federação que ele integra. Orientações de blocos não são usadas.
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
