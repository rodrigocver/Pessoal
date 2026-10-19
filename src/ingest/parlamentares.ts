import { sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { getJson } from "./http";
import { CAMARA_API, SENADO_API, LEGISLATURA_ATUAL } from "./fontes";

type NovoParlamentar = typeof schema.parlamentar.$inferInsert;

// ---------- Câmara ----------

interface DeputadoApi {
  id: number;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  urlFoto: string | null;
  email: string | null;
}

async function paginasCamara<T>(path: string): Promise<T[]> {
  const itens: T[] = [];
  let url: string | undefined = `${CAMARA_API}${path}${path.includes("?") ? "&" : "?"}itens=100`;
  while (url) {
    const res: { dados: T[]; links: { rel: string; href: string }[] } = await getJson(url);
    itens.push(...res.dados);
    url = res.links.find((l) => l.rel === "next")?.href;
  }
  return itens;
}

export function mapDeputado(d: DeputadoApi, emExercicio: boolean): NovoParlamentar {
  return {
    casa: "CD",
    idExterno: String(d.id),
    nome: d.nome,
    partido: d.siglaPartido,
    uf: d.siglaUf,
    fotoUrl: d.urlFoto,
    email: d.email,
    emExercicio,
    fonteUrl: `${CAMARA_API}/deputados/${d.id}`,
  };
}

export async function buscarDeputados(): Promise<NovoParlamentar[]> {
  // Todos que passaram pela legislatura (inclui suplentes que já saíram) + quem está em exercício hoje.
  const [legislatura, atuais] = await Promise.all([
    paginasCamara<DeputadoApi>(`/deputados?idLegislatura=${LEGISLATURA_ATUAL}`),
    paginasCamara<DeputadoApi>(`/deputados`),
  ]);
  const ativos = new Set(atuais.map((d) => d.id));
  const porId = new Map<number, DeputadoApi>();
  for (const d of legislatura) porId.set(d.id, d);
  for (const d of atuais) porId.set(d.id, d); // dados atuais têm prioridade (partido pode ter mudado)
  return [...porId.values()].map((d) => mapDeputado(d, ativos.has(d.id)));
}

// ---------- Senado ----------

export interface SenadorApi {
  IdentificacaoParlamentar: {
    CodigoParlamentar: string;
    NomeParlamentar: string;
    NomeCompletoParlamentar?: string;
    UrlFotoParlamentar?: string;
    EmailParlamentar?: string;
    SiglaPartidoParlamentar?: string;
    UfParlamentar?: string;
  };
}

export function mapSenador(s: SenadorApi, emExercicio: boolean): NovoParlamentar {
  const p = s.IdentificacaoParlamentar;
  return {
    casa: "SF",
    idExterno: p.CodigoParlamentar,
    nome: p.NomeParlamentar,
    nomeCompleto: p.NomeCompletoParlamentar ?? null,
    partido: p.SiglaPartidoParlamentar ?? null,
    uf: p.UfParlamentar ?? null,
    fotoUrl: p.UrlFotoParlamentar?.replace(/^http:/, "https:") ?? null,
    email: p.EmailParlamentar ?? null,
    emExercicio,
    fonteUrl: `${SENADO_API}/senador/${p.CodigoParlamentar}`,
  };
}

// O Senado devolve um objeto quando há um só item e uma lista quando há vários.
export const comoLista = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

export async function buscarSenadores(): Promise<NovoParlamentar[]> {
  const [atual, legislatura] = await Promise.all([
    getJson<{ ListaParlamentarEmExercicio: { Parlamentares: { Parlamentar: SenadorApi | SenadorApi[] } } }>(
      `${SENADO_API}/senador/lista/atual.json`,
    ),
    getJson<{ ListaParlamentarLegislatura: { Parlamentares: { Parlamentar: SenadorApi | SenadorApi[] } } }>(
      `${SENADO_API}/senador/lista/legislatura/${LEGISLATURA_ATUAL}.json`,
    ),
  ]);
  const atuais = comoLista(atual.ListaParlamentarEmExercicio.Parlamentares.Parlamentar);
  const ativos = new Set(atuais.map((s) => s.IdentificacaoParlamentar.CodigoParlamentar));
  const porId = new Map<string, SenadorApi>();
  for (const s of comoLista(legislatura.ListaParlamentarLegislatura.Parlamentares.Parlamentar))
    porId.set(s.IdentificacaoParlamentar.CodigoParlamentar, s);
  for (const s of atuais) porId.set(s.IdentificacaoParlamentar.CodigoParlamentar, s);
  return [...porId.values()].map((s) => mapSenador(s, ativos.has(s.IdentificacaoParlamentar.CodigoParlamentar)));
}

// ---------- Gravação ----------

export async function salvarParlamentares(lista: NovoParlamentar[]): Promise<number> {
  if (lista.length === 0) return 0;
  const casa = lista[0].casa;
  await db.transaction(async (tx) => {
    // Quem não está mais em exercício perde a marca; os registros históricos são mantidos.
    await tx.update(schema.parlamentar).set({ emExercicio: false }).where(dsql`${schema.parlamentar.casa} = ${casa}`);
    await tx
      .insert(schema.parlamentar)
      .values(lista)
      .onConflictDoUpdate({
        target: [schema.parlamentar.casa, schema.parlamentar.idExterno],
        set: {
          nome: dsql`excluded.nome`,
          nomeCompleto: dsql`coalesce(excluded.nome_completo, ${schema.parlamentar.nomeCompleto})`,
          partido: dsql`excluded.partido`,
          uf: dsql`excluded.uf`,
          fotoUrl: dsql`excluded.foto_url`,
          email: dsql`excluded.email`,
          emExercicio: dsql`excluded.em_exercicio`,
          atualizadoEm: dsql`now()`,
        },
      });
  });
  return lista.length;
}
