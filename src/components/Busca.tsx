"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { filtrarParlamentares, LIMITE_BUSCA, opcoesDoIndice } from "@/lib/busca";
import { caminhoComparar } from "@/lib/caminhos";
import { CartaoParlamentar, Identificacao } from "./CartaoParlamentar";
import { Foto } from "./Foto";
import { useIndice } from "./indice";

const campo = "rounded-xl border border-borda bg-superficie px-3 py-2 text-sm";

/** Página /buscar: filtros na URL (?q=&casa=&uf=&partido=&todos=1), resultados calculados no navegador. */
export function Busca() {
  const sp = useSearchParams();
  const f = {
    q: sp.get("q") ?? "",
    casa: sp.get("casa") ?? "",
    uf: sp.get("uf") ?? "",
    partido: sp.get("partido") ?? "",
    todos: sp.get("todos") === "1",
  };
  const { indice, erro } = useIndice();
  const opcoes = indice ? opcoesDoIndice(indice) : { ufs: [], partidos: [] };
  const resultados = indice ? filtrarParlamentares(indice, f) : [];
  return (
    <>
      {/* key: recria os campos quando a URL muda (voltar/avançar), para refletirem os filtros. */}
      <form key={sp.toString()} action="/buscar" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input name="q" defaultValue={f.q} placeholder="Nome" aria-label="Nome" className={`${campo} col-span-2`} />
        <select name="casa" defaultValue={f.casa} className={campo} aria-label="Casa">
          <option value="">Câmara e Senado</option>
          <option value="CD">Câmara</option>
          <option value="SF">Senado</option>
        </select>
        <select name="uf" defaultValue={f.uf} className={campo} aria-label="Estado">
          <option value="">Todos os estados</option>
          {opcoes.ufs.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <select name="partido" defaultValue={f.partido} className={campo} aria-label="Partido">
          <option value="">Todos os partidos</option>
          {opcoes.partidos.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <label className="col-span-2 flex items-center gap-2 text-sm text-suave sm:col-span-4">
          <input type="checkbox" name="todos" value="1" defaultChecked={f.todos} />
          Incluir quem não está mais em exercício (suplentes que já saíram, mandatos encerrados)
        </label>
        <button className="rounded-xl bg-destaque px-4 py-2 text-sm font-medium text-fundo">Filtrar</button>
      </form>
      <p className="text-sm text-suave" role="status">
        {erro
          ? "Não foi possível carregar a lista de parlamentares. Tente de novo."
          : !indice
            ? "Carregando…"
            : resultados.length === LIMITE_BUSCA
              ? `Mostrando os ${LIMITE_BUSCA} primeiros — refine a busca.`
              : `${resultados.length} resultado(s)`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resultados.map((p) => (
          <CartaoParlamentar key={p.id} p={p} afastado={p.afastado} />
        ))}
      </div>
    </>
  );
}

/** Lista curta de resultados que levam a um endereço montado por `href` (ex.: escolher quem comparar). */
export function EscolherParlamentar({
  q,
  excluir,
  href,
}: {
  q: string;
  excluir?: string;
  href: (chave: string) => string;
}) {
  const { indice } = useIndice();
  if (!q || !indice) return null;
  const chave = (p: { casa: string; idExterno: string }) => `${p.casa === "CD" ? "camara" : "senado"}/${p.idExterno}`;
  return (
    <ul className="flex flex-col divide-y divide-borda">
      {filtrarParlamentares(indice, { q }, 20)
        .filter((p) => chave(p) !== excluir)
        .map((p) => (
          <li key={p.id}>
            <Link href={href(chave(p))} className="flex items-center gap-3 py-2">
              <Foto url={p.fotoUrl} nome={p.nome} tamanho={40} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.nome}</span>
                <Identificacao p={p} />
              </span>
            </Link>
          </li>
        ))}
    </ul>
  );
}

/** Escolha de quem comparar: o termo fica em ?q= e os resultados levam ao caminho da comparação. */
export function EscolherComparacao({ a }: { a?: string }) {
  const q = useSearchParams().get("q") ?? "";
  return (
    <>
      <form key={q} className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Nome do deputado ou senador"
          aria-label="Nome do deputado ou senador"
          className="min-w-0 flex-1 rounded-full border border-borda bg-superficie px-4 py-2 outline-none focus:border-destaque"
        />
        <button className="rounded-full bg-destaque px-4 font-medium text-fundo">Buscar</button>
      </form>
      <EscolherParlamentar q={q} excluir={a} href={(k) => (a ? caminhoComparar(a, k) : caminhoComparar(k))} />
    </>
  );
}
