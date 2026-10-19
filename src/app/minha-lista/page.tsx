import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { afastadosAgora, listaDoUsuario, resumos } from "@/lib/consultas";
import { resolverPeriodo } from "@/lib/periodo";
import { CartaoParlamentar } from "@/components/CartaoParlamentar";

export const metadata: Metadata = { title: "Meus parlamentares" };

export default async function MinhaLista() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/entrar");
  const periodo = resolverPeriodo(undefined); // ano corrente
  const lista = await listaDoUsuario(sessao.user.id);
  const [r, afastados] = await Promise.all([
    resumos(
      lista.map((p) => p.id),
      periodo,
    ),
    afastadosAgora(lista.map((p) => p.id)),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Meus parlamentares</h1>
        <p className="text-sm text-suave">Números de {periodo.rotulo}. Toque em um parlamentar para ver os detalhes.</p>
      </div>
      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borda p-8 text-center">
          <p className="text-suave">Você ainda não acompanha ninguém.</p>
          <Link
            href="/buscar"
            className="mt-3 inline-block rounded-full bg-destaque px-4 py-2 text-sm font-medium text-fundo"
          >
            Buscar parlamentares
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((p) => (
            <CartaoParlamentar key={p.id} p={p} resumo={r.get(p.id)} afastado={afastados.get(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
