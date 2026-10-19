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
