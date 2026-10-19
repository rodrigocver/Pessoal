import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, temGoogle } from "@/auth";
import { entrarComEmail, entrarComGoogle } from "@/app/acoes";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar() {
  if ((await auth())?.user) redirect("/minha-lista");
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-8">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <>
        <p className="text-sm text-suave">Sem senha: você recebe um link de acesso por e-mail.</p>
        <form action={entrarComEmail} className="flex flex-col gap-2">
          <input
            type="email"
            name="email"
            required
            placeholder="seu@email.com"
            className="rounded-xl border border-borda bg-superficie px-4 py-3 outline-none focus:border-destaque"
          />
          <button className="rounded-xl bg-destaque px-4 py-3 font-medium text-fundo">Receber link de acesso</button>
        </form>
        {temGoogle && (
          <form action={entrarComGoogle}>
            <button className="w-full rounded-xl border border-borda bg-superficie px-4 py-3 font-medium">
              Continuar com Google
            </button>
          </form>
        )}
        <p className="text-xs text-suave">
          Guardamos só seu e-mail e a lista de parlamentares que você acompanha. Você pode excluir tudo a qualquer
          momento.
        </p>
      </>
    </div>
  );
}
