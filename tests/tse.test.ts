import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { casarCandidaturas, receitasPorCandidato, bensPorCandidato, valorTse, lerCsvTse, eleicoesComDados } =
  await import("@/ingest/tse");

// Campos reais de consulta_cand_2022 (Tabata Amaral); CPF igual ao publicado pela API da Câmara.
const cand = (over: Record<string, string> = {}) => ({
  SQ_CANDIDATO: "250001620281",
  NM_CANDIDATO: "TABATA CLAUDIA AMARAL DE PONTES",
  NM_URNA_CANDIDATO: "TABATA AMARAL",
  NR_CPF_CANDIDATO: "38848319840",
  DS_CARGO: "DEPUTADO FEDERAL",
  SG_UF: "SP",
  SG_PARTIDO: "PSB",
  NR_CANDIDATO: "4000",
  DS_SIT_TOT_TURNO: "ELEITO POR QP",
  DS_SITUACAO_CANDIDATURA: "APTO",
  ...over,
});

describe("casarCandidaturas", () => {
  it("deputado pelo CPF", () => {
    const r = casarCandidaturas(
      2022,
      [cand(), cand({ SQ_CANDIDATO: "2", NR_CPF_CANDIDATO: "1" })],
      [{ id: 7, cpf: "38848319840" }],
      [],
    );
    expect(r.map((c) => [c.parlamentarId, c.sqCandidato, c.cargo, c.situacao])).toEqual([
      [7, "250001620281", "DEPUTADO FEDERAL", "ELEITO POR QP"],
    ]);
  });

  it("senador pelo nome completo e estado, sem acento; homônimos (CPFs diferentes) não ligam", () => {
    const sen = cand({
      SQ_CANDIDATO: "9",
      NM_CANDIDATO: "ALAN RICK MIRANDA",
      DS_CARGO: "SENADOR",
      SG_UF: "AC",
      NR_CPF_CANDIDATO: "11111111111",
    });
    expect(
      casarCandidaturas(2022, [sen], [], [{ id: 3, nomeCompleto: "Alan Rick Miranda", uf: "AC" }]).map(
        (c) => c.parlamentarId,
      ),
    ).toEqual([3]);
    // Outro estado: não liga.
    expect(casarCandidaturas(2022, [sen], [], [{ id: 3, nomeCompleto: "Alan Rick Miranda", uf: "RO" }])).toEqual([]);
    // Homônimos (CPFs diferentes) no estado: ambíguo, não liga.
    const homonimo = [sen, { ...sen, SQ_CANDIDATO: "10", NR_CPF_CANDIDATO: "22222222222" }];
    expect(casarCandidaturas(2022, homonimo, [], [{ id: 3, nomeCompleto: "Alan Rick Miranda", uf: "AC" }])).toEqual([]);
  });

  it("registros repetidos da mesma pessoa: fica o eleito (Carlos Fávaro, TSE 2018)", () => {
    const f = (sq: string, sit: string) =>
      cand({
        SQ_CANDIDATO: sq,
        NM_CANDIDATO: "CARLOS HENRIQUE BAQUETA FAVARO",
        DS_CARGO: "SENADOR",
        SG_UF: "MT",
        NR_CPF_CANDIDATO: "62900000000",
        DS_SIT_TOT_TURNO: sit,
      });
    // Registro anulado com CPF mascarado pelo TSE ("-4"); o eleito é da eleição suplementar de 2020.
    const r = casarCandidaturas(
      2018,
      [
        { ...f("1", "#NULO#"), NR_CPF_CANDIDATO: "-4" },
        { ...f("2", "NÃO ELEITO"), DS_ELEICAO: "Eleições Gerais Estaduais 2018" },
        { ...f("3", "ELEITO"), DS_ELEICAO: "Eleição Suplementar Senador - MT", DT_ELEICAO: "15/11/2020" },
      ],
      [],
      [{ id: 5, nomeCompleto: "Carlos Henrique Baqueta Fávaro", uf: "MT" }],
    );
    expect(r.map((c) => [c.sqCandidato, c.situacao, c.eleicao, c.dataEleicao])).toEqual([
      ["3", "ELEITO", "Eleição Suplementar Senador - MT", "2020-11-15"],
    ]);
  });

  it("anulado em outro cargo some quando há candidatura válida no ano (Eduardo Gomes, TSE 2018)", () => {
    const g = (sq: string, cargo: string, sit: string) =>
      cand({
        SQ_CANDIDATO: sq,
        NM_CANDIDATO: "CARLOS EDUARDO TORRES GOMES",
        DS_CARGO: cargo,
        SG_UF: "TO",
        NR_CPF_CANDIDATO: "44444444444",
        DS_SIT_TOT_TURNO: sit,
      });
    const r = casarCandidaturas(
      2018,
      [g("1", "1º SUPLENTE", "#NULO#"), g("2", "SENADOR", "ELEITO")],
      [],
      [{ id: 8, nomeCompleto: "Carlos Eduardo Torres Gomes", uf: "TO" }],
    );
    expect(r.map((c) => [c.cargo, c.situacao])).toEqual([["SENADOR", "ELEITO"]]);
  });

  it("deputado com registro anulado e válido: fica o válido", () => {
    const r = casarCandidaturas(
      2022,
      [cand({ SQ_CANDIDATO: "a", DS_SIT_TOT_TURNO: "#NULO#" }), cand()],
      [{ id: 7, cpf: "38848319840" }],
      [],
    );
    expect(r.map((c) => c.sqCandidato)).toEqual(["250001620281"]);
  });

  it("ignora cargos fora do Congresso", () => {
    expect(casarCandidaturas(2022, [cand({ DS_CARGO: "GOVERNADOR" })], [{ id: 7, cpf: "38848319840" }], [])).toEqual(
      [],
    );
  });
});

describe("receitas e bens", () => {
  it("pessoas físicas agregadas sem nome; partidos pelo nome; doadores distintos", () => {
    const l = (origem: string, doador: string, cpf: string, valor: string) => ({
      SQ_CANDIDATO: "1",
      DS_ORIGEM_RECEITA: origem,
      NM_DOADOR: doador,
      NM_DOADOR_RFB: doador,
      NR_CPF_CNPJ_DOADOR: cpf,
      VR_RECEITA: valor,
    });
    const r = receitasPorCandidato(
      [
        l("Recursos de pessoas físicas", "FULANO", "111", "100,00"),
        l("Recursos de pessoas físicas", "FULANO", "111", "50,50"),
        l("Recursos de pessoas físicas", "BELTRANA", "222", "10,00"),
        l("Recursos de partido político", "DIREÇÃO NACIONAL", "333", "1.000,00"),
        l("#NULO", "", "", "5,00"),
      ],
      new Set(["1"]),
    ).get("1")!;
    expect(r).toEqual([
      { origem: "Recursos de pessoas físicas", doador: "", total: 160.5, doacoes: 3, doadores: 2 },
      { origem: "Recursos de partido político", doador: "DIREÇÃO NACIONAL", total: 1000, doacoes: 1, doadores: 1 },
      { origem: "Origem não informada", doador: "", total: 5, doacoes: 1, doadores: 1 },
    ]);
    expect(JSON.stringify(r)).not.toMatch(/FULANO|BELTRANA|111|222/);
  });

  it("bens: só tipo e valor (sem descrição)", () => {
    const b = bensPorCandidato(
      [
        {
          SQ_CANDIDATO: "1",
          NR_ORDEM_BEM_CANDIDATO: "4",
          DS_TIPO_BEM_CANDIDATO: "Terreno",
          DS_BEM_CANDIDATO: "UM TERRENO NA RUA X",
          VR_BEM_CANDIDATO: "20000,00",
        },
      ],
      new Set(["1"]),
    );
    expect(b.get("1")).toEqual([{ ordem: 4, tipo: "Terreno", valor: 20000 }]);
  });

  it("valores e CSV no formato do TSE", () => {
    expect([valorTse("20000,00"), valorTse("1.234,56"), valorTse("#NULO"), valorTse("-1")]).toEqual([
      20000, 1234.56, 0, 0,
    ]);
    const csv = Buffer.from('"SQ_CANDIDATO";"NM_CANDIDATO"\n"1";"JOÃO"\n', "latin1");
    expect(lerCsvTse(csv)).toEqual([{ SQ_CANDIDATO: "1", NM_CANDIDATO: "JOÃO" }]);
    expect(eleicoesComDados(new Date("2026-10-19"))).toEqual([2018, 2022, 2026]);
  });
});
