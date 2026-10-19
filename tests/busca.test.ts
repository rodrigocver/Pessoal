import { describe, expect, it } from "vitest";
import { filtrarParlamentares, opcoesDoIndice, type ItemIndice } from "@/lib/busca";

const item = (over: Partial<ItemIndice>): ItemIndice => ({
  id: 1,
  casa: "CD",
  idExterno: "1",
  nome: "",
  nomeCompleto: null,
  partido: "PT",
  uf: "SP",
  fotoUrl: null,
  emExercicio: true,
  afastado: null,
  ...over,
});

const indice = [
  item({ id: 1, nome: "Beto Lima", nomeCompleto: "José Roberto Lima", partido: "PL", uf: "RJ" }),
  item({ id: 2, nome: "Lia Dias", partido: "PSB", uf: "BA" }),
  item({ id: 3, nome: "Tabata Amaral", partido: "PSB" }),
  item({
    id: 4,
    nome: "Davi Rocha",
    emExercicio: false,
    afastado: { desde: "2025-01-01", motivo: "Ministro", definitivo: false },
  }),
  item({ id: 5, nome: "Ex Deputado", emExercicio: false }),
  item({ id: 6, nome: "Carla Dias", casa: "SF", partido: "MDB", uf: "MG" }),
];
const nomes = (f: Parameters<typeof filtrarParlamentares>[1]) => filtrarParlamentares(indice, f).map((p) => p.nome);

describe("filtrarParlamentares", () => {
  it("sem acento nem maiúsculas, também no nome completo", () => {
    expect(nomes({ q: "JOSÉ roberto" })).toEqual(["Beto Lima"]);
    expect(nomes({ q: "tábata" })).toEqual(["Tabata Amaral"]);
  });

  it("relevância: começa com o termo, depois palavra que começa, depois o resto", () => {
    expect(nomes({ q: "li" })).toEqual(["Lia Dias", "Beto Lima"]);
    expect(nomes({ q: "dias" })).toEqual(["Carla Dias", "Lia Dias"]);
  });

  it("por padrão: em exercício e titulares afastados; 'todos' inclui quem saiu", () => {
    expect(nomes({})).toEqual(["Beto Lima", "Carla Dias", "Davi Rocha", "Lia Dias", "Tabata Amaral"]);
    expect(nomes({ q: "ex" })).toEqual([]);
    expect(nomes({ q: "ex", todos: true })).toEqual(["Ex Deputado"]);
  });

  it("filtros de casa, estado e partido", () => {
    expect(nomes({ casa: "SF" })).toEqual(["Carla Dias"]);
    expect(nomes({ uf: "ba" })).toEqual(["Lia Dias"]);
    expect(nomes({ partido: "psb" })).toEqual(["Lia Dias", "Tabata Amaral"]);
  });

  it("limite de resultados", () => {
    expect(filtrarParlamentares(indice, {}, 2)).toHaveLength(2);
  });

  it("opções de filtro vêm de quem está em exercício", () => {
    expect(opcoesDoIndice(indice)).toEqual({ ufs: ["BA", "MG", "RJ", "SP"], partidos: ["MDB", "PL", "PSB"] });
  });
});
