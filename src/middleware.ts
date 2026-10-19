import { NextResponse, type NextRequest } from "next/server";

// Marca respostas de quem está logado. O service worker (public/sw.js) não guarda essas páginas
// no cache offline: elas mostram quem o usuário acompanha e não devem ficar no aparelho.
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const logado = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
  if (logado) res.headers.set("x-fiscaliza-sessao", "1");
  return res;
}

export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
