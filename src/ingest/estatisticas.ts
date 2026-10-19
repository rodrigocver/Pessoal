import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { periodosDisponiveis } from "@/lib/periodo";
import { VOTOS_EFETIVOS } from "@/lib/votos";
import { BANCADA_GOVERNO, prioridadeOrientacao } from "./alinhamento";

/** Votos/orientações comparáveis no alinhamento ("Liberado" e ausências ficam de fora). */
const POSICOES = ["Sim", "Não", "Abstenção", "Obstrução"];

/**
 * Recalcula a tabela `estatistica` para todos os parlamentares e períodos.
 * A presença segue a mesma definição de `presenca()` em lib/consultas.ts.
 */
export async function calcularEstatisticas(): Promise<number> {
  return db.transaction(async (tx) => {
    // Quais bancadas orientam quais partidos — decidido em TS (prioridadeOrientacao), usado no SQL.
    const bancadas = await tx.execute<{ bancada: string }>(sql`select distinct bancada from orientacao`);
    const partidos = await tx.execute<{ partido: string }>(
      sql`select distinct partido from voto where partido is not null`,
    );
    const pares = bancadas.flatMap(({ bancada }) =>
      partidos.flatMap(({ partido }) => {
        const prioridade = prioridadeOrientacao(bancada, partido);
        return prioridade ? [{ bancada, partido, prioridade }] : [];
      }),
    );
    await tx.execute(
      sql`create temp table bancada_partido (bancada text, partido text, prioridade int) on commit drop`,
    );
    if (pares.length)
      await tx.execute(
        sql`insert into bancada_partido values ${sql.join(
          pares.map((p) => sql`(${p.bancada}, ${p.partido}, ${p.prioridade})`),
          sql`, `,
        )}`,
      );

    // Orientação aplicável a cada voto (partido tem prioridade sobre federação).
    await tx.execute(sql`
      create temp table voto_orientado on commit drop as
      select distinct on (vo.votacao_id, vo.parlamentar_id)
        vo.votacao_id, vo.parlamentar_id, vo.voto, o.orientacao
      from voto vo
      join bancada_partido bp on bp.partido = vo.partido
      join orientacao o on o.votacao_id = vo.votacao_id and o.bancada = bp.bancada
      order by vo.votacao_id, vo.parlamentar_id, bp.prioridade`);

    await tx.execute(sql`
      create temp table atividade on commit drop as
      select parlamentar_id, min(t) as primeira, max(t) as ultima from (
        select pr.parlamentar_id, s.inicio as t from presenca pr join sessao s on s.id = pr.sessao_id
        union all
        select vo.parlamentar_id, v.data from voto vo join votacao v on v.id = vo.votacao_id
      ) x group by 1`);

    await tx.execute(sql`delete from estatistica`);
    let linhas = 0;
    for (const per of periodosDisponiveis()) {
      const ini = per.inicio.toISOString();
      const fim = per.fim.toISOString();
      const mesIni = per.inicio.getFullYear() * 100 + per.inicio.getMonth() + 1;
      const ultimo = new Date(per.fim.getTime() - 1);
      const mesFim = ultimo.getFullYear() * 100 + ultimo.getMonth() + 1;
      const r = await tx.execute(sql`
        insert into estatistica (parlamentar_id, periodo, sessoes, presencas, votos, gastos, proposicoes,
          alinh_partido_iguais, alinh_partido_total, alinh_governo_iguais, alinh_governo_total)
        select p.id, ${per.valor},
          coalesce(pres.sessoes, 0), coalesce(pres.presencas, 0),
          (select count(*) from voto vo join votacao v on v.id = vo.votacao_id
            where vo.parlamentar_id = p.id and vo.voto in ${VOTOS_EFETIVOS} and v.data >= ${ini} and v.data < ${fim}),
          (select coalesce(sum(valor), 0) from despesa d
            where d.parlamentar_id = p.id and (d.ano * 100 + d.mes) between ${mesIni} and ${mesFim}),
          (select count(*) from autoria a join proposicao pr on pr.id = a.proposicao_id
            where a.parlamentar_id = p.id and pr.apresentada_em >= ${ini}::date and pr.apresentada_em < ${fim}::date),
          coalesce(al.iguais, 0), coalesce(al.total, 0), coalesce(gov.iguais, 0), coalesce(gov.total, 0)
        from parlamentar p
        join atividade a on a.parlamentar_id = p.id
        left join lateral (
          select count(s.id) as sessoes, count(pr.sessao_id) as presencas
          from sessao s
          left join presenca pr on pr.sessao_id = s.id and pr.parlamentar_id = p.id
          where s.casa = p.casa
            and s.inicio >= greatest(a.primeira, ${ini}::timestamptz)
            and s.inicio <= least(case when p.em_exercicio then now() else a.ultima end, ${fim}::timestamptz)
        ) pres on true
        left join lateral (
          select count(*) filter (where vo.voto = vo.orientacao) as iguais, count(*) as total
          from voto_orientado vo join votacao v on v.id = vo.votacao_id
          where vo.parlamentar_id = p.id and v.data >= ${ini} and v.data < ${fim}
            and vo.voto in ${POSICOES} and vo.orientacao in ${POSICOES}
        ) al on true
        left join lateral (
          select count(*) filter (where vo.voto = o.orientacao) as iguais, count(*) as total
          from voto vo join votacao v on v.id = vo.votacao_id
          join orientacao o on o.votacao_id = vo.votacao_id and o.bancada = ${BANCADA_GOVERNO}
          where vo.parlamentar_id = p.id and v.data >= ${ini} and v.data < ${fim}
            and vo.voto in ${POSICOES} and o.orientacao in ${POSICOES}
        ) gov on true
        where a.primeira < ${fim}`);
      linhas += r.count;
    }
    return linhas;
  });
}
