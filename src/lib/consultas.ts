import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import type { Periodo } from "./periodo";

const { parlamentar } = schema;
export type Parlamentar = typeof parlamentar.$inferSelect;
type Casa = Parlamentar["casa"];

const num = (v: unknown) => Number(v ?? 0);

// ---------- Busca ----------

export async function buscarParlamentares(f: { q?: string; casa?: string; uf?: string; partido?: string; todos?: boolean }) {
  const filtros = [];
  if (f.q?.trim()) {
    const termo = `%${f.q.trim()}%`;
    filtros.push(or(sql`unaccent(${parlamentar.nome}) ilike unaccent(${termo})`, ilike(parlamentar.nomeCompleto, termo)));
  }
  if (f.casa === "CD" || f.casa === "SF") filtros.push(eq(parlamentar.casa, f.casa));
  if (f.uf) filtros.push(eq(parlamentar.uf, f.uf.toUpperCase()));
  if (f.partido) filtros.push(eq(parlamentar.partido, f.partido.toUpperCase()));
  if (!f.todos) filtros.push(eq(parlamentar.emExercicio, true));
  return db.select().from(parlamentar).where(and(...filtros)).orderBy(asc(parlamentar.nome)).limit(60);
}

export async function opcoesFiltro() {
  const [ufs, partidos] = await Promise.all([
    db.selectDistinct({ v: parlamentar.uf }).from(parlamentar).where(eq(parlamentar.emExercicio, true)).orderBy(parlamentar.uf),
    db.selectDistinct({ v: parlamentar.partido }).from(parlamentar).where(eq(parlamentar.emExercicio, true)).orderBy(parlamentar.partido),
  ]);
  return { ufs: ufs.map((u) => u.v!).filter(Boolean), partidos: partidos.map((p) => p.v!).filter(Boolean) };
}

export async function obterParlamentar(casa: Casa, idExterno: string) {
  const [p] = await db.select().from(parlamentar).where(and(eq(parlamentar.casa, casa), eq(parlamentar.idExterno, idExterno)));
  return p ?? null;
}

// ---------- Presença ----------

/**
 * Janela em que o parlamentar estava em exercício dentro do período. A fonte não traz o histórico
 * de licenças, então aproximamos: da primeira à última atividade registrada (presença ou voto),
 * estendendo até hoje se ele ainda está em exercício.
 */
function janelaSql(p: Parlamentar, periodo: Periodo) {
  return sql`
    with atividade as (
      select min(s.inicio) as primeira, max(s.inicio) as ultima
      from presenca pr join sessao s on s.id = pr.sessao_id where pr.parlamentar_id = ${p.id}
      union all
      select min(v.data), max(v.data)
      from voto vo join votacao v on v.id = vo.votacao_id where vo.parlamentar_id = ${p.id}
    ),
    janela as (
      select greatest(min(primeira), ${periodo.inicio.toISOString()}::timestamptz) as ini,
             least(${p.emExercicio ? sql`now()` : sql`max(ultima)`}, ${periodo.fim.toISOString()}::timestamptz) as fim
      from atividade
    ),
    sessoes as (
      select s.id, s.inicio, s.descricao, exists(
        select 1 from presenca pr where pr.sessao_id = s.id and pr.parlamentar_id = ${p.id}
      ) as presente
      from sessao s, janela j
      where s.casa = ${p.casa} and s.inicio >= j.ini and s.inicio <= j.fim
    )`;
}

export async function presenca(p: Parlamentar, periodo: Periodo) {
  const base = janelaSql(p, periodo);
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

export async function votos(p: Parlamentar, periodo: Periodo, pagina = 1, porPagina = 30) {
  const filtro = sql`vo.parlamentar_id = ${p.id} and v.data >= ${periodo.inicio.toISOString()} and v.data < ${periodo.fim.toISOString()}`;
  const [lista, contagem] = await Promise.all([
    db.execute(sql`
      select v.id, v.data, v.descricao, v.proposicao, v.ementa, v.aprovada, v.fonte_url, vo.voto
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
  return {
    total: num(total[0]?.total),
    lancamentos: num(total[0]?.n),
    categorias: categorias.map((c) => ({ categoria: String(c.categoria), total: num(c.total) })),
    mensal: mensal.map((m) => ({ mes: `${m.ano}-${String(m.mes).padStart(2, "0")}`, total: num(m.total) })),
    fornecedores: fornecedores.map((f) => ({ fornecedor: String(f.fornecedor ?? "—"), cnpjCpf: f.cnpj_cpf as string | null, total: num(f.total), n: num(f.n) })),
  };
}

// ---------- Resumo para os cartões da lista ----------

/** Votos em que o parlamentar de fato votou (exclui ausências e presença sem voto). */
export const VOTOS_EFETIVOS = ["Sim", "Não", "Abstenção", "Obstrução", "Votou (secreto)"];

export async function resumos(ids: number[], periodo: Periodo) {
  if (ids.length === 0) return new Map<number, { presenca: number | null; votos: number; gastos: number }>();
  const ps = await db.select().from(parlamentar).where(sql`${parlamentar.id} in ${ids}`);
  const itens = await Promise.all(
    ps.map(async (p) => {
      const [pr, vt, gs] = await Promise.all([
        presenca(p, periodo),
        db.execute(sql`select count(*) as n from voto vo join votacao v on v.id = vo.votacao_id
          where vo.parlamentar_id = ${p.id} and vo.voto in ${VOTOS_EFETIVOS} and v.data >= ${periodo.inicio.toISOString()} and v.data < ${periodo.fim.toISOString()}`),
        db.execute(sql`select coalesce(sum(valor),0) as t from despesa where parlamentar_id = ${p.id} and ano = ${periodo.inicio.getFullYear()}`),
      ]);
      return [p.id, { presenca: pr.percentual, votos: num(vt[0]?.n), gastos: num(gs[0]?.t) }] as const;
    }),
  );
  return new Map(itens);
}

export async function ultimaAtualizacao() {
  const r = await db.execute(sql`select max(finalizado_em) as t from ingestao_log where status = 'ok'`);
  return r[0]?.t ? new Date(String(r[0].t)) : null;
}

// ---------- Lista do usuário ----------

export async function idsSeguidos(usuarioId: string | undefined): Promise<Set<number>> {
  if (!usuarioId) return new Set();
  const r = await db.select({ id: schema.seguindo.parlamentarId }).from(schema.seguindo).where(eq(schema.seguindo.usuarioId, usuarioId));
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
