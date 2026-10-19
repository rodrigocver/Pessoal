import type { Metadata } from "next";
import { auth } from "@/auth";
import { afastadosAgora, buscarParlamentares, idsSeguidos, opcoesFiltro } from "@/lib/consultas";
import { CartaoParlamentar } from "@/components/CartaoParlamentar";

export const metadata: Metadata = { title: "Buscar parlamentares" };

type Params = { q?: string; casa?: string; uf?: string; partido?: string; todos?: string };

export default async function Buscar({ searchParams }: { searchParams: Promise<Params> }) {
  const f = await searchParams;
  const sessao = await auth();
  const [resultados, opcoes, seguidos] = await Promise.all([
    buscarParlamentares({ ...f, todos: f.todos === "1" }),
    opcoesFiltro(),
    idsSeguidos(sessao?.user?.id),
  ]);
  const afastados = await afastadosAgora(resultados.map((p) => p.id));
  const campo = "rounded-xl border border-borda bg-superficie px-3 py-2 text-sm";
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Buscar parlamentares</h1>
      <form className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input name="q" defaultValue={f.q} placeholder="Nome" className={`${campo} col-span-2`} />
        <select name="casa" defaultValue={f.casa ?? ""} className={campo} aria-label="Casa">
          <option value="">Câmara e Senado</option>
          <option value="CD">Câmara</option>
          <option value="SF">Senado</option>
        </select>
        <select name="uf" defaultValue={f.uf ?? ""} className={campo} aria-label="Estado">
          <option value="">Todos os estados</option>
          {opcoes.ufs.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select name="partido" defaultValue={f.partido ?? ""} className={campo} aria-label="Partido">
          <option value="">Todos os partidos</option>
          {opcoes.partidos.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <label className="col-span-2 flex items-center gap-2 text-sm text-suave sm:col-span-4">
          <input type="checkbox" name="todos" value="1" defaultChecked={f.todos === "1"} />
          Incluir quem não está mais em exercício (suplentes que já saíram, mandatos encerrados)
        </label>
        <button className="rounded-xl bg-destaque px-4 py-2 text-sm font-medium text-fundo">Filtrar</button>
      </form>
      <p className="text-sm text-suave">
        {resultados.length === 60 ? "Mostrando os 60 primeiros — refine a busca." : `${resultados.length} resultado(s)`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resultados.map((p) => (
          <CartaoParlamentar
            key={p.id}
            p={p}
            seguindo={seguidos.has(p.id)}
            logado={!!sessao?.user}
            caminho="/buscar"
            afastado={afastados.get(p.id)}
          />
        ))}
      </div>
    </div>
  );
}
