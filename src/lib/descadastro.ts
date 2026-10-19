import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

/** Desativa o resumo mensal pelo token do e-mail. Devolve se o token era válido. */
export async function descadastrarPorToken(token: string): Promise<boolean> {
  if (!token) return false;
  const r = await db
    .update(schema.usuario)
    .set({ resumoMensal: false })
    .where(eq(schema.usuario.tokenDescadastro, token))
    .returning({ id: schema.usuario.id });
  return r.length > 0;
}
