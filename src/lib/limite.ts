import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db/client";

export const LIMITES_LOGIN = {
  porEmail: { maximo: 3, minutos: 15 },
  porIp: { maximo: 10, minutos: 15 },
};

/**
 * Registra uma tentativa para `chave` e diz se ela ainda está dentro do limite.
 * Tentativas recusadas não são registradas, para não prolongar o bloqueio indefinidamente.
 */
export async function dentroDoLimite(chave: string, { maximo, minutos }: { maximo: number; minutos: number }) {
  const desde = new Date(Date.now() - minutos * 60_000);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.tentativaLogin)
    .where(and(eq(schema.tentativaLogin.chave, chave), gte(schema.tentativaLogin.criadoEm, desde)));
  if (n >= maximo) return false;
  await db.insert(schema.tentativaLogin).values({ chave });
  // Limpeza oportunista: tentativas com mais de um dia não servem para nada.
  await db.delete(schema.tentativaLogin).where(lt(schema.tentativaLogin.criadoEm, new Date(Date.now() - 86_400_000)));
  return true;
}

/** Normaliza o e-mail para que variações de maiúsculas e espaços contem como o mesmo endereço. */
export const normalizarEmail = (email: string) => email.trim().toLowerCase();
