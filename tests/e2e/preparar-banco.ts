// Prepara o banco de teste para os testes de ponta a ponta: o mesmo cenário dos testes de integração, as médias
// calculadas e uma sessão de login pronta (cookie em tests/e2e/comum.ts). Rode antes do build: as páginas
// estáticas (início, índice da busca) são geradas no build a partir deste banco.
import "../integracao/preparar";
import { db, schema, sql } from "@/db/client";
import { calcularEstatisticas } from "@/ingest/estatisticas";
import { criarCenario, prepararBanco } from "../integracao/dados";
import { TOKEN_SESSAO } from "./sessao";

async function main() {
  await prepararBanco();
  await criarCenario();
  await calcularEstatisticas();
  await db.insert(schema.usuario).values({ id: "e2e", email: "e2e@exemplo.com", tokenDescadastro: "e2e" });
  await db
    .insert(schema.sessaoUsuario)
    .values({ sessionToken: TOKEN_SESSAO, userId: "e2e", expires: new Date(Date.now() + 86_400_000) });
  console.log("Banco de teste pronto para os testes de ponta a ponta.");
  await sql.end();
}

main();
