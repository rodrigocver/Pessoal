import { describe, it, expect } from "vitest";
import { fimLegislatura, inicioLegislatura, legislaturaEm, legislaturasComDados } from "@/ingest/fontes";
import { mesAnterior, periodoDoMes, periodosDisponiveis, resolverPeriodo } from "@/lib/periodo";

const data = (s: string) => new Date(`${s}-03:00`);

describe("legislaturas", () => {
  it("bate com as datas oficiais da Câmara (GET /legislaturas)", () => {
    expect(inicioLegislatura(56)).toEqual(data("2019-02-01T00:00:00"));
    expect(inicioLegislatura(57)).toEqual(data("2023-02-01T00:00:00"));
    expect(fimLegislatura(57)).toEqual(data("2027-02-01T00:00:00"));
  });

  it("troca de legislatura exatamente na posse", () => {
    expect(legislaturaEm(data("2027-01-31T23:59:59"))).toBe(57);
    expect(legislaturaEm(data("2027-02-01T00:00:00"))).toBe(58);
    expect(legislaturaEm(data("2023-02-01T00:00:00"))).toBe(57);
    expect(legislaturaEm(data("2023-01-31T12:00:00"))).toBe(56);
    expect(legislaturaEm(data("2035-02-01T00:00:00"))).toBe(60);
  });

  it("lista as legislaturas com dados até a atual", () => {
    expect(legislaturasComDados(data("2026-10-19T12:00:00"))).toEqual([57]);
    expect(legislaturasComDados(data("2027-03-01T12:00:00"))).toEqual([57, 58]);
  });
});

describe("periodos", () => {
  it("antes da posse: anos e a legislatura atual", () => {
    const p = periodosDisponiveis(data("2026-10-19T12:00:00")).map((x) => x.valor);
    expect(p).toEqual(["2026", "2025", "2024", "2023", "leg57"]);
  });

  it("depois da posse: as duas legislaturas, a nova primeiro", () => {
    const p = periodosDisponiveis(data("2027-03-01T12:00:00"));
    expect(p.map((x) => x.valor)).toEqual(["2027", "2026", "2025", "2024", "2023", "leg58", "leg57"]);
    expect(p.find((x) => x.valor === "leg58")?.rotulo).toBe("Legislatura 2027–2031");
  });

  it("aceita o valor antigo 'legislatura' como a legislatura atual", () => {
    expect(resolverPeriodo("legislatura", data("2027-03-01T12:00:00")).valor).toBe("leg58");
    expect(resolverPeriodo("inexistente", data("2026-10-19T12:00:00")).valor).toBe("2026");
  });

  it("mês e mês anterior", () => {
    expect(periodoDoMes("2026-12").fim).toEqual(data("2027-01-01T00:00:00"));
    expect(mesAnterior(new Date("2026-01-15T12:00:00Z"))).toBe("2025-12");
  });
});
