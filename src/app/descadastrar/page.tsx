import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { descadastrarPorToken } from "@/lib/descadastro";

export const metadata: Metadata = { title: "Cancelar resumo mensal" };

async function confirmar(formData: FormData) {
  "use server";
  const ok = await descadastrarPorToken(String(formData.get("token") ?? ""));
  redirect(`/descadastrar?${ok ? "feito=1" : "invalido=1"}`);
}

// A confirmação exige um clique: leitores automáticos de links (antivírus de e-mail) não descadastram ninguém.
export default async function Descadastrar({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; feito?: string; invalido?: string }>;
}) {
  const { token, feito, invalido } = await searchParams;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Resumo mensal</h1>
      {feito ? (
        <p className="rounded-xl bg-destaque-suave px-4 py-3 text-sm">
          Pronto. Você não vai mais receber o resumo mensal. Dá para reativar em Conta.
        </p>
      ) : invalido || !token ? (
        <p className="text-sm text-suave">Link inválido ou expirado. Entre na sua conta para mudar a preferência.</p>
      ) : (
        <form action={confirmar} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-suave">Quer parar de receber o resumo mensal por e-mail?</p>
          <button className="rounded-xl bg-destaque px-4 py-3 font-medium text-fundo">Sim, cancelar</button>
        </form>
      )}
    </div>
  );
}
