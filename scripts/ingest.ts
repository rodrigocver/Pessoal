// Uso: npm run ingest -- <tarefa...>   (sem argumentos roda todas)
import "dotenv/config";
import { sql } from "@/db/client";
import { comLog } from "@/ingest/log";
import { buscarDeputados, buscarSenadores, salvarParlamentares } from "@/ingest/parlamentares";

const tarefas: Record<string, () => Promise<number>> = {
  deputados: async () => salvarParlamentares(await buscarDeputados()),
  senadores: async () => salvarParlamentares(await buscarSenadores()),
};

async function main() {
  const pedidas = process.argv.slice(2);
  const nomes = pedidas.length ? pedidas : Object.keys(tarefas);
  const desconhecidas = nomes.filter((n) => !tarefas[n]);
  if (desconhecidas.length) {
    console.error(`Tarefas desconhecidas: ${desconhecidas.join(", ")}. Disponíveis: ${Object.keys(tarefas).join(", ")}`);
    process.exit(1);
  }
  let falhou = false;
  for (const nome of nomes) {
    try {
      await comLog(nome, tarefas[nome]);
    } catch {
      falhou = true; // segue com as demais; o log guarda o erro
    }
  }
  await sql.end();
  process.exit(falhou ? 1 : 0);
}

main();
