import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
const { ehSessaoDeliberativa, ehNominalDePlenario, proposicaoPrincipal, rotuloProposicao, mapDespesas } =
  await import("@/ingest/camara");

const evento = (descricaoTipo: string, situacao = "Encerrada") => ({
  id: 1,
  dataHoraInicio: "2025-02-18T10:06:50",
  descricao: "",
  descricaoTipo,
  situacao,
});

describe("ehSessaoDeliberativa", () => {
  it("aceita só sessões deliberativas não canceladas", () => {
    expect(ehSessaoDeliberativa(evento("Sessão Deliberativa"))).toBe(true);
    expect(ehSessaoDeliberativa(evento("Sessão Deliberativa", "Cancelada"))).toBe(false);
    expect(ehSessaoDeliberativa(evento("Reunião Deliberativa"))).toBe(false);
    expect(ehSessaoDeliberativa(evento("Sessão Não Deliberativa Solene"))).toBe(false);
  });
});

const votacao = (over: object = {}) => ({
  id: "1-1",
  dataHoraRegistro: "2025-02-11T17:43:14",
  siglaOrgao: "PLEN",
  aprovacao: 1,
  votosSim: 297,
  votosNao: 107,
  votosOutros: 2,
  descricao: "",
  ...over,
});

describe("ehNominalDePlenario", () => {
  it("exige plenário e votos individuais", () => {
    expect(ehNominalDePlenario(votacao())).toBe(true);
    expect(ehNominalDePlenario(votacao({ votosSim: 0, votosNao: 0, votosOutros: 0 }))).toBe(false); // simbólica
    expect(ehNominalDePlenario(votacao({ siglaOrgao: "CCJC" }))).toBe(false);
  });
});

describe("proposicaoPrincipal", () => {
  const a = { id: 1, siglaTipo: "REQ", numero: 1, ano: 2020, ementa: "a" };
  const b = { id: 2483606, siglaTipo: "PL", numero: 9133, ano: 2017, ementa: "b" };
  it("prefere a proposição cujo id prefixa o id da votação", () => {
    expect(proposicaoPrincipal({ id: "2483606-52" }, [a, b])).toBe(b);
  });
  it("cai para a primeira quando não há correspondência", () => {
    expect(proposicaoPrincipal({ id: "9-1" }, [a, b])).toBe(a);
    expect(proposicaoPrincipal({ id: "9-1" }, [])).toBeUndefined();
  });
});

describe("rotuloProposicao", () => {
  it("omite o ano quando a fonte não informa", () => {
    expect(rotuloProposicao({ siglaTipo: "PL", numero: 5809, ano: 2025 })).toBe("PL 5809/2025");
    expect(rotuloProposicao({ siglaTipo: "PEP", numero: 1, ano: null })).toBe("PEP 1");
  });
});

describe("mapDespesas", () => {
  const linha = {
    ideCadastro: "204379",
    ideDocumento: "7877589",
    numParcela: "0",
    txtNumero: "1984",
    datEmissao: "2025-02-07T00:00:00",
    vlrLiquido: "1467.5",
    txtCNPJCPF: "085.324.290/0013-1",
    numMes: "2",
    numAno: "2025",
    txtDescricao: "COMBUSTÍVEIS E LUBRIFICANTES.",
    txtFornecedor: "Posto",
    urlDocumento: "",
  };
  const deputados = new Map([["204379", 10]]);

  it("ignora quem não é deputado conhecido (ex.: lideranças)", () => {
    expect(mapDespesas([{ ...linha, ideCadastro: "" }], deputados)).toEqual([]);
  });
  it("mantém linhas idênticas como despesas distintas com chaves únicas", () => {
    const r = mapDespesas([linha, linha], deputados);
    expect(r).toHaveLength(2);
    expect(r[0].chave).not.toBe(r[1].chave);
    expect(r[0]).toMatchObject({
      parlamentarId: 10,
      ano: 2025,
      mes: 2,
      valor: "1467.50",
      categoria: "COMBUSTÍVEIS E LUBRIFICANTES",
    });
  });
});
