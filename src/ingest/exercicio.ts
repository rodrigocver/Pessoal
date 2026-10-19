import { eq, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API, SENADO_API, PRIMEIRA_LEGISLATURA, inicioLegislatura } from "./fontes";
import { getJson } from "./http";
import { comoLista } from "./parlamentares";
import { lotes } from "./util";
import {
  afastamentosCamara,
  afastamentosSenado,
  casarSuplentesCamara,
  entradasSuplenteCamara,
  substituicoesSenado,
  type Afastamento,
  type Substituicao,
} from "./afastamentos";

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
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno, nome: schema.parlamentar.nome })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, casa));
}

export async function ingerirExercicioCamara(): Promise<number> {
  const deputados = await parlamentaresDaCasa("CD");
  const historicos = new Map<string, { id: number; nome: string; eventos: EventoHistoricoApi[] }>();
  let total = 0;
  await paraCada(deputados, 6, async ({ id, ext, nome }) => {
    const url = `${CAMARA_API}/deputados/${ext}/historico`;
    const { dados } = await getJson<{ dados: EventoHistoricoApi[] }>(url);
    historicos.set(ext, { id, nome, eventos: dados });
    const periodos = periodosExercicioCamara(dados);
    await salvar(id, periodos, url);
    total += periodos.length;
  });

  // Afastamentos dos titulares e o suplente que ocupou cada vaga (casado pelas datas: ver afastamentos.ts).
  const afastamentos = [...historicos].flatMap(([ext, h]) =>
    afastamentosCamara(h.eventos).map((a) => ({ ...a, titularRef: ext })),
  );
  const entradas = [...historicos].flatMap(([ext, h]) =>
    entradasSuplenteCamara(h.eventos).map((e) => ({ ...e, suplenteRef: ext, suplenteNome: h.nome })),
  );
  const substituicoes = casarSuplentesCamara(afastamentos, entradas);
  await salvarAfastamentos(
    "CD",
    afastamentos.map((a) => ({ ...a, substituicoes: substituicoes.get(a) ?? [] })),
    (ext) => `${CAMARA_API}/deputados/${ext}/historico`,
  );
  return total;
}

export async function ingerirExercicioSenado(): Promise<number> {
  const senadores = await parlamentaresDaCasa("SF");
  const mandatosPorSenador = new Map<string, MandatoApi[]>();
  let total = 0;
  await paraCada(senadores, 4, async ({ id, ext }) => {
    const url = `${SENADO_API}/senador/${ext}/mandatos.json`;
    const r = await getJson<{
      MandatoParlamentar: { Parlamentar: { Mandatos?: { Mandato?: MandatoApi | MandatoApi[] } } };
    }>(url);
    const mandatos = comoLista(r.MandatoParlamentar.Parlamentar.Mandatos?.Mandato);
    mandatosPorSenador.set(ext, mandatos);
    const periodos = periodosExercicioSenado(mandatos);
    await salvar(id, periodos, url);
    total += periodos.length;
  });

  // No Senado o mandato lista os suplentes; quem esteve em exercício no afastamento ocupou a vaga.
  const exerciciosPorSuplente = new Map([...mandatosPorSenador].map(([ext, m]) => [ext, periodosExercicioSenado(m)]));
  const afastamentos = [...mandatosPorSenador].flatMap(([ext, m]) =>
    afastamentosSenado(m).map((a) => ({
      ...a,
      titularRef: ext,
      substituicoes: substituicoesSenado(a, exerciciosPorSuplente),
    })),
  );
  await salvarAfastamentos("SF", afastamentos, (ext) => `${SENADO_API}/senador/${ext}/mandatos.json`);
  return total;
}

/** Substitui afastamentos e substituições da casa pelos recém-calculados. */
async function salvarAfastamentos(
  casa: "CD" | "SF",
  lista: (Afastamento & { titularRef: string; substituicoes: Substituicao[] })[],
  fonte: (ext: string) => string,
) {
  const ids = new Map((await parlamentaresDaCasa(casa)).map((p) => [p.ext, p.id]));
  await db.transaction(async (tx) => {
    const daCasa = dsql`(select id from parlamentar where casa = ${casa})`;
    await tx.execute(dsql`delete from substituicao where titular_id in ${daCasa}`);
    await tx.execute(dsql`delete from afastamento where parlamentar_id in ${daCasa}`);
    const afs = lista.flatMap((a) => {
      const parlamentarId = ids.get(a.titularRef);
      return parlamentarId
        ? [
            {
              parlamentarId,
              inicio: a.inicio,
              fim: a.fim,
              motivo: a.motivo,
              definitivo: a.definitivo,
              fonteUrl: fonte(a.titularRef),
            },
          ]
        : [];
    });
    for (const lote of lotes(afs, 1000)) await tx.insert(schema.afastamento).values(lote).onConflictDoNothing();
    const subs = lista.flatMap((a) => {
      const titularId = ids.get(a.titularRef);
      if (!titularId) return [];
      return a.substituicoes.map((s) => ({
        titularId,
        afastamentoInicio: a.inicio,
        suplenteId: ids.get(s.suplenteRef) ?? null,
        suplenteNome: s.suplenteNome,
        inicio: s.inicio,
        fim: s.fim,
        certeza: s.certeza,
      }));
    });
    for (const lote of lotes(subs, 1000)) await tx.insert(schema.substituicao).values(lote);
  });
}

/** Recalcula a visão usada nas métricas de presença. */
export const atualizarJanelaExercicio = () => db.execute(dsql`refresh materialized view janela_exercicio`);
