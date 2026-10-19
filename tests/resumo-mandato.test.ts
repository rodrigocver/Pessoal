import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { eventosDoMandato, linhaComissoes } = await import("@/lib/resumoMensal");

const d = (s: string) => new Date(`${s}T12:00:00-03:00`);
const suplente = (nome: string, certeza: "oficial" | "datas" | "possivel" = "datas") => ({
  nome,
  inicio: d("2025-01-01"),
  fim: null,
  certeza,
  parlamentar: null,
});
const mes = [new Date("2025-10-01T00:00:00-03:00"), new Date("2025-11-01T00:00:00-03:00")] as const;

describe("eventosDoMandato", () => {
  it("volta curta para votar e nova saída no mesmo mês (como André Fufuca em out/2025)", () => {
    const afastamentos = [
      {
        inicio: d("2025-10-09"),
        fim: d("2025-11-13"),
        motivo: "Ministro de Estado",
        definitivo: false,
        suplentes: [suplente("Dr. Allan Garcês")],
      },
      {
        inicio: d("2025-02-03"),
        fim: d("2025-10-08"),
        motivo: "Ministro de Estado",
        definitivo: false,
        suplentes: [suplente("Dr. Allan Garcês")],
      },
    ];
    expect(eventosDoMandato(afastamentos, ...mes)).toEqual([
      "Voltou ao mandato em 08/10.",
      "Afastou-se do mandato em 09/10 (Ministro de Estado); suplente na vaga: Dr. Allan Garcês.",
    ]);
  });

  it("afastado o mês inteiro, com candidatos possíveis", () => {
    const afastamentos = [
      {
        inicio: d("2025-02-03"),
        fim: null,
        motivo: "Secretário de Estado",
        definitivo: false,
        suplentes: [suplente("A", "possivel"), suplente("B", "possivel")],
      },
    ];
    expect(eventosDoMandato(afastamentos, ...mes)).toEqual([
      "Esteve afastado o mês inteiro (Secretário de Estado); suplente na vaga: um entre A, B.",
    ]);
  });

  it("um único candidato possível: 'provavelmente'", () => {
    const afastamentos = [
      {
        inicio: d("2025-10-29"),
        fim: null,
        motivo: "Ministro de Estado",
        definitivo: false,
        suplentes: [suplente("Ricardo Galvão", "possivel")],
      },
    ];
    expect(eventosDoMandato(afastamentos, ...mes)).toEqual([
      "Afastou-se do mandato em 29/10 (Ministro de Estado); suplente na vaga: provavelmente Ricardo Galvão.",
    ]);
  });

  it("nada no mês: sem frases", () => {
    const afastamentos = [
      { inicio: d("2024-01-10"), fim: d("2024-03-01"), motivo: "Licença", definitivo: false, suplentes: [] },
    ];
    expect(eventosDoMandato(afastamentos, ...mes)).toEqual([]);
  });
});

describe("linhaComissoes", () => {
  const inicio = new Date("2025-10-01T00:00:00-03:00");

  it("Câmara: soma as reuniões das comissões em que é titular", () => {
    expect(
      linhaComissoes(
        "CD",
        [
          { reunioes: 3, presencas: 2 },
          { reunioes: 1, presencas: 1 },
        ],
        [],
        inicio,
      ),
    ).toBe("Comissões: esteve em 3 de 4 reuniões deliberativas das comissões em que é titular.");
  });

  it("sem reunião no mês, não escreve nada (nada de 0 de 0)", () => {
    expect(linhaComissoes("CD", [{ reunioes: 0, presencas: 0 }], [], inicio)).toBeNull();
    expect(linhaComissoes("CD", [], [], inicio)).toBeNull();
  });

  it("Senado: relatorias recebidas no mês (as anteriores, ainda ativas, não contam)", () => {
    const r = (s: string) => ({ designacao: new Date(s) });
    expect(linhaComissoes("SF", [], [r("2025-10-10T12:00:00Z"), r("2025-03-01T12:00:00Z")], inicio)).toBe(
      "Comissões: recebeu a relatoria de 1 matéria.",
    );
    expect(linhaComissoes("SF", [], [r("2025-03-01T12:00:00Z")], inicio)).toBeNull();
  });
});
