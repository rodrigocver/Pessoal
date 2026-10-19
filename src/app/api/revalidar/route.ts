import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Chamado pela ingestão diária: marca todas as páginas em cache como desatualizadas. Cada uma é refeita no
 *  primeiro acesso seguinte (quem chega antes recebe a versão anterior), então o banco não recebe um pico. */
export async function POST(req: Request) {
  const segredo = process.env.REVALIDAR_SEGREDO;
  const enviado = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!segredo || !igual(enviado, segredo)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, em: new Date().toISOString() });
}
