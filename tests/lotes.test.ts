import { describe, expect, it } from "vitest";
import { emLotes, lerParte, memorizar } from "@/lib/lotes";

describe("lotes", () => {
  it("divide em lotes", () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(emLotes([], 100)).toEqual([]);
  });

  it("lê a parte do envio", () => {
    expect(lerParte(undefined)).toEqual({ indice: 0, total: 1 });
    expect(lerParte("2/4")).toEqual({ indice: 1, total: 4 });
    expect(() => lerParte("5/4")).toThrow();
    expect(() => lerParte("0/4")).toThrow();
    expect(() => lerParte("x")).toThrow();
  });

  it("memoriza por chave", async () => {
    let chamadas = 0;
    const f = memorizar(
      async (p: { id: number }) => {
        chamadas++;
        return p.id * 2;
      },
      (p) => p.id,
    );
    expect(await Promise.all([f({ id: 1 }), f({ id: 1 }), f({ id: 2 })])).toEqual([2, 2, 4]);
    expect(chamadas).toBe(2);
  });
});
