import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const exercicio = await import("@/ingest/exercicio");
// Estes testes tratam de início e fim; a condição (titular ou suplente) tem testes próprios abaixo.
const semCondicao = <T extends { inicio: Date; fim: Date | null }>(ps: T[]) =>
  ps.map(({ inicio, fim }) => ({ inicio, fim }));
const periodosExercicioCamara = (...a: Parameters<typeof exercicio.periodosExercicioCamara>) =>
  semCondicao(exercicio.periodosExercicioCamara(...a));
const periodosExercicioSenado = (...a: Parameters<typeof exercicio.periodosExercicioSenado>) =>
  semCondicao(exercicio.periodosExercicioSenado(...a));

const ev = (dataHora: string, situacao: string | null, descricaoStatus: string | null, idLegislatura = 57) => ({
  idLegislatura,
  dataHora,
  situacao,
  descricaoStatus,
});
const d = (s: string) => new Date(`${s}-03:00`);

describe("periodosExercicioCamara", () => {
  it("titular com licença e renúncia (deputado 92346)", () => {
    expect(
      periodosExercicioCamara([
        ev("2023-02-01T00:00", null, "Nome no início da legislatura / Partido no início da legislatura"),
        ev("2023-02-01T12:05", "Exercício", "Entrada - Posse de Eleito Titular - Posse na Sessão Preparatória"),
        ev(
          "2025-03-20T18:30",
          "Licença",
          "Saída - Afastamento com prazo determinado - Afastamento Conjunto Consecutivo",
        ),
        ev("2025-07-20T00:00", "Exercício", "Entrada - Reassunção"),
        ev("2025-12-18T17:56", "VACANCIA", "Saída - Afastamento definitivo - Perda de Mandato por Ato da Mesa"),
      ]),
    ).toEqual([
      { inicio: d("2023-02-01T12:05"), fim: d("2025-03-20T18:30") },
      { inicio: d("2025-07-20T00:00"), fim: d("2025-12-18T17:56") },
    ]);
  });

  it("reassunção registrada com situação CONVOCADO conta como entrada (deputado 230762)", () => {
    expect(
      periodosExercicioCamara([
        ev("2025-01-01T13:32", "Exercício", "Entrada - Posse de Suplente - Posse como Suplente"),
        ev(
          "2025-02-01T08:43",
          "SUPLENCIA",
          "Saída - Afastamento sem prazo determinado - Afastamento de Suplente (automático)",
        ),
        ev(
          "2025-02-03T13:17",
          "CONVOCADO",
          "DIVERSO - Convocação Eleito ou Suplente - Aguardando Convocação de Suplente",
        ),
        ev("2025-02-03T13:18", "CONVOCADO", "Entrada - Reassunção / DIVERSO - Convocação Eleito ou Suplente"),
        ev(
          "2025-10-08T17:58",
          "SUPLENCIA",
          "Saída - Afastamento sem prazo determinado - Afastamento de Suplente (automático)",
        ),
      ]),
    ).toEqual([
      { inicio: d("2025-01-01T13:32"), fim: d("2025-02-01T08:43") },
      { inicio: d("2025-02-03T13:18"), fim: d("2025-10-08T17:58") },
    ]);
  });

  it("titular sem saída fica em aberto; legislaturas anteriores são ignoradas", () => {
    expect(
      periodosExercicioCamara([
        ev("2019-02-01T11:45", "Exercício", "Entrada - Posse de Eleito Titular", 56),
        ev("2023-01-31T23:59", "FIM_MANDATO", "Saída - Afastamento definitivo - Término da Legislatura", 56),
        ev("2023-02-01T12:05", "Exercício", "Entrada - Posse de Eleito Titular - Posse na Sessão Preparatória"),
        ev("2024-02-07T00:00", "Exercício", "Alteração de partido"),
      ]),
    ).toEqual([{ inicio: d("2023-02-01T12:05"), fim: null }]);
  });

  it("suplente convocado que recusou não tem exercício (deputado 227370)", () => {
    expect(
      periodosExercicioCamara([
        ev(
          "2025-10-30T15:55",
          "CONVOCADO",
          "DIVERSO - Convocação Eleito ou Suplente - Aguardando Convocação de Suplente",
        ),
        ev(
          "2025-10-30T16:39",
          "SUPLENCIA",
          "DIVERSO - Negativas de Recusa de Convocação - Impossibilidade de Assumir o Mandato",
        ),
      ]),
    ).toEqual([]);
  });
});

describe("periodosExercicioSenado", () => {
  it("suplente com vários exercícios (senador 6350), fim inclusivo", () => {
    const r = periodosExercicioSenado([
      {
        Exercicios: {
          Exercicio: [
            { DataInicio: "2025-02-04", DataFim: "2026-04-02" },
            { DataInicio: "2023-02-02", DataFim: "2023-12-12" },
          ],
        },
      },
    ]);
    expect(r).toEqual([
      { inicio: d("2023-02-02T00:00:00"), fim: d("2023-12-13T00:00:00") },
      { inicio: d("2025-02-04T00:00:00"), fim: d("2026-04-03T00:00:00") },
    ]);
  });

  it("titular em exercício (exercício único, sem fim) e exercícios antigos descartados", () => {
    expect(
      periodosExercicioSenado([
        { Exercicios: { Exercicio: { DataInicio: "2023-02-01" } } },
        { Exercicios: { Exercicio: { DataInicio: "2015-02-01", DataFim: "2019-01-31" } } },
      ]),
    ).toEqual([{ inicio: d("2023-02-01T00:00:00"), fim: null }]);
  });
});

import { readFileSync } from "node:fs";

describe("condição no exercício (titular ou suplente)", () => {
  const camara = (id: string) =>
    exercicio.periodosExercicioCamara(
      JSON.parse(readFileSync(`tests/fixtures/camara-historico/${id}.json`, "utf8")).dados,
    );
  const senado = (id: string) => {
    const m = JSON.parse(readFileSync(`tests/fixtures/senado-mandatos/${id}.json`, "utf8")).MandatoParlamentar
      .Parlamentar.Mandatos.Mandato;
    return exercicio.periodosExercicioSenado(Array.isArray(m) ? m : [m]);
  };

  it("Câmara: Vicentinho só exerce como suplente; Fufuca só como titular", () => {
    expect(camara("74283").every((p) => p.comoSuplente)).toBe(true);
    expect(camara("178882").some((p) => p.comoSuplente)).toBe(false);
  });

  it("Câmara: reassunção de suplente também conta como suplente (Allan Garcês)", () => {
    const p = camara("226708");
    expect(p.length).toBeGreaterThan(3);
    expect(p.every((x) => x.comoSuplente)).toBe(true);
  });

  it("Senado: 1ª suplente (Augusta Brito) e titular (Camilo Santana)", () => {
    expect(senado("6350").every((p) => p.comoSuplente)).toBe(true);
    expect(senado("6336").some((p) => p.comoSuplente)).toBe(false);
  });
});

describe("vagasDoSuplenteSenado", () => {
  const mandatos = (id: string) => {
    const m = JSON.parse(readFileSync(`tests/fixtures/senado-mandatos/${id}.json`, "utf8")).MandatoParlamentar
      .Parlamentar.Mandatos.Mandato;
    return Array.isArray(m) ? m : [m];
  };

  it("suplente efetivado antes de 2023: Carlos Portinho na vaga de Arolde de Oliveira", () => {
    expect(exercicio.vagasDoSuplenteSenado(mandatos("5936")).map((v) => [v.titularNome, v.fim])).toEqual([
      ["Arolde de Oliveira", null],
    ]);
  });

  it("titular não tem vaga de suplente", () => {
    expect(exercicio.vagasDoSuplenteSenado(mandatos("6336"))).toEqual([]);
  });
});
