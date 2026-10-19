// Envia o resumo mensal a quem ativou a opção.
// Uso: npm run resumo-mensal -- [--mes 2026-09] [--para email@x.com] [--reenviar]
//   sem --mes: mês anterior. Sem AUTH_RESEND_KEY os e-mails são gravados em .emails/.
import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { db, schema, sql } from "@/db/client";
import { listaDoUsuario } from "@/lib/consultas";
import { resumoDoMes } from "@/lib/resumoMensal";
import { mesAnterior } from "@/lib/periodo";
import { renderResumoMensal } from "@/emails/resumoMensal";
import { baseUrl, enviarEmail, urlDescadastro, urlDescadastroUmClique } from "@/lib/email";

const args = process.argv.slice(2);
const arg = (nome: string) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const mes = arg("--mes") ?? mesAnterior();
const para = arg("--para");
const reenviar = args.includes("--reenviar");

async function main() {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error(`--mes inválido: ${mes} (use AAAA-MM)`);
  const usuarios = await db
    .select()
    .from(schema.usuario)
    .where(and(eq(schema.usuario.resumoMensal, true), para ? eq(schema.usuario.email, para) : undefined));

  let enviados = 0;
  let falhas = 0;
  for (const u of usuarios) {
    if (!u.email) continue;
    if (!reenviar) {
      const [ja] = await db
        .select()
        .from(schema.envioResumo)
        .where(and(eq(schema.envioResumo.usuarioId, u.id), eq(schema.envioResumo.mes, mes)));
      if (ja) continue;
    }
    const lista = await listaDoUsuario(u.id);
    if (lista.length === 0) continue;
    try {
      const resumos = await Promise.all(lista.map((p) => resumoDoMes(p, mes)));
      const email = renderResumoMensal({
        mes,
        resumos,
        baseUrl: baseUrl(),
        urlDescadastro: urlDescadastro(u.tokenDescadastro),
      });
      const id = await enviarEmail({
        para: u.email,
        ...email,
        urlDescadastroUmClique: urlDescadastroUmClique(u.tokenDescadastro),
      });
      await db.insert(schema.envioResumo).values({ usuarioId: u.id, mes }).onConflictDoNothing();
      enviados++;
      console.log(`✔ ${u.email}: ${id}`);
    } catch (e) {
      falhas++; // segue para os próximos; quem falhou recebe na próxima execução
      console.error(`✘ ${u.email}:`, e);
    }
  }
  console.log(`Resumo de ${mes}: ${enviados} enviados, ${falhas} falhas.`);
  await sql.end();
  process.exit(falhas ? 1 : 0);
}

main();
