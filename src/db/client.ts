import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida (veja .env.example)");

// Reaproveita a conexão entre recargas do Next.js em desenvolvimento.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
// Poolers em modo transação (Supabase porta 6543, PgBouncer) não suportam prepared statements.
const viaPooler = /:6543\b|pgbouncer=true/.test(url);
// Em funções serverless (Vercel), cada instância abre o próprio pool; com centenas de instâncias, poucas conexões
// por instância e o pooler do Supabase seguram a carga (DATABASE_POOL_MAX=3; ver docs/ESCALA.md).
const max = Number(process.env.DATABASE_POOL_MAX) || 10;
export const sql = globalForDb.sql ?? postgres(url, { max, prepare: !viaPooler });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
