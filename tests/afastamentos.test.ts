import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { afastamentosCamara, entradasSuplenteCamara, casarSuplentesCamara, afastamentosSenado, substituicoesSenado } =
  await import("@/ingest/afastamentos");
const { periodosExercicioSenado } = await import("@/ingest/exercicio");

// Respostas reais das APIs (reduzidas à legislatura 57), em tests/fixtures/.
const historico = (id: string) => JSON.parse(readFileSync(`tests/fixtures/camara-historico/${id}.json`, "utf8")).dados;
const mandatos = (id: string) => {
  const m = JSON.parse(readFileSync(`tests/fixtures/senado-mandatos/${id}.json`, "utf8")).MandatoParlamentar.Parlamentar
    .Mandatos.Mandato;
  return Array.isArray(m) ? m : [m];
};
const dia = (s: string) => s.slice(0, 10);

describe("afastamentosCamara", () => {
  it("ministro que volta por poucos dias para votar (André Fufuca)", () => {
    const a = afastamentosCamara(historico("178882"));
    expect(a.map((x) => [dia(x.inicio.toISOString()), x.fim && dia(x.fim.toISOString()), x.motivo])).toEqual([
      ["2023-09-13", "2024-12-03", "Ministro de Estado"],
      ["2024-12-06", "2025-02-01", "Ministro de Estado"],
      ["2025-02-03", "2025-10-08", "Ministro de Estado"],
      ["2025-10-09", "2025-11-13", "Ministro de Estado"],
      ["2025-11-15", "2026-03-31", "Ministro de Estado"],
    ]);
    expect(a.every((x) => !x.definitivo)).toBe(true);
  });

  it("licenças renovadas sem volta no meio são um só afastamento, com todos os motivos (Roseana Sarney)", () => {
    const a = afastamentosCamara(historico("73806"));
    // As oito renovações de licença de saúde de 2025–2026 ficam dentro de um único afastamento.
    expect(a.map((x) => [dia(x.inicio.toISOString()), x.fim && dia(x.fim.toISOString())])).toEqual([
      ["2024-05-06", "2024-09-04"],
      ["2025-01-31", "2025-02-11"],
      ["2025-02-12", "2026-07-19"],
      ["2026-08-31", null],
    ]);
    expect(a[2].motivo).toBe("Afastamento Conjunto Consecutivo; Licença para Tratamento de Saúde");
  });

  it("suplente não tem afastamento de titular (Vicentinho)", () => {
    expect(afastamentosCamara(historico("74283"))).toEqual([]);
  });
});

describe("casarSuplentesCamara", () => {
  const titulares = ["178882", "141488"];
  const suplentes = ["226708", "74283", "178987", "221148"];
  const afastamentos = titulares.flatMap((id) => {
    const ev = historico(id);
    const ultimo = ev.filter((e: { condicaoEleitoral: string }) => e.condicaoEleitoral)[0] ?? ev[0];
    return afastamentosCamara(ev).map((a) => ({
      ...a,
      titularRef: id,
      // estado e partido na saída
      uf: ultimo.siglaUf,
      partido: ultimo.siglaPartido,
    }));
  });
  const entradas = suplentes.flatMap((id) => {
    const ev = historico(id);
    return entradasSuplenteCamara(ev).map((e) => ({ ...e, suplenteRef: id, suplenteNome: ev[0].nome }));
  });
  const r = casarSuplentesCamara(afastamentos, entradas);
  const de = (titular: string, inicio: string) =>
    r.get(afastamentos.find((a) => a.titularRef === titular && dia(a.inicio.toISOString()) === inicio)!)!;

  it("Fufuca (PP-MA): Allan Garcês, único compatível e alinhado com a volta", () => {
    expect(de("178882", "2023-09-13").map((s) => [s.suplenteRef, s.certeza])).toEqual([["226708", "datas"]]);
    expect(de("178882", "2025-10-09").map((s) => [s.suplenteRef, s.certeza])).toEqual([["226708", "datas"]]);
  });

  it("Paulo Teixeira (PT-SP): o suplente que saiu quando ele voltou em 2025 é Vicentinho", () => {
    expect(de("141488", "2025-02-03").map((s) => s.suplenteNome)).toEqual(["Vicentinho"]);
  });

  it("continuidade: na saída de 2023 havia 3 suplentes da federação; fica o mesmo de 2025", () => {
    expect(de("141488", "2023-02-02").map((s) => [s.suplenteNome, s.certeza])).toEqual([["Vicentinho", "datas"]]);
  });

  it("nunca põe o mesmo suplente em duas vagas ao mesmo tempo", () => {
    const usos = [...r.values()].flat().filter((s) => s.certeza !== "possivel");
    const chaves = usos.map((s) => `${s.suplenteRef}@${s.inicio.toISOString()}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("Senado", () => {
  it("Camilo Santana: afastamentos e as duas suplentes que ocuparam a vaga", () => {
    const a = afastamentosSenado(mandatos("6336"));
    expect(a.map((x) => [dia(x.inicio.toISOString()), x.fim && dia(x.fim.toISOString())])).toEqual([
      ["2023-02-03", "2023-12-12"],
      ["2023-12-14", "2025-02-01"],
      ["2025-02-04", "2026-04-02"],
    ]);
    const exercicios = new Map(["6350", "6351"].map((id) => [id, periodosExercicioSenado(mandatos(id))] as const));
    const segundo = substituicoesSenado(a[1], exercicios);
    expect(segundo.map((s) => [s.suplenteNome, dia(s.inicio.toISOString()), s.certeza])).toEqual([
      ["Augusta Brito", "2023-12-14", "oficial"],
      ["Augusta Brito", "2024-07-31", "oficial"],
      ["Janaína Farias", "2024-04-02", "oficial"],
    ]);
  });

  it("suplente não tem afastamento de titular", () => {
    expect(afastamentosSenado(mandatos("6350"))).toEqual([]);
  });

  it("descarta afastamentos anteriores à legislatura, saídas definitivas antigas e intervalos vazios", () => {
    const ex = (DataInicio: string, DataFim?: string, DescricaoCausaAfastamento?: string) => ({
      DataInicio,
      DataFim,
      DescricaoCausaAfastamento,
      SiglaCausaAfastamento: "AFO",
    });
    const mandato = (Exercicio: object[]) => ({
      DescricaoParticipacao: "Titular",
      PrimeiraLegislaturaDoMandato: { NumeroLegislatura: "56" },
      SegundaLegislaturaDoMandato: { NumeroLegislatura: "57" },
      Exercicios: { Exercicio },
    });
    // Como Carlos Fávaro: afastamento em 2022, outro atravessando a posse e uma volta de um dia só.
    const r = afastamentosSenado([
      mandato([
        ex("2019-02-01", "2022-06-07"),
        ex("2022-10-06", "2023-01-01"),
        ex("2023-02-01", "2023-02-02"),
        ex("2026-03-27", "2026-03-30"),
        ex("2026-03-31"),
      ]),
    ]);
    expect(r.map((a) => [dia(a.inicio.toISOString()), a.fim && dia(a.fim.toISOString())])).toEqual([
      ["2023-02-03", "2026-03-27"],
    ]);
    // Cassação em 2020: não entra.
    expect(afastamentosSenado([mandato([ex("2019-02-01", "2020-04-15", "Cassação de registro/diploma")])])).toEqual([]);
  });
});
