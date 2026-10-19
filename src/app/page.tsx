import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sessao = await auth();
  const params = await searchParams;
  if (sessao?.user && !("conta-excluida" in params)) redirect("/minha-lista");
  return (
    <div className="flex flex-col gap-10 py-6">
      {"conta-excluida" in params && (
        <p className="rounded-xl bg-destaque-suave px-4 py-3 text-sm">Sua conta e seus dados foram excluídos.</p>
      )}
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Você votou. Agora acompanhe.
        </h1>
        <p className="max-w-xl text-lg text-suave">
          Escolha os deputados federais e senadores que você quer acompanhar e veja, mês a mês, se eles estão
          comparecendo, como votam, o que propõem e quanto gastam.
        </p>
        <form action="/buscar" className="flex max-w-xl gap-2">
          <input
            name="q"
            placeholder="Nome do deputado ou senador"
            className="min-w-0 flex-1 rounded-full border border-borda bg-superficie px-4 py-3 outline-none focus:border-destaque"
          />
          <button className="rounded-full bg-destaque px-5 font-medium text-fundo">Buscar</button>
        </form>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Presença", "Quantas sessões de votação no plenário ele compareceu."],
          ["Votações", "Como votou em cada votação nominal, e se seguiu o partido e o governo."],
          ["Projetos", "Propostas de lei apresentadas e em que pé estão."],
          ["Gastos", "Uso da cota parlamentar por categoria e fornecedor."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-borda bg-superficie p-4">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-suave">{d}</p>
          </div>
        ))}
      </section>
      <section className="rounded-2xl bg-destaque-suave p-5">
        <h2 className="font-semibold">Resumo mensal no seu e-mail</h2>
        <p className="mt-1 text-sm text-suave">
          Crie uma conta para salvar sua lista e receber, todo mês, o que seus parlamentares fizeram.
        </p>
        <Link
          href="/entrar"
          className="mt-3 inline-block rounded-full bg-destaque px-4 py-2 text-sm font-medium text-fundo"
        >
          Criar conta grátis
        </Link>
      </section>
    </div>
  );
}
