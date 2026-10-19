import type { MetadataRoute } from "next";
import { db, schema } from "@/db/client";
import { baseUrl } from "@/lib/email";
import { urlParlamentar } from "@/lib/formato";

// Lido do banco e guardado por uma hora (robôs pedem com frequência).
export const revalidate = 3600;

const FIXAS = ["/", "/buscar", "/metodologia", "/status"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const parlamentares = await db
    .select({ casa: schema.parlamentar.casa, idExterno: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .orderBy(schema.parlamentar.casa, schema.parlamentar.idExterno);
  return [
    ...FIXAS.map((caminho) => ({ url: `${base}${caminho === "/" ? "" : caminho}` })),
    ...parlamentares.map((p) => ({ url: `${base}${urlParlamentar(p)}` })),
  ];
}
