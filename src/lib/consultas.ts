import { and, asc, eq, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { Periodo } from "./periodo";
import { sessaoConta } from "./exercicio";
import { POSICOES } from "./votos";

const { parlamentar } = schema;
export type Parlamentar = typeof parlamentar.$inferSelect;
type Casa = Parlamentar["casa"];

const num = (v: unknown) => Number(v ?? 0);

// ---------- Busca ----------

export async function buscarParlamentares(f: {
  q?: string;
  casa?: string;
  uf?: string;
  partido?: string;
  todos?: boolean;
}) {
  const filtros = [];
  const q = f.q?.trim();
  // Busca sem acento e sem diferença de maiúsculas, no nome parlamentar e no nome completo.
  const norm = (col: unknown) => sql`unaccent(lower(${col}))`;
  const termo = q ? sql`unaccent(lower(${q}))` : null;
  if (termo)
    filtros.push(
      or(
        sql`${norm(parlamentar.nome)} like '%' || ${termo} || '%'`,
        sql`${norm(parlamentar.nomeCompleto)} like '%' || ${termo} || '%'`,
      ),
    );
  if (f.casa === "CD" || f.casa === "SF") filtros.push(eq(parlamentar.casa, f.casa));
  if (f.uf) filtros.push(eq(parlamentar.uf, f.uf.toUpperCase()));
  if (f.partido) filtros.push(eq(parlamentar.partido, f.partido.toUpperCase()));
  // Por padrão: quem está em exercício e também os titulares afastados (o eleitor procura quem elegeu,
  // mesmo que hoje um suplente ocupe a vaga).
  if (!f.todos)
    filtros.push(
      or(
        eq(parlamentar.emExercicio, true),
        sql`exists (select 1 from afastamento a where a.parlamentar_id = ${parlamentar.id} and a.fim is null and not a.definitivo)`,
      ),
    );
  // Relevância: nome que começa com o termo, depois alguma palavra do nome, depois o resto.
  const relevancia = termo
    ? sql`case
        when ${norm(parlamentar.nome)} like ${termo} || '%' then 0
        when ' ' || ${norm(parlamentar.nome)} like '% ' || ${termo} || '%' then 1
        when ${norm(parlamentar.nome)} like '%' || ${termo} || '%' then 2
        else 3 end`
    : sql`0`;
  return db
    .select()
    .from(parlamentar)
    .where(and(...filtros))
    .orderBy(relevancia, norm(parlamentar.nome))
    .limit(60);
}

export async function opcoesFiltro() {
  const [ufs, partidos] = await Promise.all([
    db
      .selectDistinct({ v: parlamentar.uf })
      .from(parlamentar)
      .where(eq(parlamentar.emExercicio, true))
      .orderBy(parlamentar.uf),
    db
      .selectDistinct({ v: parlamentar.partido })
      .from(parlamentar)
      .where(eq(parlamentar.emExercicio, true))
      .orderBy(parlamentar.partido),
  ]);
  return { ufs: ufs.map((u) => u.v!).filter(Boolean), partidos: partidos.map((p) => p.v!).filter(Boolean) };
}

export async function obterParlamentar(casa: Casa, idExterno: string) {
  const [p] = await db
    .select()
    .from(parlamentar)
    .where(and(eq(parlamentar.casa, casa), eq(parlamentar.idExterno, idExterno)));
  return p ?? null;
}

// ---------- Presença ----------

/** Sessões do período que contam para a presença do parlamentar (ver lib/exercicio.ts). */
function sessoesSql(p: Parlamentar, periodo: Periodo) {
  return sql`
    with sessoes as (
      select s.id, s.inicio, s.descricao, exists(
        select 1 from presenca pr where pr.sessao_id = s.id and pr.parlamentar_id = ${p.id}
      ) as presente
      from sessao s
      where s.casa = ${p.casa}
        and s.inicio >= ${periodo.inicio.toISOString()} and s.inicio < ${periodo.fim.toISOString()}
        and ${sessaoConta(p.id, sql`s.id`, sql`s.inicio`)}
    )`;
}

export async function presenca(p: Parlamentar, periodo: Periodo) {
  const base = sessoesSql(p, periodo);
  const [resumo, mensal, ausencias] = await Promise.all([
    db.execute(sql`${base} select count(*) as total, count(*) filter (where presente) as presentes from sessoes`),
    db.execute(sql`${base}
      select to_char(inicio at time zone 'America/Sao_Paulo', 'YYYY-MM') as mes,
             count(*) as total, count(*) filter (where presente) as presentes
      from sessoes group by 1 order by 1`),
    // No Senado, o voto registrado na sessão explica a ausência (licença, missão, atividade parlamentar).
    db.execute(sql`${base}
      select s.id, s.inicio, s.descricao, (
        select string_agg(distinct vo.voto, ', ') from voto vo join votacao v on v.id = vo.votacao_id
        where vo.parlamentar_id = ${p.id} and v.casa = 'SF' and ${p.casa} = 'SF'
          and (v.data at time zone 'America/Sao_Paulo')::date = (s.inicio at time zone 'America/Sao_Paulo')::date
      ) as motivo
      from sessoes s where not presente order by inicio desc limit 100`),
  ]);
  const total = num(resumo[0]?.total);
  const presentes = num(resumo[0]?.presentes);
  return {
    total,
    presentes,
    percentual: total ? presentes / total : null,
    mensal: mensal.map((m) => ({ mes: String(m.mes), total: num(m.total), presentes: num(m.presentes) })),
    ausencias: ausencias.map((a) => ({
      inicio: new Date(String(a.inicio)),
      descricao: a.descricao as string | null,
      motivo: a.motivo as string | null,
    })),
  };
}

// ---------- Votações ----------

/** Filtra votações pela matéria ter o tema oficial informado. */
const comTema = (tema: string | undefined) =>
  tema
    ? sql`and exists (
        select 1 from tema_proposicao t where t.casa = v.casa and t.proposicao_ref = v.proposicao_ref and t.tema = ${tema})`
    : sql``;

export async function votos(p: Parlamentar, periodo: Periodo, pagina = 1, porPagina = 30, tema?: string) {
  const filtro = sql`vo.parlamentar_id = ${p.id} and v.data >= ${periodo.inicio.toISOString()} and v.data < ${periodo.fim.toISOString()} ${comTema(tema)}`;
  const [lista, contagem] = await Promise.all([
    db.execute(sql`
      select v.id, v.id_externo, v.data, v.descricao, v.proposicao, v.ementa, v.aprovada, v.fonte_url, vo.voto
      from voto vo join votacao v on v.id = vo.votacao_id
      where ${filtro} order by v.data desc
      limit ${porPagina} offset ${(pagina - 1) * porPagina}`),
    db.execute(sql`
      select vo.voto, count(*) as n from voto vo join votacao v on v.id = vo.votacao_id
      where ${filtro} group by 1 order by 2 desc`),
  ]);
  return {
    lista: lista.map((v) => ({
      id: num(v.id),
      idExterno: String(v.id_externo),
      data: new Date(String(v.data)),
      descricao: v.descricao as string | null,
      proposicao: v.proposicao as string | null,
      ementa: v.ementa as string | null,
      aprovada: v.aprovada as boolean | null,
      fonteUrl: v.fonte_url as string,
      voto: v.voto as string,
    })),
    porTipo: contagem.map((c) => ({ voto: String(c.voto), n: num(c.n) })),
    total: contagem.reduce((s, c) => s + num(c.n), 0),
  };
}

/** Temas das matérias que o parlamentar votou no período, com o número de votações de cada um. */
export async function temasDasVotacoes(p: Parlamentar, periodo: Periodo) {
  const r = await db.execute(sql`
    select t.tema, count(distinct v.id) as n
    from voto vo join votacao v on v.id = vo.votacao_id
    join tema_proposicao t on t.casa = v.casa and t.proposicao_ref = v.proposicao_ref
    where vo.parlamentar_id = ${p.id} and v.data >= ${periodo.inicio.toISOString()} and v.data < ${periodo.fim.toISOString()}
    group by 1 order by 2 desc, 1`);
  return r.map((x) => ({ tema: String(x.tema), n: num(x.n) }));
}

// ---------- Proposições ----------

export async function proposicoes(p: Parlamentar, periodo: Periodo) {
  const linhas = await db.execute(sql`
    select pr.sigla_tipo, pr.numero, pr.ano, pr.ementa, pr.apresentada_em, pr.situacao, pr.fonte_url
    from autoria a join proposicao pr on pr.id = a.proposicao_id
    where a.parlamentar_id = ${p.id}
      and pr.apresentada_em >= ${periodo.inicio.toISOString()}::date and pr.apresentada_em < ${periodo.fim.toISOString()}::date
    order by pr.apresentada_em desc, pr.numero desc limit 300`);
  const lista = linhas.map((l) => ({
    rotulo: `${l.sigla_tipo} ${l.numero}/${l.ano}`,
    siglaTipo: String(l.sigla_tipo),
    ementa: l.ementa as string | null,
    apresentadaEm: l.apresentada_em ? String(l.apresentada_em) : null,
    situacao: l.situacao as string | null,
    fonteUrl: String(l.fonte_url),
  }));
  const porTipo = Object.entries(
    lista.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.siglaTipo]: (acc[l.siglaTipo] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  return { lista, porTipo };
}

// ---------- Gastos ----------

export async function gastos(p: Parlamentar, periodo: Periodo) {
  const ini = periodo.inicio.getFullYear() * 100 + periodo.inicio.getMonth() + 1;
  const fimData = new Date(periodo.fim.getTime() - 1);
  const fim = fimData.getFullYear() * 100 + fimData.getMonth() + 1;
  const filtro = sql`parlamentar_id = ${p.id} and (ano * 100 + mes) between ${ini} and ${fim}`;
  const [total, categorias, mensal, fornecedores] = await Promise.all([
    db.execute(sql`select coalesce(sum(valor), 0) as total, count(*) as n from despesa where ${filtro}`),
    db.execute(sql`select categoria, sum(valor) as total from despesa where ${filtro} group by 1 order by 2 desc`),
    db.execute(sql`select ano, mes, sum(valor) as total from despesa where ${filtro} group by 1, 2 order by 1, 2`),
    db.execute(sql`
      select fornecedor, cnpj_cpf, sum(valor) as total, count(*) as n from despesa where ${filtro}
      group by 1, 2 order by 3 desc limit 10`),
  ]);
  // Lançamentos dos principais fornecedores, com o link da nota quando a casa publica (só a Câmara).
  const lancamentos = fornecedores.length
    ? await db.execute(sql`
        select fornecedor, cnpj_cpf, data, ano, mes, categoria, valor, documento_url from despesa
        where ${filtro} and (fornecedor, coalesce(cnpj_cpf, '')) in (${sql.join(
          fornecedores.map((f) => sql`(${f.fornecedor as string}, ${(f.cnpj_cpf as string | null) ?? ""})`),
          sql`, `,
        )})
        order by data desc nulls last, valor desc`)
    : [];
  const chave = (fornecedor: unknown, cnpj: unknown) => `${fornecedor}|${cnpj ?? ""}`;
  const porFornecedor = new Map<
    string,
    { data: string | null; mes: string; categoria: string; valor: number; documentoUrl: string | null }[]
  >();
  for (const l of lancamentos) {
    const k = chave(l.fornecedor, l.cnpj_cpf);
    const lista = porFornecedor.get(k) ?? [];
    lista.push({
      data: l.data ? String(l.data) : null,
      mes: `${l.ano}-${String(l.mes).padStart(2, "0")}`,
      categoria: String(l.categoria),
      valor: num(l.valor),
      documentoUrl: l.documento_url as string | null,
    });
    porFornecedor.set(k, lista);
  }
  return {
    total: num(total[0]?.total),
    lancamentos: num(total[0]?.n),
    categorias: categorias.map((c) => ({ categoria: String(c.categoria), total: num(c.total) })),
    mensal: mensal.map((m) => ({ mes: `${m.ano}-${String(m.mes).padStart(2, "0")}`, total: num(m.total) })),
    fornecedores: fornecedores.map((f) => ({
      fornecedor: String(f.fornecedor ?? "—"),
      cnpjCpf: f.cnpj_cpf as string | null,
      total: num(f.total),
      n: num(f.n),
      lancamentos: porFornecedor.get(chave(f.fornecedor, f.cnpj_cpf)) ?? [],
    })),
  };
}

// ---------- Estatísticas pré-calculadas (tabela estatistica) ----------

const razao = (a: unknown, b: unknown) => (num(b) ? num(a) / num(b) : null);

export interface Indicadores {
  presenca: number | null;
  votos: number;
  gastos: number;
  proposicoes: number;
  alinhPartido: number | null;
  alinhGoverno: number | null;
}

/** Cartões da lista: lê a tabela pré-calculada (rápido mesmo com muitos parlamentares). */
export async function resumos(ids: number[], periodo: Periodo) {
  const r = new Map<number, Indicadores>();
  if (ids.length === 0) return r;
  const linhas = await db
    .select()
    .from(schema.estatistica)
    .where(and(sql`${schema.estatistica.parlamentarId} in ${ids}`, eq(schema.estatistica.periodo, periodo.valor)));
  for (const e of linhas)
    r.set(e.parlamentarId, {
      presenca: razao(e.presencas, e.sessoes),
      votos: e.votos,
      gastos: num(e.gastos),
      proposicoes: e.proposicoes,
      alinhPartido: razao(e.alinhPartidoIguais, e.alinhPartidoTotal),
      alinhGoverno: razao(e.alinhGovernoIguais, e.alinhGovernoTotal),
    });
  return r;
}

/**
 * Indicadores do parlamentar ao lado das médias do partido e da casa (só quem está em exercício).
 * Médias simples por parlamentar — cada um pesa igual, independentemente de quantas sessões teve.
 */
export async function comparativo(p: Parlamentar, periodo: Periodo) {
  const media = (filtro: ReturnType<typeof sql>) =>
    db.execute(sql`
      select count(*) as n,
        avg(e.presencas::numeric / nullif(e.sessoes, 0)) as presenca,
        avg(e.votos) as votos, avg(e.gastos) as gastos, avg(e.proposicoes) as proposicoes,
        avg(e.alinh_partido_iguais::numeric / nullif(e.alinh_partido_total, 0)) as alinh_partido,
        avg(e.alinh_governo_iguais::numeric / nullif(e.alinh_governo_total, 0)) as alinh_governo
      from estatistica e join parlamentar x on x.id = e.parlamentar_id
      where e.periodo = ${periodo.valor} and x.em_exercicio and x.casa = ${p.casa} and ${filtro}`);
  const comoIndicadores = (m: Record<string, unknown> | undefined): Indicadores & { n: number } => ({
    n: num(m?.n),
    presenca: m?.presenca == null ? null : num(m.presenca),
    votos: num(m?.votos),
    gastos: num(m?.gastos),
    proposicoes: num(m?.proposicoes),
    alinhPartido: m?.alinh_partido == null ? null : num(m.alinh_partido),
    alinhGoverno: m?.alinh_governo == null ? null : num(m.alinh_governo),
  });
  const [proprio, partido, casa] = await Promise.all([
    resumos([p.id], periodo).then((r) => r.get(p.id) ?? null),
    p.partido ? media(sql`x.partido = ${p.partido}`) : Promise.resolve([]),
    media(sql`true`),
  ]);
  return { proprio, partido: comoIndicadores(partido[0]), casa: comoIndicadores(casa[0]) };
}

export async function ultimaAtualizacao() {
  const r = await db.execute(sql`select max(finalizado_em) as t from ingestao_log where status = 'ok'`);
  return r[0]?.t ? new Date(String(r[0].t)) : null;
}

// ---------- Lista do usuário ----------

export async function idsSeguidos(usuarioId: string | undefined): Promise<Set<number>> {
  if (!usuarioId) return new Set();
  const r = await db
    .select({ id: schema.seguindo.parlamentarId })
    .from(schema.seguindo)
    .where(eq(schema.seguindo.usuarioId, usuarioId));
  return new Set(r.map((x) => x.id));
}

export async function listaDoUsuario(usuarioId: string) {
  return db
    .select({ p: parlamentar })
    .from(schema.seguindo)
    .innerJoin(parlamentar, eq(parlamentar.id, schema.seguindo.parlamentarId))
    .where(eq(schema.seguindo.usuarioId, usuarioId))
    .orderBy(asc(parlamentar.nome))
    .then((r) => r.map((x) => x.p));
}

// ---------- Página de uma votação ----------

export async function obterVotacao(casa: Casa, idExterno: string) {
  const [v] = await db
    .select()
    .from(schema.votacao)
    .where(and(eq(schema.votacao.casa, casa), eq(schema.votacao.idExterno, idExterno)));
  return v ?? null;
}

interface VagaNaVotacao {
  nome: string;
  casa: Casa;
  idExterno: string;
  certeza: "oficial" | "datas" | "possivel";
}

/**
 * Situação de quem votou como suplente: de quem era a vaga (certa), candidatos possíveis, ou só que era
 * suplente (vaga não identificada). Nulo se votou como titular.
 */
export function suplenteNaVotacao(comoSuplente: boolean, vagas: VagaNaVotacao[] | null) {
  const todas = vagas ?? [];
  const certas = todas.filter((v) => v.certeza !== "possivel");
  if (!comoSuplente && todas.length === 0) return null;
  const titulares = (certas.length ? certas : todas).map(({ nome, casa, idExterno }) => ({ nome, casa, idExterno }));
  return { titulares, certo: certas.length > 0 };
}

export async function detalhesVotacao(votacaoId: number) {
  const [votos, orientacoes] = await Promise.all([
    db.execute(sql`
      select p.id, p.casa, p.id_externo, p.nome, p.uf, coalesce(vo.partido, p.partido) as partido, vo.voto,
        -- Na data da votação, exercia o mandato como suplente?
        exists (
          select 1 from exercicio e
          where e.parlamentar_id = p.id and e.como_suplente
            and v.data >= e.inicio and v.data < coalesce(e.fim, 'infinity')
        ) as como_suplente,
        -- De quem era a vaga (pode haver candidatos "possíveis" na Câmara).
        (
          select json_agg(json_build_object(
            'nome', t.nome, 'casa', t.casa, 'idExterno', t.id_externo, 'certeza', s.certeza) order by t.nome)
          from substituicao s join parlamentar t on t.id = s.titular_id
          where s.suplente_id = p.id and v.data >= s.inicio and v.data < coalesce(s.fim, 'infinity')
        ) as vagas
      from voto vo
      join parlamentar p on p.id = vo.parlamentar_id
      join votacao v on v.id = vo.votacao_id
      where vo.votacao_id = ${votacaoId}
      order by p.nome`),
    db.execute(sql`select bancada, orientacao from orientacao where votacao_id = ${votacaoId} order by bancada`),
  ]);
  const lista = votos.map((x) => ({
    id: num(x.id),
    casa: x.casa as Casa,
    idExterno: String(x.id_externo),
    nome: String(x.nome),
    uf: x.uf as string | null,
    partido: (x.partido as string | null) ?? "sem partido",
    voto: String(x.voto),
    suplente: suplenteNaVotacao(x.como_suplente as boolean, x.vagas as VagaNaVotacao[] | null),
  }));

  const placar = new Map<string, number>();
  const porPartido = new Map<string, Map<string, number>>();
  for (const v of lista) {
    placar.set(v.voto, (placar.get(v.voto) ?? 0) + 1);
    const doPartido = porPartido.get(v.partido) ?? new Map<string, number>();
    doPartido.set(v.voto, (doPartido.get(v.voto) ?? 0) + 1);
    porPartido.set(v.partido, doPartido);
  }
  // Mais votos primeiro; empate na ordem usual do placar (Sim, Não, Abstenção, Obstrução, demais).
  const peso = (voto: string) => {
    const i = ["Sim", "Não", "Abstenção", "Obstrução"].indexOf(voto);
    return i < 0 ? 99 : i;
  };
  const ordenar = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1] || peso(a[0]) - peso(b[0]) || a[0].localeCompare(b[0]));
  return {
    lista,
    placar: ordenar(placar).map(([voto, n]) => ({ voto, n })),
    porPartido: [...porPartido.entries()]
      .map(([partido, votos]) => ({
        partido,
        total: [...votos.values()].reduce((s, n) => s + n, 0),
        votos: ordenar(votos).map(([voto, n]) => ({ voto, n })),
      }))
      .sort((a, b) => b.total - a.total || a.partido.localeCompare(b.partido)),
    orientacoes: orientacoes.map((o) => ({ bancada: String(o.bancada), orientacao: String(o.orientacao) })),
  };
}

// ---------- Comparação entre dois parlamentares ----------

/** Parlamentar a partir de "camara/204534" ou "senado/5672". */
export async function parlamentarPorChave(chave: string | undefined) {
  const [slug, id] = (chave ?? "").split("/");
  if (!id || (slug !== "camara" && slug !== "senado")) return null;
  return obterParlamentar(slug === "camara" ? "CD" : "SF", id);
}

/**
 * Votações em que os dois votaram (Sim, Não, Abstenção ou Obstrução) no período: quantas iguais e
 * a lista das diferentes, mais recentes primeiro. Só faz sentido para parlamentares da mesma casa.
 */
export async function votosEmComum(a: Parlamentar, b: Parlamentar, periodo: Periodo) {
  const base = sql`
    from voto va join voto vb on vb.votacao_id = va.votacao_id
    join votacao v on v.id = va.votacao_id
    where va.parlamentar_id = ${a.id} and vb.parlamentar_id = ${b.id}
      and va.voto in ${POSICOES} and vb.voto in ${POSICOES}
      and v.data >= ${periodo.inicio.toISOString()} and v.data < ${periodo.fim.toISOString()}`;
  const [contagem, diferentes] = await Promise.all([
    db.execute(sql`select count(*) as total, count(*) filter (where va.voto = vb.voto) as iguais ${base}`),
    db.execute(sql`
      select v.id_externo, v.data, v.proposicao, v.ementa, va.voto as voto_a, vb.voto as voto_b
      ${base} and va.voto <> vb.voto order by v.data desc limit 50`),
  ]);
  return {
    total: num(contagem[0]?.total),
    iguais: num(contagem[0]?.iguais),
    diferentes: diferentes.map((d) => ({
      idExterno: String(d.id_externo),
      data: new Date(String(d.data)),
      proposicao: d.proposicao as string | null,
      ementa: d.ementa as string | null,
      votoA: String(d.voto_a),
      votoB: String(d.voto_b),
    })),
  };
}

// ---------- Afastamentos e suplentes ----------

export interface SuplenteNaVaga {
  nome: string;
  inicio: Date;
  fim: Date | null;
  certeza: "oficial" | "datas" | "possivel";
  parlamentar: { casa: Casa; idExterno: string; partido: string | null; uf: string | null } | null;
}

export interface AfastamentoDetalhado {
  inicio: Date;
  fim: Date | null;
  motivo: string;
  definitivo: boolean;
  suplentes: SuplenteNaVaga[];
}

/** Afastamentos do titular, mais recentes primeiro, com quem ocupou a vaga. */
export async function afastamentosDe(p: Parlamentar): Promise<AfastamentoDetalhado[]> {
  const linhas = await db.execute(sql`
    select a.inicio, a.fim, a.motivo, a.definitivo,
      s.suplente_nome, s.inicio as s_inicio, s.fim as s_fim, s.certeza,
      sp.casa as s_casa, sp.id_externo as s_id, sp.partido as s_partido, sp.uf as s_uf
    from afastamento a
    left join substituicao s on s.titular_id = a.parlamentar_id and s.afastamento_inicio = a.inicio
    left join parlamentar sp on sp.id = s.suplente_id
    where a.parlamentar_id = ${p.id}
    order by a.inicio desc, s.inicio`);
  const r: AfastamentoDetalhado[] = [];
  for (const l of linhas) {
    const inicio = new Date(String(l.inicio));
    let a = r.at(-1);
    if (!a || a.inicio.getTime() !== inicio.getTime()) {
      a = {
        inicio,
        fim: l.fim ? new Date(String(l.fim)) : null,
        motivo: String(l.motivo),
        definitivo: Boolean(l.definitivo),
        suplentes: [],
      };
      r.push(a);
    }
    if (l.suplente_nome)
      a.suplentes.push({
        nome: String(l.suplente_nome),
        inicio: new Date(String(l.s_inicio)),
        fim: l.s_fim ? new Date(String(l.s_fim)) : null,
        certeza: l.certeza as SuplenteNaVaga["certeza"],
        parlamentar: l.s_id
          ? {
              casa: l.s_casa as Casa,
              idExterno: String(l.s_id),
              partido: l.s_partido as string | null,
              uf: l.s_uf as string | null,
            }
          : null,
      });
  }
  return r;
}

export interface VagaOcupada {
  inicio: Date;
  fim: Date | null;
  motivo: string | null; // nulo: vaga assumida antes da primeira legislatura com dados
  certeza: "oficial" | "datas" | "possivel";
  titular: { nome: string; casa: Casa; idExterno: string; partido: string | null; uf: string | null };
}

/** Períodos em que o parlamentar ocupou, como suplente, a vaga de um titular afastado. */
export async function vagasOcupadas(p: Parlamentar): Promise<VagaOcupada[]> {
  const linhas = await db.execute(sql`
    select s.inicio, s.fim, s.certeza, a.motivo, t.nome, t.casa, t.id_externo, t.partido, t.uf
    from substituicao s
    -- Pode não haver afastamento: suplentes efetivados antes da primeira legislatura com dados.
    left join afastamento a on a.parlamentar_id = s.titular_id and a.inicio = s.afastamento_inicio
    join parlamentar t on t.id = s.titular_id
    where s.suplente_id = ${p.id} and s.certeza <> 'possivel'
    order by s.inicio desc`);
  return linhas.map((l) => ({
    inicio: new Date(String(l.inicio)),
    fim: l.fim ? new Date(String(l.fim)) : null,
    motivo: (l.motivo as string | null) ?? null,
    certeza: l.certeza as VagaOcupada["certeza"],
    titular: {
      nome: String(l.nome),
      casa: l.casa as Casa,
      idExterno: String(l.id_externo),
      partido: l.partido as string | null,
      uf: l.uf as string | null,
    },
  }));
}

/** Para listas e cartões: quem, entre os ids, está afastado agora (afastamento sem fim, não definitivo). */
export async function afastadosAgora(
  ids: number[],
): Promise<Map<number, { desde: Date; motivo: string; definitivo: boolean }>> {
  if (ids.length === 0) return new Map();
  const linhas = await db.execute(sql`
    select parlamentar_id, inicio, motivo, definitivo from afastamento
    where fim is null and parlamentar_id in ${ids}`);
  return new Map(
    linhas.map((l) => [
      num(l.parlamentar_id),
      { desde: new Date(String(l.inicio)), motivo: String(l.motivo), definitivo: Boolean(l.definitivo) },
    ]),
  );
}

// ---------- Status das atualizações ----------

/** Última execução de cada tarefa de ingestão e a última bem-sucedida, para a página /status. */
export async function statusIngestao() {
  const linhas = await db.execute(sql`
    select distinct on (tarefa) tarefa, status, iniciado_em, finalizado_em, registros, erro,
      (select max(finalizado_em) from ingestao_log x where x.tarefa = l.tarefa and x.status = 'ok') as ultimo_ok
    from ingestao_log l
    order by tarefa, iniciado_em desc`);
  const TRES_HORAS = 3 * 3_600_000;
  return linhas.map((l) => ({
    tarefa: String(l.tarefa),
    // "rodando" há mais de 3 horas é uma execução que morreu no meio (processo interrompido).
    status:
      l.status === "rodando" && Date.now() - new Date(String(l.iniciado_em)).getTime() > TRES_HORAS
        ? ("interrompida" as const)
        : (String(l.status) as "ok" | "erro" | "rodando"),
    iniciadoEm: new Date(String(l.iniciado_em)),
    finalizadoEm: l.finalizado_em ? new Date(String(l.finalizado_em)) : null,
    registros: l.registros == null ? null : num(l.registros),
    // Página pública: só a primeira linha do erro, curta.
    erro: l.erro ? String(l.erro).split("\n")[0].slice(0, 160) : null,
    ultimoOk: l.ultimo_ok ? new Date(String(l.ultimo_ok)) : null,
  }));
}
