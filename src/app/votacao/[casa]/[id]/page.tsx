import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { detalhesVotacao, idsSeguidos, obterVotacao } from "@/lib/consultas";
import { CASAS, formatarData, urlParlamentar, type SlugCasa } from "@/lib/formato";
import { corVoto } from "@/lib/votos";
import { ComoCalculamos, Secao } from "@/components/ComoCalculamos";

type Props = { params: Promise<{ casa: string; id: string }> };

async function carregar(params: Props["params"]) {
  const { casa, id } = await params;
  if (!(casa in CASAS)) notFound();
  const v = await obterVotacao(CASAS[casa as SlugCasa].casa, decodeURIComponent(id));
  if (!v) notFound();
  return { v, slug: casa as SlugCasa };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { v } = await carregar(params);
  const titulo = `${v.proposicao ?? "Votação"} em ${formatarData(v.data)}`;
  return { title: titulo, description: v.ementa ?? v.descricao ?? undefined };
}

export default async function PaginaVotacao({ params }: Props) {
  const { v, slug } = await carregar(params);
  const [d, sessao] = await Promise.all([detalhesVotacao(v.id), auth()]);
  const seguidos = await idsSeguidos(sessao?.user?.id);
  const meus = d.lista.filter((x) => seguidos.has(x.id));
  const governo = d.orientacoes.find((o) => o.bancada === "Governo");
  const porVoto = d.placar.map((p) => ({ ...p, nomes: d.lista.filter((x) => x.voto === p.voto) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-suave">
          {CASAS[slug].nome} · {formatarData(v.data)}
          {v.aprovada != null && <> · {v.aprovada ? "aprovada" : "rejeitada"}</>}
        </p>
        <h1 className="text-2xl font-semibold">{v.proposicao ?? "Votação nominal"}</h1>
        {v.ementa && <p className="text-suave">{v.ementa}</p>}
      </div>

      <Secao titulo="Resultado">
        <div className="flex flex-wrap gap-2 text-sm">
          {d.placar.map((p) => (
            <span key={p.voto} className="rounded-full bg-fundo px-3 py-1">
              <span className={corVoto(p.voto)}>{p.voto}</span> <span className="tabular-nums text-suave">{p.n}</span>
            </span>
          ))}
        </div>
        {v.descricao && <p className="text-sm">{v.descricao}</p>}
        <a href={v.fonteUrl} className="text-xs text-suave underline">
          Fonte oficial
        </a>
      </Secao>

      {meus.length > 0 && (
        <Secao titulo="Seus parlamentares">
          <ListaVotos itens={meus} />
        </Secao>
      )}

      {d.orientacoes.length > 0 && (
        <Secao titulo="Orientação das bancadas">
          {governo && (
            <p className="text-sm">
              Governo orientou{" "}
              <span className={`font-semibold ${corVoto(governo.orientacao)}`}>{governo.orientacao}</span>.
            </p>
          )}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {d.orientacoes.map((o) => (
              <li key={o.bancada} className="flex justify-between gap-2">
                <span className="truncate text-suave">{o.bancada}</span>
                <span className={`shrink-0 font-medium ${corVoto(o.orientacao)}`}>{o.orientacao}</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo="Como cada partido votou">
        <ul className="flex flex-col divide-y divide-borda text-sm">
          {d.porPartido.map((p) => (
            <li key={p.partido} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
              <span className="font-medium">
                {p.partido} <span className="font-normal text-suave">({p.total})</span>
              </span>
              <span className="flex flex-wrap gap-3">
                {p.votos.map((x) => (
                  <span key={x.voto}>
                    <span className={corVoto(x.voto)}>{x.voto}</span> <span className="tabular-nums">{x.n}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <ComoCalculamos>
          <p>Partido de cada parlamentar na data da votação, conforme registrado pela casa.</p>
        </ComoCalculamos>
      </Secao>

      <Secao titulo="Votos nominais">
        {porVoto.map((grupo) => (
          <details key={grupo.voto} className="text-sm" open={porVoto.length <= 3}>
            <summary className="cursor-pointer py-1">
              <span className={`font-semibold ${corVoto(grupo.voto)}`}>{grupo.voto}</span>{" "}
              <span className="text-suave">({grupo.n})</span>
            </summary>
            <ListaVotos itens={grupo.nomes} semVoto />
          </details>
        ))}
      </Secao>
    </div>
  );
}

function ListaVotos({
  itens,
  semVoto = false,
}: {
  itens: Awaited<ReturnType<typeof detalhesVotacao>>["lista"];
  semVoto?: boolean;
}) {
  return (
    <ul className="grid gap-x-4 gap-y-1 py-1 text-sm sm:grid-cols-2">
      {itens.map((x) => (
        <li key={x.id} className="flex justify-between gap-2">
          <Link href={urlParlamentar(x)} className="truncate hover:underline">
            {x.nome}{" "}
            <span className="text-suave">
              {x.partido}-{x.uf}
            </span>
          </Link>
          {!semVoto && <span className={`shrink-0 font-medium ${corVoto(x.voto)}`}>{x.voto}</span>}
        </li>
      ))}
    </ul>
  );
}
