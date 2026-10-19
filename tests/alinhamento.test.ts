import { describe, it, expect } from "vitest";
import { federacoesDasBancadas, partidosDoBloco, prioridadeOrientacao } from "@/ingest/alinhamento";

// Nomes reais de bancadas nas orientações da Câmara (2023–2026).
const federacoes = federacoesDasBancadas(["Fdr PT-PCdoB-PV", "Fdr PSOL-REDE", "Fdr PSDB-CIDADANIA", "PL", "Governo"]);

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
    ["Bl MdbPsdRepPode", "MDB", 3],
    ["Bl MdbPsdRepPode", "REPUBLICANOS", 3],
    ["Bl MdbPsdRepPodePsc", "PSC", 3],
    ["Bl UniPpFdrPsdbCid...", "UNIÃO", 3],
    ["Bl UniPpFdrPsdbCid...", "CIDADANIA", 3],
    ["Bl AvanSolidPrd...", "SOLIDARIEDADE", 3],
    ["Bl PlFdrPTUniPp...", "PV", 3], // federação do PT inteira
    ["Bl PlFdrPtUniPp...", "PCdoB", 3],
  ] as const)("%s orienta %s (prioridade %s)", (bancada, partido, esperado) => {
    expect(prioridadeOrientacao(bancada, partido, federacoes)).toBe(esperado);
  });

  it.each([
    ["PSD", "PSDB"],
    ["PSDB", "PSD"],
    ["PL", "PLP"],
    ["Fdr PT-PCdoB-PV", "PSB"],
    ["Bl MdbPsdRepPode", "PSDB"], // "Psd" não é PSDB
    ["Bl UniPpPsd...", "MDB"], // escondido pelo corte: não atribuímos
    ["Bloco Parlamentar", "MDB"],
    ["Governo", "PT"],
    ["Oposição", "PL"],
  ])("%s não orienta %s", (bancada, partido) => {
    expect(prioridadeOrientacao(bancada, partido, federacoes)).toBeNull();
  });
});

describe("partidosDoBloco", () => {
  it("lê siglas em maiúsculas coladas e a federação", () => {
    expect([...partidosDoBloco("Bl PlFdrPTUniPp...", federacoes)].sort()).toEqual(
      ["pcdob", "pl", "pp", "pt", "pv", "uniao"].sort(),
    );
  });
});
