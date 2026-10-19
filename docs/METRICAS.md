# Métricas

Como cada número do Fiscaliza é calculado. Todos os dados vêm das fontes oficiais da Câmara dos
Deputados e do Senado Federal, e o mesmo cálculo vale para todos os parlamentares, de qualquer partido.

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

Licenças seguem o **status oficial de cada casa**:
- **Câmara:** toda licença registrada no histórico (saúde, interesse particular, cargo no Executivo) tira o
  deputado do exercício, com ou sem suplente. Esses períodos não contam na presença, nem como falta.
- **Senado:** licenças em que o senador continua em exercício (por exemplo, até 120 dias sem convocação de
  suplente) **contam como ausência**, com o motivo exibido na lista de ausências.

Faltas sem licença contam como ausência nas duas casas, mesmo justificadas.

## Afastamentos e suplentes

Quando o titular eleito se afasta (cargo no Executivo, licença longa, renúncia, perda de mandato), um suplente
ocupa a vaga, vota e usa a cota parlamentar. O Fiscaliza destaca isso no topo do perfil, nos cartões, na busca
e no resumo mensal.

- **Afastamento:** na Câmara, cada evento "Saída" do histórico enquanto titular, até a próxima "Entrada"
  (reassunção). Renovações sem volta no meio são o mesmo afastamento, com todos os motivos. O fim da legislatura
  não conta. No Senado, os intervalos entre os exercícios do mandato do titular, com o motivo informado no fim do
  exercício anterior.
- **Saída definitiva:** renúncia, perda de mandato, cassação, falecimento.
- **Retorno curto:** volta ao mandato de até 30 dias entre dois afastamentos (ex.: ministros que reassumem para
  uma votação).
- **Quem ocupou a vaga**, com o grau de certeza mostrado na tela:
  - **Senado (oficial):** o mandato lista os suplentes; vale quem esteve em exercício durante o afastamento.
  - **Câmara (pelas datas):** a Câmara não informa o vínculo. Casamos suplentes do mesmo estado e do mesmo partido
    ou federação, com posse até 15 dias depois da saída do titular (45 para saídas definitivas) e saída até 2 dias
    da volta dele. Uma posse preenche uma vaga só. Se sobrar mais de um candidato, vale o suplente já identificado
    em outro afastamento do mesmo titular; se nem assim, todos aparecem como **possíveis**.
- **Votou como suplente** (página de votação e aba Votações do perfil): na data da votação, o parlamentar estava num período de exercício
  como suplente (Câmara: condição "Suplente" no histórico; Senado: mandato de 1º/2º suplente). A vaga vem das
  substituições acima; no Senado, se o afastamento do titular for anterior a 2023 (suplente efetivado após
  falecimento ou renúncia), usamos o campo "Titular" do mandato do suplente.
- Implementação: `src/ingest/afastamentos.ts` (regras, testadas com casos reais em `tests/fixtures/`),
  tabelas `afastamento` e `substituicao`, preenchidas pelas tarefas `camara:exercicio` e `senado:exercicio`.

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

**Diferença em relação ao portal da Câmara:** o perfil de cada deputado no portal conta **dias** com sessão
deliberativa (não sessões) e separa **ausências justificadas** das não justificadas. As justificativas não são
publicadas nos dados abertos, e o portal parece considerar sessões que não aparecem neles. Por isso os números
não coincidem (ex.: Tabata Amaral em 2025 — portal: 117 dias presente e 4 ausências justificadas; Fiscaliza:
115 de 127 sessões). **Decisão do projeto:** manter a contagem por sessão, com a diferença explicada. Ela usa só
o que é publicado nos dados abertos, pode ser conferida por qualquer pessoa e vale igual para as duas casas.

## Comissões

- **Câmara — presença em comissões:** reuniões **deliberativas** ("Reunião Deliberativa" e "Audiência Pública e
  Deliberação") das comissões permanentes, especiais e CPIs em que o deputado era **membro titular** na data
  (qualquer cargo menos suplente), enquanto em exercício, já realizadas e com presença publicada. Reunião conjunta
  conta para cada comissão. Audiências públicas, seminários e comissões em que é suplente não entram. Expressão
  SQL única: `reuniaoConta` em `src/lib/exercicio.ts`. O portal da Câmara conta todas as reuniões, inclusive
  audiências e comissões como suplente, e separa ausências justificadas.
- **Senado — relatorias:** projetos de que o senador foi relator (designação, saída e motivo), designados a partir
  de 2023, ativos no período. O Senado **não publica presença** em reuniões de comissão.
- **Membros:** comissões de que foi membro no período, com cargo e datas (Câmara: `orgaosDeputados-L{n}`; Senado:
  `/senador/{codigo}/comissoes`). Grupos e frentes parlamentares aparecem à parte.
- **No resumo mensal:** deputados, "esteve em X de Y reuniões deliberativas das comissões em que é titular" (soma
  das comissões, mesma regra acima, no mês); senadores, número de relatorias designadas no mês. Sem reunião ou
  relatoria no mês, a linha não aparece.
- A Câmara não publica o histórico de relatorias nos dados abertos (o serviço de relatores responde "método não
  suportado").

## Votações

Só **votações nominais de plenário** (o voto de cada parlamentar fica registrado). Na Câmara: órgão
`PLEN` com total de votos > 0. Votações simbólicas não entram, porque não dizem como cada um votou.

**Temas:** classificação oficial da matéria votada, de cada casa: Câmara, os temas da proposição
(`/proposicoes/{id}/temas`, 32 temas); Senado, o nível mais alto das classificações do processo
(`/processo/{id}`). As classificações das duas casas são diferentes e não são convertidas uma na outra.
Matérias sem classificação (ex.: indicações de autoridades no Senado) aparecem só em "Todos os temas".

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

## Eleições (TSE)

Candidaturas a deputado federal, senador e suplente de senador nas eleições gerais de 2010 em diante (inclusive
eleições suplementares que constam no arquivo do ano), com dados abertos do Tribunal Superior Eleitoral.

- **Quem é quem:** deputados pelo CPF publicado pela Câmara (`GET /deputados/{id}`); senadores pelo nome completo e
  estado, sem acentos, e só quando o grupo de registros com esse nome não traz dois CPFs diferentes (homônimos não
  ligam). O CPF é usado apenas na memória durante a ingestão e não é gravado.
- **Registro repetido:** o TSE pode ter mais de um registro da mesma pessoa no ano (candidatura anulada e refeita,
  eleição suplementar). Fica um por cargo, preferindo o eleito, depois o válido; registros anulados somem quando há
  candidatura válida no ano.
- **Patrimônio declarado:** soma dos bens declarados pelo candidato no registro da candidatura. Mostramos tipo e
  valor; a descrição não aparece, porque pode trazer endereços. Valores nominais, sem correção pela inflação.
- **Receitas de campanha:** soma das receitas da prestação de contas do candidato, por origem. Doações de pessoas
  físicas aparecem como total e número de doadores distintos; só os **3 maiores doadores** de cada campanha (soma das
  doações de cada um, desempate pelo nome) aparecem pelo nome, sem CPF; partidos, outros candidatos, comitês
  financeiros (até 2014) e empresas (pessoas jurídicas, que podiam doar até 2014) aparecem pelo nome.

## Baixar os dados

Cada aba de presença, votações, projetos e gastos tem um link para baixar o mesmo recorte em CSV
(`/dados/camara/{id}/{aba}-{periodo}.csv`): as linhas que formam os números da tela, geradas pelas mesmas consultas.
Formato para planilhas em português: separador `;`, vírgula decimal, datas `AAAA-MM-DD` (horário de Brasília) e
UTF-8 com BOM. Cada linha traz o link da fonte oficial.

## Médias da casa e do partido

Média simples entre os parlamentares **em exercício hoje** da mesma casa (e do mesmo partido atual),
com cada parlamentar pesando igual. Calculadas pela tarefa `estatisticas`.

## Para quem contribui

Este arquivo é a definição oficial e é publicado no site em `/metodologia`. O texto "Como calculamos" de
cada tela deve dizer o mesmo; mudou a definição, atualize os dois no mesmo pull request.

Implementação: `src/lib/consultas.ts` (páginas) e `src/ingest/estatisticas.ts` (médias). As duas precisam
seguir a mesma definição; `tests/integracao/` confere que batem.
