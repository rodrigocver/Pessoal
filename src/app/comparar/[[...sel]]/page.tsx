import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  candidaturasDe,
  parlamentarPorChave,
  resumos,
  votosEmComum,
  type CandidaturaDetalhada,
  type Parlamentar,
} from "@/lib/consultas";
import { periodosDisponiveis, resolverPeriodo } from "@/lib/periodo";
import { caminhoComparar, lerComparar } from "@/lib/caminhos";
import { formatarData, formatarPct, formatarReais, slugDaCasa, urlParlamentar } from "@/lib/formato";
import { corVoto } from "@/lib/votos";
import { Foto } from "@/components/Foto";
import { Identificacao } from "@/components/CartaoParlamentar";
import { EscolherComparacao } from "@/components/Busca";
import { ComoCalculamos, Secao } from "@/components/ComoCalculamos";

export const metadata: Metadata = { title: "Comparar parlamentares" };

const chave = (p: Parlamentar) => `${slugDaCasa(p.casa)}/${p.idExterno}`;

// Cada comparação (/comparar/camara/1/senado/3/2025) é gerada uma vez e servida da CDN.
export const revalidate = 3600;
export const generateStaticParams = () => [];

export default async function Comparar({ params }: { params: Promise<{ sel?: string[] }> }) {
  const sp = lerComparar((await params).sel);
  if (!sp) notFound();
  const [a, b] = await Promise.all([parlamentarPorChave(sp.a), parlamentarPorChave(sp.b)]);
  // Endereços inventados não viram páginas em cache.
  if ((sp.a && !a) || (sp.b && !b)) notFound();
  if (sp.periodo && !periodosDisponiveis().some((p) => p.valor === sp.periodo)) notFound();
  const periodo = resolverPeriodo(sp.periodo);

  if (!a || !b) return <Escolher a={a} />;

  const mesmaCasa = a.casa === b.casa;
  const [r, comum, ca, cb] = await Promise.all([
    resumos([a.id, b.id], periodo),
    mesmaCasa ? votosEmComum(a, b, periodo) : Promise.resolve(null),
    candidaturasDe(a),
    candidaturasDe(b),
  ]);
  // Candidatura mais recente de cada um (candidaturasDe já vem da mais nova para a mais antiga).
  const [ea, eb] = [ca[0], cb[0]];
  const ra = r.get(a.id);
  const rb = r.get(b.id);
  const linhas: { rotulo: string; a: string; b: string }[] = [
    { rotulo: "Presença", a: formatarPct(ra?.presenca ?? null), b: formatarPct(rb?.presenca ?? null) },
    ...(a.casa === "CD" || b.casa === "CD"
      ? [
          {
            rotulo: "Presença em comissões",
            a: formatarPct(ra?.presencaComissoes ?? null),
            b: formatarPct(rb?.presencaComissoes ?? null),
          },
        ]
      : []),
    { rotulo: "Votos em votações nominais", a: String(ra?.votos ?? 0), b: String(rb?.votos ?? 0) },
    { rotulo: "Seguiu o partido", a: formatarPct(ra?.alinhPartido ?? null), b: formatarPct(rb?.alinhPartido ?? null) },
    { rotulo: "Seguiu o governo", a: formatarPct(ra?.alinhGoverno ?? null), b: formatarPct(rb?.alinhGoverno ?? null) },
    { rotulo: "Projetos apresentados", a: String(ra?.proposicoes ?? 0), b: String(rb?.proposicoes ?? 0) },
    { rotulo: "Gastos da cota", a: formatarReais(ra?.gastos ?? 0, true), b: formatarReais(rb?.gastos ?? 0, true) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Comparar parlamentares</h1>
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((p, i) => (
          <div
            key={p.id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-superficie p-3 text-center"
          >
            <Foto url={p.fotoUrl} nome={p.nome} tamanho={64} />
            <Link href={urlParlamentar(p)} className="font-semibold hover:underline">
              {p.nome}
            </Link>
            <Identificacao p={p} />
            <Link href={i === 0 ? caminhoComparar(sp.b) : caminhoComparar(sp.a)} className="text-xs text-destaque">
              Trocar
            </Link>
          </div>
        ))}
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm" aria-label="Período">
        {periodosDisponiveis().map((per) => (
          <Link
            key={per.valor}
            href={caminhoComparar(sp.a, sp.b, per.valor)}
            aria-current={per.valor === periodo.valor ? "page" : undefined}
            className={`shrink-0 rounded-lg border px-3 py-1 ${per.valor === periodo.valor ? "border-destaque text-destaque" : "border-borda text-suave"}`}
          >
            {per.rotulo}
          </Link>
        ))}
      </nav>

      <Secao titulo={`Números de ${periodo.rotulo.toLowerCase()}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-suave">
              <th>
                <span className="sr-only">Métrica</span>
              </th>
              <th className="pl-3 text-right font-medium">{a.nome}</th>
              <th className="pl-3 text-right font-medium">{b.nome}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {linhas.map((l) => (
              <tr key={l.rotulo}>
                <th scope="row" className="py-2 text-left font-normal text-suave">
                  {l.rotulo}
                </th>
                <td className="py-2 pl-3 text-right font-medium tabular-nums">{l.a}</td>
                <td className="py-2 pl-3 text-right font-medium tabular-nums">{l.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ComoCalculamos>
          <p>
            As mesmas definições das páginas de cada parlamentar (veja &quot;Como calculamos&quot; em cada aba).
            {!mesmaCasa &&
              " Atenção: Câmara e Senado medem presença de formas diferentes (no Senado, só sessões com votação nominal), então a comparação de presença entre as casas é aproximada."}
          </p>
        </ComoCalculamos>
      </Secao>

      {(ea || eb) && (
        <Secao titulo="Última eleição">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-suave">
                <th>
                  <span className="sr-only">Dado</span>
                </th>
                <th className="pl-3 text-right font-medium">{a.nome}</th>
                <th className="pl-3 text-right font-medium">{b.nome}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {[
                { rotulo: "Eleição", f: eleicao },
                { rotulo: "Patrimônio declarado", f: (c: CandidaturaDetalhada) => formatarReais(c.patrimonio, true) },
                { rotulo: "Receitas de campanha", f: (c: CandidaturaDetalhada) => formatarReais(c.receitaTotal, true) },
              ].map((l) => (
                <tr key={l.rotulo}>
                  <th scope="row" className="py-2 text-left font-normal text-suave">
                    {l.rotulo}
                  </th>
                  <td className="py-2 pl-3 text-right font-medium tabular-nums">{ea ? l.f(ea) : "—"}</td>
                  <td className="py-2 pl-3 text-right font-medium tabular-nums">{eb ? l.f(eb) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ComoCalculamos>
            <p>
              Candidatura mais recente de cada um nos dados do TSE, que pode ser de anos diferentes. Valores declarados
              à Justiça Eleitoral, sem correção pela inflação. Detalhes e eleições anteriores na aba
              &quot;Eleições&quot; de cada perfil.
            </p>
          </ComoCalculamos>
        </Secao>
      )}

      {comum && (
        <Secao titulo="Quando votaram na mesma votação">
          <p className="text-sm">
            {comum.total === 0
              ? "Nenhuma votação em comum no período."
              : `Votaram igual em ${comum.iguais} de ${comum.total} votações (${formatarPct(comum.iguais / comum.total)}).`}
          </p>
          {comum.diferentes.length > 0 && (
            <>
              <h3 className="text-sm font-medium">Votações em que votaram diferente</h3>
              <ul className="flex flex-col divide-y divide-borda text-sm">
                {comum.diferentes.map((d) => (
                  <li key={d.idExterno} className="py-2">
                    <Link
                      href={`/votacao/${slugDaCasa(a.casa)}/${encodeURIComponent(d.idExterno)}`}
                      className="hover:underline"
                    >
                      <span className="text-suave">{formatarData(d.data)} · </span>
                      <span className="font-medium">{d.proposicao ?? "Votação"}</span>
                    </Link>
                    {d.ementa && <p className="line-clamp-2 text-suave">{d.ementa}</p>}
                    <p className="mt-1">
                      {a.nome}: <span className={`font-semibold ${corVoto(d.votoA)}`}>{d.votoA}</span> · {b.nome}:{" "}
                      <span className={`font-semibold ${corVoto(d.votoB)}`}>{d.votoB}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <ComoCalculamos>
            <p>Só votações em que os dois votaram Sim, Não, Abstenção ou Obstrução. Ausências não entram.</p>
          </ComoCalculamos>
        </Secao>
      )}
    </div>
  );
}

const eleicao = (c: CandidaturaDetalhada) =>
  `${c.dataEleicao ? c.dataEleicao.slice(0, 4) : c.ano} · ${c.cargo.charAt(0)}${c.cargo.slice(1).toLowerCase()}`;

function Escolher({ a }: { a: Parlamentar | null }) {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Comparar parlamentares</h1>
      <p className="text-sm text-suave">
        {a ? (
          <>
            Com quem comparar <span className="font-medium text-texto">{a.nome}</span>?
          </>
        ) : (
          "Escolha o primeiro parlamentar."
        )}
      </p>
      <Suspense>
        <EscolherComparacao a={a ? chave(a) : undefined} />
      </Suspense>
    </div>
  );
}
