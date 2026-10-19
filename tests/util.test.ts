import { describe, it, expect } from "vitest";
import { anosDesde, lerArgumentosIngestao, lotes } from "@/ingest/util";

describe("lerArgumentosIngestao", () => {
  it("mantém todas as tarefas quando não há --desde", () => {
    expect(lerArgumentosIngestao(["deputados", "senadores"], 2026)).toEqual({
      tarefas: ["deputados", "senadores"],
      anos: [2026],
    });
  });

  it("lê --desde em qualquer posição", () => {
    expect(lerArgumentosIngestao(["--desde", "2024", "camara:votacoes"], 2026)).toEqual({
      tarefas: ["camara:votacoes"],
      anos: [2024, 2025, 2026],
    });
    expect(lerArgumentosIngestao(["camara:votacoes", "--desde", "2025"], 2026).tarefas).toEqual(["camara:votacoes"]);
  });

  it("sem argumentos: todas as tarefas, ano corrente", () => {
    expect(lerArgumentosIngestao([], 2026)).toEqual({ tarefas: [], anos: [2026] });
  });

  it("recusa ano inválido e opção desconhecida", () => {
    expect(() => lerArgumentosIngestao(["--desde"], 2026)).toThrow(/--desde inválido/);
    expect(() => lerArgumentosIngestao(["--desde", "abc"], 2026)).toThrow(/--desde inválido/);
    expect(() => lerArgumentosIngestao(["--desde", "2030"], 2026)).toThrow(/--desde inválido/);
    expect(() => lerArgumentosIngestao(["--anos", "2"], 2026)).toThrow(/desconhecida/);
  });
});

describe("anosDesde e lotes", () => {
  it("gera anos e lotes", () => {
    expect(anosDesde(2023, 2025)).toEqual([2023, 2024, 2025]);
    expect([...lotes([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
  });
});
