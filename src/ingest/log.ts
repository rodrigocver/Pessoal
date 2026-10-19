import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";

// Registra cada execução em ingestao_log — é daí que vem o "atualizado em" do site.
export async function comLog(tarefa: string, fn: () => Promise<number>): Promise<number> {
  const [log] = await db.insert(schema.ingestaoLog).values({ tarefa, status: "rodando" }).returning();
  const inicio = Date.now();
  try {
    const registros = await fn();
    await db
      .update(schema.ingestaoLog)
      .set({ status: "ok", registros, finalizadoEm: new Date() })
      .where(eq(schema.ingestaoLog.id, log.id));
    console.log(`✔ ${tarefa}: ${registros} registros em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
    return registros;
  } catch (e) {
    await db
      .update(schema.ingestaoLog)
      .set({ status: "erro", erro: String(e), finalizadoEm: new Date() })
      .where(eq(schema.ingestaoLog.id, log.id));
    console.error(`✘ ${tarefa}:`, e);
    throw e;
  }
}
