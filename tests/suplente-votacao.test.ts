import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: { parlamentar: {} } }));
const { suplenteNaVotacao } = await import("@/lib/consultas");

const vaga = (nome: string, certeza: "oficial" | "datas" | "possivel") => ({
  nome,
  casa: "CD" as const,
  idExterno: nome,
  certeza,
});

describe("suplenteNaVotacao", () => {
  it("titular: nada a marcar", () => {
    expect(suplenteNaVotacao(false, null)).toBeNull();
  });
  it("vaga identificada prevalece sobre candidatos possíveis", () => {
    expect(suplenteNaVotacao(true, [vaga("A", "possivel"), vaga("B", "datas")])).toEqual({
      titulares: [{ nome: "B", casa: "CD", idExterno: "B" }],
      certo: true,
    });
  });
  it("só candidatos possíveis", () => {
    expect(suplenteNaVotacao(true, [vaga("A", "possivel"), vaga("C", "possivel")])?.certo).toBe(false);
  });
  it("suplente sem vaga identificada", () => {
    expect(suplenteNaVotacao(true, null)).toEqual({ titulares: [], certo: false });
  });
});
