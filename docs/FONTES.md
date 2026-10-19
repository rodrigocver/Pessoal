# Fontes de dados

Verificado em 19/10/2026. Se algo mudou na fonte, atualize este arquivo no mesmo pull request.

## Câmara dos Deputados — API v2 `https://dadosabertos.camara.leg.br/api/v2`

| Dado | Endpoint / arquivo | Observação |
|---|---|---|
| Deputados | `GET /deputados`, `/deputados/{id}` | OK, rápido |
| Sessões de plenário | `GET /eventos?codTipoEvento=110` (Sessão Deliberativa) | OK |
| **Presença** | `GET /eventos/{id}/deputados` | Lista quem registrou presença no evento. Presença = sessões presentes / sessões deliberativas no período |
| Votações | `GET /votacoes`, `/votacoes/{id}/votos` | Muitas votações (simbólicas) vêm sem votos — só as nominais têm |
| Votações em lote | `https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/json/votacoesVotos-{ano}.json` | **Preferir** para carga histórica |
| Proposições | `GET /proposicoes?idDeputadoAutor={id}` | OK |
| Despesas (CEAP) | `GET /deputados/{id}/despesas` | **Deu timeout no teste.** Usar arquivo em lote `https://www.camara.leg.br/cotas/Ano-{ano}.csv.zip` |

## Senado Federal — `https://legis.senado.leg.br/dadosabertos`

| Dado | Endpoint | Observação |
|---|---|---|
| Senadores em exercício | `GET /senador/lista/atual.json` | OK |
| Votações | `GET /votacao?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` (JSON) | **Novo serviço.** O antigo `/senador/{cod}/votacoes` foi desativado em 01/02/2026 |
| Proposições | `GET /processo?...` / matérias por autor | Confirmar formato na fase de ingestão do Senado |
| Despesas (CEAPS) | `https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps/{ano}` | OK, JSON anual completo |
| **Presença** | A definir | Senado não expõe lista de presença direta e simples. Opções: (a) comparecimento derivado das votações nominais; (b) serviço de plenário/sessões. **Pesquisar na Fase 4** |

## Conclusões para a arquitetura

1. **Ingestão em lote + banco próprio** é obrigatória: APIs lentas, com timeouts e endpoints que mudam.
2. Guardar `fonte`, `url_origem` e `atualizado_em` em cada registro para transparência.
3. Normalizar Câmara e Senado num modelo comum (`parlamentar`, `sessao`, `presenca`, `votacao`, `voto`, `proposicao`, `despesa`) com coluna `casa` (`CD` / `SF`).
4. Métricas precisam de definição explícita e exibida ao usuário (ex.: "presença = sessões deliberativas com registro de presença ÷ sessões deliberativas do período").
5. Atenção a suplentes/licenças: um parlamentar pode ficar fora do exercício parte do período — calcular sobre os dias em exercício.

## Atualização — Fase 4 (Senado)
- **Presença:** não há lista de presença. Cada voto nominal em `/votacao` traz o código de comparecimento
  (`Sim`, `Não`, `Abstenção`, `Votou` (secreto), `P-NRV` presente sem voto, `Presidente (art. 51 RISF)`,
  `AP` atividade parlamentar, `MIS` missão, `LS`/`LP` licenças, `NCom` não compareceu). Presença = sessões com
  votação nominal em que o senador teve código de presente. Cobre ~36 sessões/ano (o Senado vota muito em modo simbólico).
- **Votações:** `/votacao?dataInicio&dataFim` em janelas mensais; respostas grandes às vezes vêm cortadas — retentar.
- **Orientação de bancada:** `/plenario/votacao/orientacaoBancada/{AAAAMMDD}/{AAAAMMDD}.json`, ligada por `sequencialVotacao`. Raramente preenchida.
- **Proposições:** `/processo?codigoParlamentarAutor=X&dataInicioApresentacao&dataFimApresentacao` (máx. 1 ano por consulta).
- **CEAPS:** JSON anual com `id` único por lançamento.

## Armadilhas conhecidas

| Problema | Como o código lida |
|---|---|
| Downloads grandes chegam cortados sem erro | `baixarArquivo` confere o `Content-Length` e tenta de novo |
| A Câmara regenera os arquivos de madrugada (~01h–02h de Brasília); quem baixa nesse horário recebe JSON truncado | `baixarJson` espera e tenta de novo; o agendamento roda às 06h17 |
| CSV de proposições da Câmara tem aspas malformadas | Usamos a versão JSON do mesmo arquivo |
| `votacoesObjetos` (Câmara) lista pareceres e emendas, não a matéria principal | Usamos `votacoesProposicoes` e o prefixo do id da votação |
| Voto vazio na Câmara | É votação secreta (escolha de autoridades): rótulo "Votou (secreto)" |
| Senado devolve objeto quando há um item e lista quando há vários | `comoLista()` |
| Nomes de bancada inconsistentes ("Republica", "Republican", "Progressistas" = PP) | `prioridadeOrientacao()` em `src/ingest/alinhamento.ts`, com testes |
| Nomes de blocos abreviados e cortados ("Bl UniPpPsd...") | Orientação de bloco é ignorada (há issue para resolver com `/blocos`) |

## Outras fontes úteis (ainda não usadas)

| Fonte | Para quê |
|---|---|
| Câmara `GET /blocos`, `/blocos/{id}/partidos` | Composição de blocos — alinhamento por bloco |
| Câmara `GET /deputados/{id}/historico` | Entradas e saídas de exercício (suplentes, licenças) |
| Câmara `arquivos/proposicoesTemas/json/proposicoesTemas-{ano}.json` | Temas das proposições — filtro por tema |
| Câmara `GET /orgaos`, `/orgaos/{id}/membros`, `/orgaos/{id}/eventos` | Comissões |
| Senado `GET /senador/{codigo}/licencas.json` | Licenças — janela de exercício |
| Senado `GET /senador/{codigo}/comissoes.json` | Comissões |
| TSE — dados abertos de candidaturas, bens e prestação de contas | Patrimônio e doações (v2) |
