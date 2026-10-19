import type { MetadataRoute } from "next";
import { db, schema } from "@/db/client";
import { baseUrl } from "@/lib/email";
import { urlParlamentar } from "@/lib/formato";

// Gerado a cada pedido, a partir do banco (o build não depende do banco).
export const dynamic = "force-dynamic";

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
