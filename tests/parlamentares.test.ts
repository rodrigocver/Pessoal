import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { mapDeputado, mapSenador, comoLista } = await import("@/ingest/parlamentares");

describe("mapDeputado", () => {
  it("converte o formato da API da Câmara", () => {
    const p = mapDeputado(
      { id: 204379, nome: "Acácio Favacho", siglaPartido: "MDB", siglaUf: "AP", urlFoto: "x.jpg", email: "a@b" },
      true,
    );
    expect(p).toMatchObject({ casa: "CD", idExterno: "204379", partido: "MDB", uf: "AP", emExercicio: true });
    expect(p.fonteUrl).toContain("/deputados/204379");
  });
});

describe("mapSenador", () => {
  it("converte o formato do Senado e força https na foto", () => {
    const p = mapSenador(
      {
        IdentificacaoParlamentar: {
          CodigoParlamentar: "5672",
          NomeParlamentar: "Alan Rick",
          UrlFotoParlamentar: "http://www.senado.leg.br/foto.jpg",
          SiglaPartidoParlamentar: "REPUBLICANOS",
          UfParlamentar: "AC",
        },
      },
      false,
    );
    expect(p).toMatchObject({ casa: "SF", idExterno: "5672", partido: "REPUBLICANOS", emExercicio: false });
    expect(p.fotoUrl).toBe("https://www.senado.leg.br/foto.jpg");
  });
});

describe("comoLista", () => {
  it("normaliza item único, lista e vazio", () => {
    expect(comoLista(1)).toEqual([1]);
    expect(comoLista([1, 2])).toEqual([1, 2]);
    expect(comoLista(undefined)).toEqual([]);
  });
});
