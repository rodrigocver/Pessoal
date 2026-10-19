import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { idsSeguidos } from "@/lib/consultas";
import { COOKIE_LOGADO } from "@/lib/cookies";

// Única parte por usuário das páginas públicas: quem está logado e quem acompanha. Nunca vai para a CDN.
export const dynamic = "force-dynamic";

export async function GET() {
  const sessao = await auth();
  const id = sessao?.user?.id;
  const res = NextResponse.json(
    { logado: !!id, seguidos: id ? [...(await idsSeguidos(id))] : [] },
    { headers: { "Cache-Control": "private, no-store" } },
  );
  // Sessão expirada: apaga o aviso para o navegador parar de perguntar.
  if (!id) res.cookies.delete(COOKIE_LOGADO);
  return res;
}
