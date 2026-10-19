import { sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API, SENADO_API } from "./fontes";
import { getJson } from "./http";

/** Câmara: GET /proposicoes/{id}/temas -> nomes dos temas (classificação de 32 temas da Câmara). */
export const temasCamara = (r: { dados: { tema: string }[] }) => [...new Set(r.dados.map((t) => t.tema.trim()))];

/**
 * Senado: GET /processo/{id} -> nível mais alto de cada classificação
 * ("Orçamento Público / Orçamento Anual / ..." -> "Orçamento Público").
 */
export const temasSenado = (r: { classificacoes?: { descricaoHierarquia?: string | null }[] | null }) => [
  ...new Set(
    (r.classificacoes ?? []).map((c) => c.descricaoHierarquia?.split(" / ")[0].trim()).filter((t): t is string => !!t),
  ),
];

const FONTES = {
  CD: { url: (ref: string) => `${CAMARA_API}/proposicoes/${ref}/temas`, temas: temasCamara, paralelo: 6 },
  SF: { url: (ref: string) => `${SENADO_API}/processo/${ref}`, temas: temasSenado, paralelo: 4 },
} as const;

/** Busca os temas das matérias votadas que ainda não foram consultadas. Incremental. */
export async function ingerirTemas(): Promise<number> {
  const pendentes = await db.execute<{ casa: "CD" | "SF"; ref: string }>(dsql`
    select distinct v.casa, v.proposicao_ref as ref from votacao v
    where v.proposicao_ref is not null
      and not exists (select 1 from tema_consultado t where t.casa = v.casa and t.proposicao_ref = v.proposicao_ref)`);
  let total = 0;
  for (const casa of ["CD", "SF"] as const) {
    const fonte = FONTES[casa];
    const fila = pendentes.filter((p) => p.casa === casa).map((p) => p.ref);
    await Promise.all(
      Array.from({ length: fonte.paralelo }, async () => {
        for (let ref = fila.shift(); ref; ref = fila.shift()) {
          const temas = fonte.temas(await getJson(fonte.url(ref)));
          await db.transaction(async (tx) => {
            if (temas.length)
              await tx
                .insert(schema.temaProposicao)
                .values(temas.map((tema) => ({ casa, proposicaoRef: ref, tema })))
                .onConflictDoNothing();
            await tx.insert(schema.temaConsultado).values({ casa, proposicaoRef: ref }).onConflictDoNothing();
          });
          total += temas.length;
        }
      }),
    );
  }
  return total;
}
