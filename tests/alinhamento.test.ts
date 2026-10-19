import { describe, it, expect } from "vitest";
import { prioridadeOrientacao } from "@/ingest/alinhamento";

describe("prioridadeOrientacao", () => {
  it.each([
    ["PL", "PL", 1],
    ["UNIÃO", "UNIÃO", 1],
    ["União", "UNIÃO", 1],
    ["Republica", "REPUBLICANOS", 1],
    ["Republican", "REPUBLICANOS", 1],
    ["Solidaried", "SOLIDARIEDADE", 1],
    ["Progressistas", "PP", 1],
    ["Podemos", "PODE", 1],
    ["Fdr PT-PCdoB-PV", "PT", 2],
    ["Fdr PT-PCdoB-PV", "PCdoB", 2],
    ["Fdr PSOL-REDE", "REDE", 2],
  ] as const)("%s orienta %s (prioridade %s)", (bancada, partido, esperado) => {
    expect(prioridadeOrientacao(bancada, partido)).toBe(esperado);
  });

  it.each([
    ["PSD", "PSDB"],
    ["PSDB", "PSD"],
    ["PL", "PLP"],
    ["Fdr PT-PCdoB-PV", "PSB"],
    ["Bl MdbPsdRepPode", "MDB"],
    ["Governo", "PT"],
    ["Oposição", "PL"],
  ])("%s não orienta %s", (bancada, partido) => {
    expect(prioridadeOrientacao(bancada, partido)).toBeNull();
  });
});
