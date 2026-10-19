// Envia o resumo mensal a quem ativou a opção.
// Uso: npm run resumo-mensal -- [--mes 2026-09] [--para email@x.com] [--reenviar] [--parte 1/4] [--simular]
//   sem --mes: mês anterior. Sem AUTH_RESEND_KEY os e-mails são gravados em .emails/.
//   --parte k/n: envia só a k-ésima de n partes dos usuários (vários jobs em paralelo).
//   --simular: monta todos os e-mails sem enviar nem registrar (ensaio e medição de tempo).
//
// Feito para milhões de usuários: o resumo de cada parlamentar é calculado uma vez e reaproveitado (são ~600
// parlamentares, não um cálculo por usuário); usuários são lidos em páginas, com as listas de todos numa consulta
// só; e-mails saem em lotes de 100 pela API de lote do Resend.
import "dotenv/config";
import { and, eq, gt, inArray, sql as s } from "drizzle-orm";
import { db, schema, sql } from "@/db/client";
import { listasDosUsuarios, type Parlamentar } from "@/lib/consultas";
import { resumoDoMes } from "@/lib/resumoMensal";
import { mesAnterior } from "@/lib/periodo";
import { renderResumoMensal } from "@/emails/resumoMensal";
import { baseUrl, enviarEmails, TAMANHO_LOTE_EMAIL, urlDescadastro, urlDescadastroUmClique } from "@/lib/email";
import { emLotes, lerParte, memorizar } from "@/lib/lotes";

const args = process.argv.slice(2);
const arg = (nome: string) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const mes = arg("--mes") ?? mesAnterior();
const para = arg("--para");
const reenviar = args.includes("--reenviar");
const parte = lerParte(arg("--parte"));
const simular = args.includes("--simular");
const PAGINA = 1000;

async function main() {
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error(`--mes inválido: ${mes} (use AAAA-MM)`);
  const { usuario, envioResumo } = schema;
  const resumo = memorizar(
    (p: Parlamentar) => resumoDoMes(p, mes),
    (p) => p.id,
  );

  let ultimo = "";
  let enviados = 0;
  let falhas = 0;
  for (;;) {
    const pagina = await db
      .select({ id: usuario.id, email: usuario.email, token: usuario.tokenDescadastro })
      .from(usuario)
      .where(
        and(
          eq(usuario.resumoMensal, true),
          gt(usuario.id, ultimo),
          para ? eq(usuario.email, para) : undefined,
          // Cada usuário cai sempre na mesma parte.
          parte.total > 1
            ? s`((hashtext(${usuario.id})::bigint % ${parte.total}) + ${parte.total}) % ${parte.total} = ${parte.indice}`
            : undefined,
        ),
      )
      .orderBy(usuario.id)
      .limit(PAGINA);
    if (pagina.length === 0) break;
    ultimo = pagina.at(-1)!.id;

    const jaEnviados = reenviar
      ? new Set<string>()
      : new Set(
          (
            await db
              .select({ id: envioResumo.usuarioId })
              .from(envioResumo)
              .where(
                and(
                  eq(envioResumo.mes, mes),
                  inArray(
                    envioResumo.usuarioId,
                    pagina.map((u) => u.id),
                  ),
                ),
              )
          ).map((x) => x.id),
        );
    const pendentes = pagina.filter((u) => u.email && !jaEnviados.has(u.id));
    const listas = await listasDosUsuarios(pendentes.map((u) => u.id));

    const emails = [];
    for (const u of pendentes) {
      const lista = listas.get(u.id) ?? [];
      if (lista.length === 0) continue;
      const corpo = renderResumoMensal({
        mes,
        resumos: await Promise.all(lista.map(resumo)),
        baseUrl: baseUrl(),
        urlDescadastro: urlDescadastro(u.token),
      });
      emails.push({
        usuarioId: u.id,
        email: { para: u.email!, ...corpo, urlDescadastroUmClique: urlDescadastroUmClique(u.token) },
      });
    }

    for (const lote of emLotes(emails, TAMANHO_LOTE_EMAIL)) {
      if (simular) {
        enviados += lote.length;
        continue;
      }
      try {
        await enviarEmails(lote.map((x) => x.email));
        await db
          .insert(envioResumo)
          .values(lote.map((x) => ({ usuarioId: x.usuarioId, mes })))
          .onConflictDoNothing();
        enviados += lote.length;
      } catch (e) {
        falhas += lote.length; // segue para os próximos; quem falhou recebe na próxima execução
        console.error(`✘ lote de ${lote.length} e-mails:`, e);
      }
    }
    console.log(`… ${enviados} enviados, ${falhas} falhas (até o usuário ${ultimo})`);
  }
  console.log(
    `Resumo de ${mes} (parte ${parte.indice + 1}/${parte.total})${simular ? " [simulação]" : ""}: ` +
      `${enviados} ${simular ? "montados" : "enviados"}, ${falhas} falhas.`,
  );
  await sql.end();
  process.exit(falhas ? 1 : 0);
}

main();
