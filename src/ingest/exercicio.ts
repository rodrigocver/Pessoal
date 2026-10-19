import { eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API, SENADO_API, PRIMEIRA_LEGISLATURA, inicioLegislatura } from "./fontes";
import { getJson } from "./http";
import { comoLista } from "./parlamentares";

export interface Periodo {
  inicio: Date;
  fim: Date | null;
}

// ---------- Câmara: GET /deputados/{id}/historico ----------

export interface EventoHistoricoApi {
  idLegislatura: number;
  dataHora: string;
  situacao: string | null;
  descricaoStatus: string | null;
}

/**
 * Converte o histórico em períodos de exercício. A descrição diz se o evento é "Entrada" (posse,
 * reassunção) ou "Saída" (licença, afastamento, fim de mandato). O campo `situacao` não é confiável:
 * há reassunções registradas como "CONVOCADO".
 */
export function periodosExercicioCamara(eventos: EventoHistoricoApi[]): Periodo[] {
  const ordenados = eventos
    .filter((e) => e.idLegislatura >= PRIMEIRA_LEGISLATURA && e.descricaoStatus)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  const periodos: Periodo[] = [];
  let aberto: Periodo | null = null;
  for (const e of ordenados) {
    const quando = new Date(`${e.dataHora}-03:00`);
    if (/(^|\/\s*)Entrada\b/.test(e.descricaoStatus!) && !aberto) {
      aberto = { inicio: quando, fim: null };
      periodos.push(aberto);
    } else if (/^Saída\b/.test(e.descricaoStatus!) && aberto) {
      aberto.fim = quando;
      aberto = null;
    }
  }
  return periodos;
}

// ---------- Senado: GET /senador/{codigo}/mandatos.json ----------

interface ExercicioApi {
  DataInicio?: string;
  DataFim?: string;
}
export interface MandatoApi {
  Exercicios?: { Exercicio?: ExercicioApi | ExercicioApi[] };
}

/** Exercícios de todos os mandatos que alcançam as legislaturas com dados. */
export function periodosExercicioSenado(mandatos: MandatoApi[]): Periodo[] {
  const corte = inicioLegislatura(PRIMEIRA_LEGISLATURA);
  return mandatos
    .flatMap((m) => comoLista(m.Exercicios?.Exercicio))
    .filter((e) => e.DataInicio)
    .map((e) => ({
      inicio: new Date(`${e.DataInicio}T00:00:00-03:00`),
      // DataFim é o último dia em exercício: o período vai até o fim desse dia.
      fim: e.DataFim ? new Date(new Date(`${e.DataFim}T00:00:00-03:00`).getTime() + 24 * 3600 * 1000) : null,
    }))
    .filter((p) => p.fim == null || p.fim > corte)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

// ---------- Gravação ----------

async function paraCada<T>(itens: T[], paralelo: number, fn: (item: T) => Promise<void>) {
  const fila = [...itens];
  await Promise.all(
    Array.from({ length: paralelo }, async () => {
      for (let item = fila.shift(); item; item = fila.shift()) await fn(item);
    }),
  );
}

async function salvar(parlamentarId: number, periodos: Periodo[], fonteUrl: string) {
  await db.transaction(async (tx) => {
    await tx.delete(schema.exercicio).where(eq(schema.exercicio.parlamentarId, parlamentarId));
    if (periodos.length)
      await tx
        .insert(schema.exercicio)
        .values(periodos.map((p) => ({ parlamentarId, inicio: p.inicio, fim: p.fim, fonteUrl })))
        .onConflictDoNothing();
  });
}

async function parlamentaresDaCasa(casa: "CD" | "SF") {
  return db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, casa));
}

export async function ingerirExercicioCamara(): Promise<number> {
  let total = 0;
  await paraCada(await parlamentaresDaCasa("CD"), 6, async ({ id, ext }) => {
    const url = `${CAMARA_API}/deputados/${ext}/historico`;
    const { dados } = await getJson<{ dados: EventoHistoricoApi[] }>(url);
    const periodos = periodosExercicioCamara(dados);
    await salvar(id, periodos, url);
    total += periodos.length;
  });
  return total;
}

export async function ingerirExercicioSenado(): Promise<number> {
  let total = 0;
  await paraCada(await parlamentaresDaCasa("SF"), 4, async ({ id, ext }) => {
    const url = `${SENADO_API}/senador/${ext}/mandatos.json`;
    const r = await getJson<{
      MandatoParlamentar: { Parlamentar: { Mandatos?: { Mandato?: MandatoApi | MandatoApi[] } } };
    }>(url);
    const periodos = periodosExercicioSenado(comoLista(r.MandatoParlamentar.Parlamentar.Mandatos?.Mandato));
    await salvar(id, periodos, url);
    total += periodos.length;
  });
  return total;
}

/** Recalcula a visão usada nas métricas de presença. */
export const atualizarJanelaExercicio = () => db.execute(dsql`refresh materialized view janela_exercicio`);
