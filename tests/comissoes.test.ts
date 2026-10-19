import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const {
  mapMembrosCamara,
  reunioesDeliberativas,
  ehTitular,
  mapComissoesSenado,
  mapRelatoriasSenado,
  tipoColegiadoSenado,
} = await import("@/ingest/comissoes");

describe("Câmara", () => {
  it("membros: ids das URIs, datas e fim vazio como nulo (formato real de orgaosDeputados-L57)", () => {
    expect(
      mapMembrosCamara([
        {
          uriOrgao: "https://dadosabertos.camara.leg.br/api/v2/orgaos/4",
          uriDeputado: "https://dadosabertos.camara.leg.br/api/v2/deputados/178937",
          cargo: "1º Vice-Presidente",
          dataInicio: "2025-02-01",
          dataFim: "",
        },
      ]),
    ).toEqual([{ orgaoRef: "4", deputadoRef: "178937", cargo: "1º Vice-Presidente", inicio: "2025-02-01", fim: null }]);
  });

  it("titular é todo cargo que não seja suplente", () => {
    expect(["Titular", "Presidente", "2º Vice-Presidente", "Relator"].every(ehTitular)).toBe(true);
    expect(ehTitular("Suplente")).toBe(false);
  });

  it("só reuniões deliberativas realizadas de comissões permanentes, especiais e CPIs; conjuntas contam para cada uma", () => {
    const tipos: Record<string, string> = {
      "2003": "Comissão Permanente",
      "539635": "Comissão Especial",
      "4": "Comissão Diretora",
    };
    const ev = (id: number, descricaoTipo: string, situacao = "Encerrada") => ({
      id,
      dataHoraInicio: "2025-05-06T10:00",
      descricaoTipo,
      descricao: "",
      situacao,
    });
    const r = reunioesDeliberativas(
      [
        ev(1, "Reunião Deliberativa"),
        ev(2, "Audiência Pública"),
        ev(3, "Reunião Deliberativa", "Cancelada"),
        ev(4, "Audiência Pública e Deliberação"),
        ev(5, "Reunião Deliberativa"),
      ],
      [
        { idEvento: 1, idOrgao: 2003 },
        { idEvento: 1, idOrgao: 539635 },
        { idEvento: 2, idOrgao: 2003 },
        { idEvento: 3, idOrgao: 2003 },
        { idEvento: 4, idOrgao: 2003 },
        { idEvento: 5, idOrgao: 4 },
      ],
      (o) => tipos[o],
    );
    expect(r.map((x) => [x.eventoRef, x.orgaoRef])).toEqual([
      ["1", "2003"],
      ["1", "539635"],
      ["4", "2003"],
    ]);
  });
});

describe("Senado", () => {
  it("comissões: grupos parlamentares identificados, fim opcional", () => {
    const r = mapComissoesSenado([
      {
        IdentificacaoComissao: {
          CodigoComissao: "2437",
          SiglaComissao: "GPBOLIVIA",
          NomeComissao: "Grupo Parlamentar Brasil - Bolívia",
          SiglaCasaComissao: "CN",
        },
        DescricaoParticipacao: "Titular",
        DataInicio: "2021-03-24",
        DataFim: "2023-01-31",
      },
      {
        IdentificacaoComissao: {
          CodigoComissao: "1307",
          SiglaComissao: "CRA",
          NomeComissao: "Comissão de Agricultura e Reforma Agrária",
          SiglaCasaComissao: "SF",
        },
        DescricaoParticipacao: "Suplente",
        DataInicio: "2025-02-25",
      },
    ]);
    expect(r.map((x) => [x.orgao.sigla, x.orgao.tipo, x.cargo, x.fim])).toEqual([
      ["GPBOLIVIA", "Grupo Parlamentar", "Titular", "2023-01-31"],
      ["CRA", null, "Suplente", null],
    ]);
    expect(tipoColegiadoSenado("Comissão de Assuntos Econômicos")).toBeNull();
  });

  it("relatorias: resposta real de /processo/relatoria (Alan Rick, PL 6230/2019 na CRA)", () => {
    const [r] = mapRelatoriasSenado([
      {
        idProcesso: 7846537,
        identificacaoProcesso: "PL 6230/2019",
        ementaProcesso: "Dispõe sobre os Planos de Prevenção e Controle dos Desmatamentos...",
        siglaColegiado: "CRA",
        descricaoTipoRelator: "Relator",
        dataDesignacao: "2025-02-25 15:46:48",
        dataDestituicao: "2025-03-21 12:10:00",
        descricaoTipoEncerramento: "Redistribuição",
      },
    ]);
    expect(r).toMatchObject({
      proposicao: "PL 6230/2019",
      proposicaoRef: "7846537",
      colegiado: "CRA",
      motivoFim: "Redistribuição",
    });
    expect(r.designacao.toISOString()).toBe("2025-02-25T18:46:48.000Z");
  });

  it("relatorias repetidas na mesma resposta viram uma só", () => {
    const item = {
      idProcesso: 1,
      identificacaoProcesso: "PL 1/2025",
      ementaProcesso: null,
      siglaColegiado: "CAE",
      descricaoTipoRelator: "Relator",
      dataDesignacao: "2025-03-01 10:00:00",
      dataDestituicao: null,
      descricaoTipoEncerramento: null,
    };
    expect(mapRelatoriasSenado([item, { ...item }, { ...item, siglaColegiado: "CCJ" }])).toHaveLength(2);
  });
});
