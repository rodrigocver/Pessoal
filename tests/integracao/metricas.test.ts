import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema, sql } from "@/db/client";
import {
  candidaturasDe,
  comissoesDe,
  statusIngestao,
  afastadosAgora,
  afastamentosDe,
  vagasOcupadas,
  indiceBusca,
  detalhesVotacao,
  gastos,
  obterVotacao,
  parlamentarPorChave,
  presenca,
  resumos,
  temasDasVotacoes,
  votos,
  votosEmComum,
} from "@/lib/consultas";
import { calcularEstatisticas } from "@/ingest/estatisticas";
import { csvDoPerfil } from "@/lib/exportar";
import sitemap from "@/app/sitemap";
import { resolverPeriodo } from "@/lib/periodo";
import { filtrarParlamentares, type FiltrosBusca } from "@/lib/busca";
import { criarCenario, prepararBanco } from "./dados";

const ano2025 = resolverPeriodo("2025");
// A busca roda no navegador sobre o índice; aqui o índice vem do banco de teste.
const buscarParlamentares = async (f: FiltrosBusca) => filtrarParlamentares(await indiceBusca(), f);
let c: Awaited<ReturnType<typeof criarCenario>>;

beforeAll(async () => {
  await prepararBanco();
  c = await criarCenario();
  await calcularEstatisticas();
  return () => sql.end();
});

const estatistica = async (parlamentarId: number, periodo = "2025") =>
  (
    await db
      .select()
      .from(schema.estatistica)
      .where(and(eq(schema.estatistica.parlamentarId, parlamentarId), eq(schema.estatistica.periodo, periodo)))
  )[0];

describe("presença", () => {
  it("titular: conta só sessões realizadas e com presença publicada", async () => {
    const p = await presenca(c.ana, ano2025);
    // s1, s2, s3 contam; a sessão do Congresso (sem presença publicada) e a futura, não.
    expect({ total: p.total, presentes: p.presentes }).toEqual({ total: 3, presentes: 2 });
    expect(p.ausencias.map((a) => a.inicio.toISOString().slice(0, 10))).toEqual(["2025-04-08"]);
  });

  it("suplente: só as sessões do período em exercício", async () => {
    const p = await presenca(c.beto, ano2025);
    expect({ total: p.total, presentes: p.presentes }).toEqual({ total: 2, presentes: 1 });
  });

  it("sem histórico de exercício: usa a atividade registrada", async () => {
    const p = await presenca(c.carla, ano2025);
    expect({ total: p.total, presentes: p.presentes }).toEqual({ total: 2, presentes: 2 });
  });

  it("perfil e médias usam a mesma definição", async () => {
    for (const p of [c.ana, c.beto, c.carla]) {
      const pagina = await presenca(p, ano2025);
      const e = await estatistica(p.id);
      expect({ sessoes: e.sessoes, presencas: e.presencas }, p.nome).toEqual({
        sessoes: pagina.total,
        presencas: pagina.presentes,
      });
    }
  });
});

describe("alinhamento", () => {
  it("partido (com federação) e governo (ignorando 'Liberado')", async () => {
    const ana = await estatistica(c.ana.id);
    // v1: Sim = PT Sim (igual). v2: Não ≠ federação Sim. Governo: só v1 conta, igual.
    expect([ana.alinhPartidoIguais, ana.alinhPartidoTotal, ana.alinhGovernoIguais, ana.alinhGovernoTotal]).toEqual([
      1, 2, 1, 1,
    ]);
    const beto = await estatistica(c.beto.id);
    expect([beto.alinhPartidoIguais, beto.alinhPartidoTotal, beto.alinhGovernoIguais, beto.alinhGovernoTotal]).toEqual([
      1, 1, 0, 1,
    ]);
  });
});

describe("gastos e resumos", () => {
  it("soma só o período", async () => {
    const g = await gastos(c.ana, ano2025);
    expect(g.total).toBeCloseTo(300.5);
    expect(g.categorias.map((x) => x.categoria)).toEqual(["COMBUSTÍVEIS", "TELEFONIA"]);
    expect((await estatistica(c.ana.id)).gastos).toBe("300.50");
  });

  it("cartões da lista leem a tabela pré-calculada", async () => {
    const r = (await resumos([c.ana.id], ano2025)).get(c.ana.id);
    expect(r).toMatchObject({ votos: 2, presenca: 2 / 3 });
    expect(r?.alinhPartido).toBeCloseTo(0.5);
  });
});

describe("busca", () => {
  it("ignora acentos e, por padrão, quem está fora de exercício", async () => {
    expect((await buscarParlamentares({ q: "ana souza" })).map((p) => p.nome)).toEqual(["Ana Souza"]);
    // Sem termo (página /buscar aberta direto): lista em ordem alfabética.
    expect((await buscarParlamentares({})).map((p) => p.nome)).toEqual(["Ana Souza", "Carla Dias", "Davi Rocha"]);
    expect(await buscarParlamentares({ q: "beto" })).toEqual([]);
    expect((await buscarParlamentares({ q: "beto", todos: true })).map((p) => p.nome)).toEqual(["Beto Lima"]);
  });
});

describe("temas", () => {
  it("lista os temas votados e filtra as votações", async () => {
    expect(await temasDasVotacoes(c.ana, ano2025)).toEqual([
      { tema: "Economia", n: 2 },
      { tema: "Saúde", n: 1 },
    ]);
    const saude = await votos(c.ana, ano2025, 1, 30, "Saúde");
    expect(saude.lista.map((v) => v.proposicao)).toEqual(["PL 1/2025"]);
    expect(saude.total).toBe(1);
    expect((await votos(c.ana, ano2025)).total).toBe(2);
  });
});

describe("página de votação", () => {
  it("placar, votos por partido (na data do voto) e orientações", async () => {
    const v = await obterVotacao("CD", "v1");
    const d = await detalhesVotacao(v!.id);
    expect(d.placar).toEqual([
      { voto: "Sim", n: 1 },
      { voto: "Não", n: 1 },
    ]);
    expect(d.porPartido.map((p) => [p.partido, p.total])).toEqual([
      ["PL", 1],
      ["PT", 1],
    ]);
    expect(d.orientacoes.find((o) => o.bancada === "Governo")?.orientacao).toBe("Sim");
    expect(await obterVotacao("CD", "inexistente")).toBeNull();
  });
});

describe("comparação", () => {
  it("votações em comum e onde divergiram", async () => {
    const r = await votosEmComum(c.ana, c.beto, ano2025);
    // Só v1 tem voto dos dois: Ana Sim, Beto Não.
    expect({ total: r.total, iguais: r.iguais }).toEqual({ total: 1, iguais: 0 });
    expect(r.diferentes.map((d) => [d.proposicao, d.votoA, d.votoB])).toEqual([["PL 1/2025", "Sim", "Não"]]);
  });

  it("lê a chave casa/id da URL", async () => {
    expect((await parlamentarPorChave("camara/1"))?.nome).toBe("Ana Souza");
    expect((await parlamentarPorChave("senado/3"))?.nome).toBe("Carla Dias");
    expect(await parlamentarPorChave("outra/1")).toBeNull();
    expect(await parlamentarPorChave(undefined)).toBeNull();
  });
});

describe("afastamentos e suplentes", () => {
  it("titular afastado aparece na busca padrão, com quem ocupa a vaga", async () => {
    expect((await buscarParlamentares({ q: "davi" })).map((p) => p.nome)).toEqual(["Davi Rocha"]);
    const [a] = await afastamentosDe(c.davi);
    expect(a).toMatchObject({ motivo: "Ministro de Estado", fim: null, definitivo: false });
    expect(a.suplentes.map((s) => [s.nome, s.certeza, s.parlamentar?.idExterno])).toEqual([
      ["Beto Lima", "datas", "2"],
    ]);
  });

  it("suplente vê a vaga que ocupa; cartões sabem quem está afastado", async () => {
    expect((await vagasOcupadas(c.beto)).map((v) => [v.titular.nome, v.fim])).toEqual([["Davi Rocha", null]]);
    const af = await afastadosAgora([c.ana.id, c.davi.id]);
    expect([...af.keys()]).toEqual([c.davi.id]);
  });
});

describe("suplentes na aba Votações do perfil", () => {
  it("marca os votos dados como suplente, com a mesma regra da página da votação", async () => {
    const beto = (await votos(c.beto, ano2025)).lista.find((v) => v.idExterno === "v1")!;
    expect(beto.suplente).toEqual({ titulares: [{ nome: "Davi Rocha", casa: "CD", idExterno: "4" }], certo: true });
    expect((await votos(c.ana, ano2025)).lista.every((v) => v.suplente === null)).toBe(true);
  });
});

describe("suplentes na página de votação", () => {
  it("marca quem votou como suplente e de quem era a vaga", async () => {
    const v = await obterVotacao("CD", "v1");
    const d = await detalhesVotacao(v!.id);
    const beto = d.lista.find((x) => x.nome === "Beto Lima")!;
    const ana = d.lista.find((x) => x.nome === "Ana Souza")!;
    expect(beto.suplente).toEqual({ titulares: [{ nome: "Davi Rocha", casa: "CD", idExterno: "4" }], certo: true });
    expect(ana.suplente).toBeNull();
  });
});

describe("busca: acentos e relevância", () => {
  it("encontra pelo nome completo sem acento", async () => {
    // Beto Lima tem nome completo "José Roberto Lima".
    expect((await buscarParlamentares({ q: "jose", todos: true })).map((p) => p.nome)).toEqual(["Beto Lima"]);
    expect((await buscarParlamentares({ q: "JOSÉ ROBERTO", todos: true })).map((p) => p.nome)).toEqual(["Beto Lima"]);
  });

  it("quem começa com o termo vem primeiro, depois quem tem uma palavra começando com ele", async () => {
    const [lia] = await db
      .insert(schema.parlamentar)
      .values({
        casa: "CD",
        idExterno: "99",
        nome: "Lia Dias",
        partido: "PSB",
        uf: "BA",
        emExercicio: true,
        fonteUrl: "teste",
      })
      .returning();
    try {
      // Em ordem alfabética seria Beto Lima antes de Lia Dias.
      expect((await buscarParlamentares({ q: "li", todos: true })).map((p) => p.nome)).toEqual([
        "Lia Dias",
        "Beto Lima",
      ]);
    } finally {
      await db.delete(schema.parlamentar).where(eq(schema.parlamentar.id, lia.id));
    }
  });
});

describe("status das atualizações", () => {
  it("última execução por tarefa, último sucesso e execução interrompida", async () => {
    const h = (horas: number) => new Date(Date.now() - horas * 3_600_000);
    await db.insert(schema.ingestaoLog).values([
      { tarefa: "deputados", status: "ok", iniciadoEm: h(30), finalizadoEm: h(29.9), registros: 648 },
      {
        tarefa: "deputados",
        status: "erro",
        iniciadoEm: h(2),
        finalizadoEm: h(1.9),
        erro: "Error: HTTP 503\n  at stack",
      },
      { tarefa: "senadores", status: "rodando", iniciadoEm: h(5) },
    ]);
    const s = Object.fromEntries((await statusIngestao()).map((t) => [t.tarefa, t]));
    expect(s.deputados).toMatchObject({ status: "erro", erro: "Error: HTTP 503" });
    expect(s.deputados.ultimoOk?.getTime()).toBeCloseTo(h(29.9).getTime(), -4);
    expect(s.senadores).toMatchObject({ status: "interrompida", ultimoOk: null });
  });
});

describe("comissões", () => {
  it("só reuniões com presença publicada, depois da filiação e como titular; perfil e médias batem", async () => {
    const [ce] = await comissoesDe(c.ana, ano2025);
    expect(ce).toMatchObject({ sigla: "CE", reunioes: 2, presencas: 1 });
    expect(ce.cargos.map((x) => x.cargo)).toEqual(["Titular"]);
    const e = await estatistica(c.ana.id);
    expect([e.comissaoPresencas, e.comissaoReunioes]).toEqual([1, 2]);
    // Beto é suplente na comissão: aparece como membro, mas as reuniões não contam para ele.
    const [doBeto] = await comissoesDe(c.beto, ano2025);
    expect(doBeto).toMatchObject({ sigla: "CE", reunioes: 0, presencas: 0 });
  });
});

describe("eleições", () => {
  it("bens por tipo, receitas por origem e só doadores institucionais pelo nome", async () => {
    const [cand] = await db
      .insert(schema.candidatura)
      .values({
        parlamentarId: c.ana.id,
        ano: 2022,
        eleicao: "Eleições Gerais Estaduais 2022",
        dataEleicao: "2022-10-02",
        cargo: "DEPUTADO FEDERAL",
        uf: "SP",
        partido: "PT",
        sqCandidato: "1",
        patrimonio: "270.00",
        receitaTotal: "1150.00",
        fonteUrl: "teste",
      })
      .returning();
    await db.insert(schema.candidaturaBem).values([
      { candidaturaId: cand.id, ordem: 1, tipo: "Terreno", valor: "100.00" },
      { candidaturaId: cand.id, ordem: 2, tipo: "Terreno", valor: "50.00" },
      { candidaturaId: cand.id, ordem: 3, tipo: "Veículo", valor: "120.00" },
    ]);
    await db.insert(schema.candidaturaReceita).values([
      {
        candidaturaId: cand.id,
        origem: "Recursos de pessoas físicas",
        doador: "",
        total: "150.00",
        doacoes: 3,
        doadores: 2,
      },
      {
        candidaturaId: cand.id,
        origem: "Recursos de partido político",
        doador: "DIREÇÃO NACIONAL",
        total: "1000.00",
        doacoes: 1,
        doadores: 1,
      },
    ]);
    const [r] = await candidaturasDe(c.ana);
    expect(r).toMatchObject({ ano: 2022, cargo: "DEPUTADO FEDERAL", patrimonio: 270, receitaTotal: 1150 });
    expect(r.bensPorTipo).toEqual([
      { tipo: "Terreno", total: 150, n: 2 },
      { tipo: "Veículo", total: 120, n: 1 },
    ]);
    expect(r.receitasPorOrigem.map((x) => [x.origem, x.total, x.doadores])).toEqual([
      ["Recursos de partido político", 1000, 1],
      ["Recursos de pessoas físicas", 150, 2],
    ]);
    expect(r.doadoresInstitucionais.map((d) => d.doador)).toEqual(["DIREÇÃO NACIONAL"]);
    expect(await candidaturasDe(c.beto)).toEqual([]);
  });
});

describe("sitemap", () => {
  it("páginas fixas e um perfil por parlamentar, lidos do banco", async () => {
    const urls = (await sitemap()).map((u) => u.url.replace(/^https?:\/\/[^/]+/, ""));
    expect(urls).toContain("/metodologia");
    expect(urls).toContain("/parlamentar/camara/1");
    expect(urls).toContain("/parlamentar/senado/3");
    expect(urls.filter((u) => u.startsWith("/parlamentar/"))).toHaveLength(4);
  });
});

describe("CSV do perfil", () => {
  const linhas = (csv: string) =>
    csv
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");

  it("mesmo recorte e mesmos números das abas", async () => {
    const presencaCsv = linhas(await csvDoPerfil(c.ana, "presenca", ano2025));
    const p = await presenca(c.ana, ano2025);
    expect(presencaCsv[0]).toBe("data_hora;sessao;presente");
    expect(presencaCsv.slice(1)).toHaveLength(p.total);
    expect(presencaCsv.filter((l) => l.endsWith(";sim"))).toHaveLength(p.presentes);

    const votosCsv = linhas(await csvDoPerfil(c.beto, "votacoes", ano2025));
    expect(votosCsv.slice(1)).toHaveLength((await votos(c.beto, ano2025)).total);
    // Beto votou a v1 como suplente de Davi Rocha.
    expect(votosCsv.some((l) => l.includes(";sim;Davi Rocha;"))).toBe(true);

    const gastosCsv = linhas(await csvDoPerfil(c.ana, "gastos", ano2025));
    const soma = gastosCsv.slice(1).reduce((s, l) => s + Number(l.split(";")[5].replace(",", ".")), 0);
    expect(soma).toBeCloseTo((await gastos(c.ana, ano2025)).total);
  });
});
