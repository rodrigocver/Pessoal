// Dados de exemplo para quem vai contribuir: o mesmo cenário dos testes (Ana Souza, Beto Lima, Carla Dias,
// Davi Rocha, votações de 2025...), carregado em segundos, sem depender das APIs do governo.
// Uso: npm run exemplo            (só num banco vazio; nunca apaga dados reais)
//      npm run exemplo -- --forcar (apaga o banco de desenvolvimento e carrega o exemplo)
// Para dados reais, use npm run ingest (ver README).
import "dotenv/config";
import { sql as q } from "drizzle-orm";
import { db, schema, sql } from "@/db/client";
import { calcularEstatisticas } from "@/ingest/estatisticas";
import { criarCenario, prepararBanco } from "../tests/integracao/dados";

/** No Codespaces o banco sobe junto com o ambiente: espera até 60 s por ele. */
async function esperarBanco() {
  for (let i = 1; ; i++) {
    try {
      await sql`select 1`;
      return;
    } catch (e) {
      if (i >= 60) throw e;
      if (i === 1) console.log("Esperando o banco de dados ligar…");
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function main() {
  await esperarBanco();
  const forcar = process.argv.includes("--forcar");
  const [{ n }] = await db
    .select({ n: q<number>`count(*)::int` })
    .from(schema.parlamentar)
    .catch(() => [{ n: 0 }]); // tabelas ainda não criadas: prepararBanco cria
  if (n > 0 && !forcar) {
    console.log(
      `O banco já tem ${n} parlamentares; nada foi alterado. Para trocar pelo exemplo: npm run exemplo -- --forcar`,
    );
  } else {
    await prepararBanco();
    await criarCenario();
    await calcularEstatisticas();
    await db.insert(schema.ingestaoLog).values({
      tarefa: "exemplo",
      status: "ok",
      iniciadoEm: new Date(),
      finalizadoEm: new Date(),
      registros: 4,
    });
    console.log("Dados de exemplo carregados. Rode npm run dev e abra http://localhost:3000/buscar");
  }
  await sql.end();
}

main();
