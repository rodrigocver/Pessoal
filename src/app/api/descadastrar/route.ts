import { descadastrarPorToken } from "@/lib/descadastro";

// Descadastro "com um clique" (RFC 8058): o cliente de e-mail faz POST nesta URL.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = await descadastrarPorToken(token);
  return new Response(ok ? "ok" : "token inválido", { status: ok ? 200 : 404 });
}
