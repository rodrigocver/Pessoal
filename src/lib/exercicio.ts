import { sql, type SQL } from "drizzle-orm";

/**
 * A sessão entra no cálculo de presença do parlamentar? Expressão única usada pelo perfil
 * (consultas.ts) e pelas médias (estatisticas.ts), para que as duas sigam a mesma definição
 * (docs/METRICAS.md). Conta a sessão quando:
 * - já aconteceu e já tem alguma presença publicada (lista ainda não divulgada não vira falta de todos);
 * - o parlamentar estava em exercício (visão janela_exercicio, definida na migração que a cria).
 */
export const sessaoConta = (parlamentarId: SQL | number, sessaoId: SQL, inicioSessao: SQL) => sql`(
  ${inicioSessao} <= now()
  and exists (select 1 from presenca x where x.sessao_id = ${sessaoId})
  and exists (
    select 1 from janela_exercicio j
    where j.parlamentar_id = ${parlamentarId}
      and ${inicioSessao} >= j.inicio and ${inicioSessao} < coalesce(j.fim, 'infinity')
  )
)`;

/**
 * A reunião de comissão entra na presença em comissões do parlamentar? Mesma ideia de `sessaoConta`:
 * já aconteceu, tem presença publicada, o parlamentar estava em exercício e era membro titular
 * (qualquer cargo menos suplente) daquela comissão na data.
 */
export const reuniaoConta = (parlamentarId: SQL | number, reuniao: { id: SQL; orgaoId: SQL; inicio: SQL }) => sql`(
  ${reuniao.inicio} <= now()
  and exists (select 1 from presenca_reuniao x where x.reuniao_id = ${reuniao.id})
  and exists (
    select 1 from membro_orgao m
    where m.parlamentar_id = ${parlamentarId} and m.orgao_id = ${reuniao.orgaoId} and m.cargo <> 'Suplente'
      and (${reuniao.inicio} at time zone 'America/Sao_Paulo')::date >= m.inicio
      and (m.fim is null or (${reuniao.inicio} at time zone 'America/Sao_Paulo')::date <= m.fim)
  )
  and exists (
    select 1 from janela_exercicio j
    where j.parlamentar_id = ${parlamentarId}
      and ${reuniao.inicio} >= j.inicio and ${reuniao.inicio} < coalesce(j.fim, 'infinity')
  )
)`;
