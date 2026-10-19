import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, schema } from "@/db/client";
import { alternarResumoMensal, excluirConta, sair } from "@/app/acoes";
import { Secao } from "@/components/ComoCalculamos";

export const metadata: Metadata = { title: "Conta" };

export default async function Conta() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/entrar");
  const [u] = await db.select().from(schema.usuario).where(eq(schema.usuario.id, sessao.user.id));
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <h1 className="text-2xl font-semibold">Conta</h1>
      <p className="text-sm text-suave">{u.email}</p>
      <Secao titulo="Resumo mensal por e-mail">
        <p className="text-sm text-suave">
          No início de cada mês, um e-mail com presença, votos, projetos e gastos dos parlamentares que você acompanha.
        </p>
        <a href="/conta/resumo" className="text-sm text-destaque underline">
          Ver como fica o resumo do último mês
        </a>
        <form action={alternarResumoMensal.bind(null, !u.resumoMensal)}>
          <button className="rounded-full border border-destaque px-4 py-2 text-sm font-medium text-destaque">
            {u.resumoMensal ? "Desativar resumo mensal" : "Ativar resumo mensal"}
          </button>
        </form>
      </Secao>
      <form action={sair}>
        <button className="rounded-full border border-borda px-4 py-2 text-sm">Sair</button>
      </form>
      <Secao titulo="Excluir conta">
        <p className="text-sm text-suave">Apaga sua conta, sua lista e suas preferências. Não dá para desfazer.</p>
        <form action={excluirConta}>
          <button className="rounded-full border border-ruim px-4 py-2 text-sm font-medium text-ruim">
            Excluir minha conta
          </button>
        </form>
      </Secao>
    </div>
  );
}
