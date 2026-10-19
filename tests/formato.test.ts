import { describe, expect, it } from "vitest";
import { formatarData, formatarReais } from "@/lib/formato";

describe("formatarData", () => {
  it("data pura não muda de dia pelo fuso", () => {
    expect(formatarData("2020-11-15")).toBe("15/11/2020");
  });

  it("instante é mostrado no horário de Brasília", () => {
    expect(formatarData(new Date("2025-01-01T02:00:00Z"))).toBe("31/12/2024");
  });
});

describe("formatarReais", () => {
  it("compacto só a partir de mil", () => {
    expect(formatarReais(7.7, true).replace(/\s/g, " ")).toBe("R$ 7,70");
    expect(formatarReais(1500, true).replace(/\s/g, " ")).toBe("R$ 1,5 mil");
  });
});
