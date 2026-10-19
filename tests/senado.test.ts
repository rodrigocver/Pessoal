import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { meses, CODIGOS_PRESENTE, rotuloVotoSenado, normalizarOrientacao, parseIdentificacao, categoriaSenado } =
  await import("@/ingest/senado");

describe("meses", () => {
  it("gera janelas mensais até o mês corrente", () => {
    const r = meses(2025, new Date("2025-03-15"));
    expect(r).toEqual([
      ["2025-01-01", "2025-01-31"],
      ["2025-02-01", "2025-02-28"],
      ["2025-03-01", "2025-03-31"],
    ]);
  });
});

describe("comparecimento", () => {
  it("conta como presente quem votou, presidiu ou registrou presença sem voto", () => {
    for (const c of ["Sim", "Não", "Abstenção", "Votou", "P-NRV", "Presidente (art. 51 RISF)"])
      expect(CODIGOS_PRESENTE.has(c)).toBe(true);
    for (const c of ["NCom", "LS", "MIS", "AP", "LP"]) expect(CODIGOS_PRESENTE.has(c)).toBe(false);
  });
  it("traduz os códigos para rótulos legíveis", () => {
    expect(rotuloVotoSenado("MIS")).toBe("Ausente: missão oficial");
    expect(rotuloVotoSenado("Sim")).toBe("Sim");
  });
});

describe("normalizarOrientacao", () => {
  it("padroniza maiúsculas", () => {
    expect(normalizarOrientacao("SIM")).toBe("Sim");
    expect(normalizarOrientacao("NÃO")).toBe("Não");
    expect(normalizarOrientacao("LIVRE")).toBe("Liberado");
    expect(normalizarOrientacao("Obstrução")).toBe("Obstrução");
  });
});

describe("parseIdentificacao", () => {
  it("separa sigla, número e ano", () => {
    expect(parseIdentificacao("PEC 221/2019")).toEqual({ siglaTipo: "PEC", numero: 221, ano: 2019 });
    expect(parseIdentificacao("algo estranho")).toBeNull();
  });
});

describe("categoriaSenado", () => {
  it("encurta categorias conhecidas", () => {
    expect(categoriaSenado("Aluguel de imóveis para escritório político, compreendendo...")).toBe(
      "Aluguel de escritório político",
    );
    expect(categoriaSenado(null)).toBe("Não informada");
  });
});
