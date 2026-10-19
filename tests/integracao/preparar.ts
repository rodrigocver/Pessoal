// Aponta o cliente do banco para o banco de teste ANTES de qualquer import de "@/db/client".
const url = process.env.DATABASE_URL_TESTE ?? "postgres://fiscaliza:fiscaliza@localhost:5432/fiscaliza_teste";
// Proteção: os testes apagam tabelas. Nunca rode contra um banco que não seja de teste.
if (!/_teste(\?|$)/.test(new URL(url).pathname + new URL(url).search))
  throw new Error(`DATABASE_URL_TESTE precisa apontar para um banco cujo nome termina em "_teste" (recebido: ${url})`);
process.env.DATABASE_URL = url;
