import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const {
  casarCandidaturas,
  receitasPorCandidato,
  bensPorCandidato,
  valorTse,
  lerCsvTse,
  eleicoesComDados,
  arquivoReceitas,
  normalizarCandidato,
} = await import("@/ingest/tse");

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
  it("pessoas físicas: 3 maiores doadores pelo nome, demais somados; partidos pelo nome; sem CPF", () => {
    const l = (origem: string, doador: string, cpf: string, valor: string) => ({
      SQ_CANDIDATO: "1",
      DS_ORIGEM_RECEITA: origem,
      NM_DOADOR: doador,
      NM_DOADOR_RFB: doador,
      NR_CPF_CNPJ_DOADOR: cpf,
      VR_RECEITA: valor,
    });
    const pf = "Recursos de pessoas físicas";
    const r = receitasPorCandidato(
      [
        // Duas doações da mesma pessoa somam: FULANO é o maior (150,50).
        l(pf, "FULANO", "11111111111", "100,00"),
        l(pf, "FULANO", "11111111111", "50,50"),
        l(pf, "BELTRANA", "22222222222", "120,00"),
        l(pf, "CICRANO", "33333333333", "90,00"),
        l(pf, "QUARTA PESSOA", "44444444444", "80,00"),
        l(pf, "QUINTA PESSOA", "55555555555", "10,00"),
        l("Recursos de partido político", "DIREÇÃO NACIONAL", "66666666000166", "1.000,00"),
        l("#NULO", "", "", "5,00"),
      ],
      new Set(["1"]),
    ).get("1")!;
    expect(r).toEqual([
      { origem: pf, doador: "FULANO", total: 150.5, doacoes: 2, doadores: 1 },
      { origem: pf, doador: "BELTRANA", total: 120, doacoes: 1, doadores: 1 },
      { origem: pf, doador: "CICRANO", total: 90, doacoes: 1, doadores: 1 },
      { origem: pf, doador: "", total: 90, doacoes: 2, doadores: 2 },
      { origem: "Recursos de partido político", doador: "DIREÇÃO NACIONAL", total: 1000, doacoes: 1, doadores: 1 },
      { origem: "Origem não informada", doador: "", total: 5, doacoes: 1, doadores: 1 },
    ]);
    const texto = JSON.stringify(r);
    expect(texto).not.toMatch(/QUARTA|QUINTA|\d{11}/);
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
    expect(eleicoesComDados(new Date("2026-10-19"))).toEqual([2010, 2014, 2018, 2022, 2026]);
  });
});

describe("eleições de 2014 e 2010 (formatos antigos)", () => {
  it("2010: cargo de suplente e eleito por média com os nomes atuais", () => {
    expect(normalizarCandidato({ DS_CARGO: "1º SUPLENTE SENADOR", DS_SIT_TOT_TURNO: "SUPLENTE" }).DS_CARGO).toBe(
      "1º SUPLENTE",
    );
    expect(normalizarCandidato({ DS_CARGO: "DEPUTADO FEDERAL", DS_SIT_TOT_TURNO: "MÉDIA" }).DS_SIT_TOT_TURNO).toBe(
      "ELEITO POR MÉDIA",
    );
    // Eleito por média pesa como eleito na escolha do registro.
    const r = casarCandidaturas(
      2010,
      [
        cand({ SQ_CANDIDATO: "a", DS_SIT_TOT_TURNO: "#NULO" }),
        cand({ SQ_CANDIDATO: "b", DS_SIT_TOT_TURNO: "SUPLENTE" }),
        cand({ SQ_CANDIDATO: "c", DS_SIT_TOT_TURNO: "MÉDIA" }),
      ],
      [{ id: 7, cpf: "38848319840" }],
      [],
    );
    expect(r.map((c) => [c.sqCandidato, c.situacao])).toEqual([["c", "ELEITO POR MÉDIA"]]);
  });

  it("receitas de 2010: cabeçalho por extenso, tipo em maiúsculas, valor sem centavos (linhas reais, AC)", () => {
    const csv = Buffer.from(
      [
        '"Data e hora";"Sequencial Candidato";"UF";"Sigla Partido";"Número candidato";"Cargo";"Nome candidato";"CPF do candidato";"Entrega em conjunto?";"Número Recibo Eleitoral";"Número do documento";"CPF/CNPJ do doador";"Nome do doador";"Data da receita";"Valor receita";"Tipo receita";"Fonte recurso";"Espécie recurso";"Descrição da receita"      ',
        '"13/11/201701:00:07";"10000000008";"AC";"PMDB";"15120";"Deputado Estadual";"FRANCISCO DAS CHAGAS ROMAO";"00969060220";"Nao";"15000209721";"01";"00969060220";"FRANCISCO DAS CHAGAS ROMAO";"19/07/2010";"30000";"Recursos próprios";"Nao especificado";"Transferência eletrônica";""',
        '"13/11/201701:00:07";"10000000008";"AC";"PMDB";"15120";"Deputado Estadual";"FRANCISCO DAS CHAGAS ROMAO";"00969060220";"Nao";"1";"2";"11111111000111";"DIRETORIO ESTADUAL";"10/09/2010";"657,72";"RECURSOS DE PARTIDO POLÍTICO";"Nao especificado";"Transferência eletrônica";""',
      ].join("\n"),
      "latin1",
    );
    const r = receitasPorCandidato(lerCsvTse(csv), new Set(["10000000008"])).get("10000000008")!;
    expect(r).toEqual([
      { origem: "Recursos próprios", doador: "", total: 30000, doacoes: 1, doadores: 1 },
      { origem: "Recursos de partido político", doador: "DIRETORIO ESTADUAL", total: 657.72, doacoes: 1, doadores: 1 },
    ]);
  });

  it("receitas de 2014: empresas e comitês aparecem pelo nome (Receita Federal)", () => {
    const linha = (tipo: string, nome: string, rfb: string, cpf: string, valor: string) =>
      ({
        "Sequencial Candidato": "10000000120",
        "Tipo receita": tipo,
        "Nome do doador": nome,
        "Nome do doador (Receita Federal)": rfb,
        "CPF/CNPJ do doador": cpf,
        "Valor receita": valor,
      }) as Record<string, string>;
    const r = receitasPorCandidato(
      [
        linha(
          "Recursos de outros candidatos/comitês",
          "Direção Estadual/Distrital",
          "COMITE FINANCEIRO AC",
          "2",
          "5010",
        ),
        linha("Recursos de pessoas jurídicas", "CONSTRUTORA X", "CONSTRUTORA X LTDA", "3", "1000"),
        linha("Recursos de pessoas físicas", "FULANO", "FULANO DE TAL", "4", "50"),
      ],
      new Set(["10000000120"]),
    ).get("10000000120")!;
    expect(r.map((x) => [x.origem, x.doador, x.total])).toEqual([
      ["Recursos de outros candidatos/comitês", "COMITE FINANCEIRO AC", 5010],
      ["Recursos de pessoas jurídicas", "CONSTRUTORA X LTDA", 1000],
      // Único doador pessoa física: está entre os 3 maiores, aparece pelo nome da Receita Federal.
      ["Recursos de pessoas físicas", "FULANO DE TAL", 50],
    ]);
  });

  it("arquivo de receitas de cada eleição", () => {
    expect(arquivoReceitas(2010).doEstado("candidato/SP/ReceitasCandidatos.txt", "SP")).toBe(true);
    expect(arquivoReceitas(2014).url).toMatch(/prestacao_final_2014\.zip$/);
    expect(arquivoReceitas(2014).doEstado("receitas_candidatos_2014_SP.txt", "SP")).toBe(true);
    expect(arquivoReceitas(2022).doEstado("receitas_candidatos_2022_SP.csv", "SP")).toBe(true);
    expect(arquivoReceitas(2022).doEstado("receitas_candidatos_2022_RJ.csv", "SP")).toBe(false);
  });
});
