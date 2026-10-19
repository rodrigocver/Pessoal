import { NextResponse, type NextRequest } from "next/server";
import { caminhoComparar, caminhoPerfil } from "@/lib/caminhos";
import { COOKIE_LOGADO } from "@/lib/cookies";

const PERFIL = /^\/parlamentar\/(camara|senado)\/([^/]+)$/;

/** Endereços antigos, com filtros em "?aba=..." (links compartilhados, e-mails já enviados), apontam para o caminho
 *  equivalente, que fica em cache na CDN. `null` se não for um deles. */
function enderecoAntigo(pathname: string, q: URLSearchParams): string | null {
  const perfil = PERFIL.exec(pathname);
  if (perfil && ["aba", "periodo", "pagina", "tema"].some((k) => q.has(k))) {
    const p = { casa: perfil[1] === "camara" ? ("CD" as const) : ("SF" as const), idExterno: perfil[2] };
    const f = {
      aba: q.get("aba") ?? "",
      periodo: q.get("periodo") ?? "",
      pagina: q.get("pagina") ?? "",
      tema: q.get("tema") ?? "",
    };
    // Sem período no endereço antigo: o atual ("" vira o padrão da página).
    return caminhoPerfil(p, f, String(new Date().getFullYear()));
  }
  if (pathname === "/comparar" && (q.has("a") || q.has("b"))) {
    const destino = caminhoComparar(q.get("a") ?? undefined, q.get("b") ?? undefined, q.get("periodo") ?? undefined);
    return q.get("q") ? `${destino}?q=${encodeURIComponent(q.get("q")!)}` : destino;
  }
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const logado = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");

  const antigo = enderecoAntigo(pathname, searchParams);
  let res: NextResponse;
  if (antigo) res = NextResponse.redirect(new URL(antigo, req.url), 308);
  else if (pathname === "/" && logado && !searchParams.has("conta-excluida"))
    res = NextResponse.redirect(new URL("/minha-lista", req.url));
  else res = NextResponse.next();

  // Só escreve o cookie de aviso quando muda: respostas com Set-Cookie não são guardadas pela CDN.
  const marcado = req.cookies.get(COOKIE_LOGADO)?.value === "1";
  if (logado && !marcado)
    res.cookies.set(COOKIE_LOGADO, "1", { path: "/", sameSite: "lax", secure: req.nextUrl.protocol === "https:" });
  if (!logado && marcado) res.cookies.delete(COOKIE_LOGADO);
  return res;
}

export const config = { matcher: ["/((?!_next/|api/|.*\\..*).*)"] };
