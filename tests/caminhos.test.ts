import { describe, expect, it } from "vitest";
import { caminhoComparar, caminhoPerfil, lerComparar, lerFiltrosPerfil } from "@/lib/caminhos";

const tabata = { casa: "CD" as const, idExterno: "204534" };

describe("caminhoPerfil", () => {
  it("sem filtros e com filtros parciais", () => {
    expect(caminhoPerfil(tabata)).toBe("/parlamentar/camara/204534");
    expect(caminhoPerfil(tabata, { aba: "votacoes" })).toBe("/parlamentar/camara/204534/votacoes");
    expect(caminhoPerfil(tabata, { aba: "votacoes", periodo: "leg57" })).toBe(
      "/parlamentar/camara/204534/votacoes/leg57",
    );
  });

  it("preenche segmentos do meio e codifica o tema", () => {
    expect(caminhoPerfil(tabata, { aba: "votacoes", tema: "Saúde e Previdência" }, "2026")).toBe(
      "/parlamentar/camara/204534/votacoes/2026/1/Sa%C3%BAde%20e%20Previd%C3%AAncia",
    );
    expect(caminhoPerfil({ casa: "SF", idExterno: "6295" }, { pagina: "2" }, "2026")).toBe(
      "/parlamentar/senado/6295/presenca/2026/2",
    );
  });

  it("ida e volta", () => {
    const f = { aba: "votacoes", periodo: "2025", pagina: "3", tema: "Saúde" };
    const segs = caminhoPerfil(tabata, f).split("/").slice(4);
    expect(lerFiltrosPerfil(segs)).toEqual(f);
    expect(lerFiltrosPerfil(undefined)).toEqual({});
    expect(lerFiltrosPerfil(["a", "b", "c", "d", "e"])).toBeNull();
  });
});

describe("caminhoComparar", () => {
  it("ida e volta", () => {
    expect(caminhoComparar()).toBe("/comparar");
    expect(caminhoComparar("camara/204534")).toBe("/comparar/camara/204534");
    expect(caminhoComparar("camara/204534", "senado/6295", "2025")).toBe("/comparar/camara/204534/senado/6295/2025");
    // Período sem os dois parlamentares não entra.
    expect(caminhoComparar("camara/204534", undefined, "2025")).toBe("/comparar/camara/204534");
    expect(lerComparar(["camara", "204534", "senado", "6295", "2025"])).toEqual({
      a: "camara/204534",
      b: "senado/6295",
      periodo: "2025",
    });
    expect(lerComparar([])).toEqual({ a: undefined, b: undefined, periodo: undefined });
    expect(lerComparar(["camara"])).toBeNull();
  });
});
