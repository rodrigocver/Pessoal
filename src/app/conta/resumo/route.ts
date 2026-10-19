import { auth } from "@/auth";
import { listaDoUsuario } from "@/lib/consultas";
import { resumoDoMes } from "@/lib/resumoMensal";
import { mesAnterior } from "@/lib/periodo";
import { renderResumoMensal } from "@/emails/resumoMensal";
import { baseUrl, urlDescadastro } from "@/lib/email";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";

// Pré-visualização do resumo mensal do usuário logado: /conta/resumo?mes=2026-09
export async function GET(req: Request) {
  const sessao = await auth();
  if (!sessao?.user?.id) return Response.redirect(new URL("/entrar", req.url));
  const pedido = new URL(req.url).searchParams.get("mes");
  const mes = pedido && /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAnterior();
  const [u] = await db.select().from(schema.usuario).where(eq(schema.usuario.id, sessao.user.id));
  const lista = await listaDoUsuario(u.id);
  const resumos = await Promise.all(lista.map((p) => resumoDoMes(p, mes)));
  const { html } = renderResumoMensal({
    mes,
    resumos,
    baseUrl: baseUrl(),
    urlDescadastro: urlDescadastro(u.tokenDescadastro),
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
