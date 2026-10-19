import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { temasCamara, temasSenado } = await import("@/ingest/temas");

describe("temas", () => {
  it("Câmara: nomes dos temas (resposta real do PLP 128/2025)", () => {
    expect(
      temasCamara({
        dados: [{ tema: "Economia" }, { tema: "Finanças Públicas e Orçamento" }],
      }),
    ).toEqual(["Economia", "Finanças Públicas e Orçamento"]);
  });

  it("Senado: nível mais alto da classificação, sem repetir", () => {
    expect(
      temasSenado({
        classificacoes: [
          { descricaoHierarquia: "Orçamento Público / Diretrizes Orçamentárias" },
          { descricaoHierarquia: "Orçamento Público / Orçamento Anual / Execução Financeira e Orçamentária" },
          { descricaoHierarquia: null },
        ],
      }),
    ).toEqual(["Orçamento Público"]);
    expect(temasSenado({ classificacoes: null })).toEqual([]);
  });
});
