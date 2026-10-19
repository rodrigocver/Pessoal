// Uso: npm run ingest -- [tarefa...] [--desde ANO]
//   sem tarefas: roda todas; sem --desde: só o ano corrente (atualização diária).
//   carga histórica: npm run ingest -- --desde 2023
import "dotenv/config";
import { sql } from "@/db/client";
import { comLog } from "@/ingest/log";
import { buscarDeputados, buscarSenadores, salvarParlamentares } from "@/ingest/parlamentares";
import { ingerirDespesas, ingerirPresencas, ingerirProposicoes, ingerirVotacoes } from "@/ingest/camara";
import { ingerirDespesasSenado, ingerirProposicoesSenado, ingerirVotacoesSenado } from "@/ingest/senado";
import { anosDesde } from "@/ingest/util";

const args = process.argv.slice(2);
const iDesde = args.indexOf("--desde");
const anos = iDesde >= 0 ? anosDesde(Number(args[iDesde + 1])) : anosDesde(new Date().getFullYear());
const pedidas = args.filter((a, i) => !a.startsWith("--") && i !== iDesde + 1);

const porAno = (fn: (ano: number) => Promise<number>) => async () => {
  let total = 0;
  for (const ano of anos) total += await fn(ano);
  return total;
};

// A ordem importa: parlamentares primeiro, pois as demais tarefas dependem deles.
const tarefas: Record<string, () => Promise<number>> = {
  deputados: async () => salvarParlamentares(await buscarDeputados()),
  senadores: async () => salvarParlamentares(await buscarSenadores()),
  "camara:presencas": porAno(ingerirPresencas),
  "camara:votacoes": porAno(ingerirVotacoes),
  "camara:proposicoes": porAno(ingerirProposicoes),
  "camara:despesas": porAno(ingerirDespesas),
  "senado:votacoes": porAno(ingerirVotacoesSenado), // inclui o comparecimento
  "senado:proposicoes": porAno(ingerirProposicoesSenado),
  "senado:despesas": porAno(ingerirDespesasSenado),
};

async function main() {
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
