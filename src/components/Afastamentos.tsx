import Link from "next/link";
import type { AfastamentoDetalhado, SuplenteNaVaga, VagaOcupada } from "@/lib/consultas";
import { formatarData, formatarDuracao, urlParlamentar } from "@/lib/formato";
import { ComoCalculamos, Secao } from "./ComoCalculamos";

function NomeSuplente({ s }: { s: SuplenteNaVaga }) {
  const rotulo = (
    <>
      {s.nome}
      {s.parlamentar?.partido && (
        <span className="text-suave"> ({[s.parlamentar.partido, s.parlamentar.uf].filter(Boolean).join("-")})</span>
      )}
    </>
  );
  return s.parlamentar ? (
    <Link href={urlParlamentar(s.parlamentar)} className="font-medium underline">
      {rotulo}
    </Link>
  ) : (
    <span className="font-medium">{rotulo}</span>
  );
}

/** Quem ocupou a vaga, em texto: um nome, vários (em sequência) ou candidatos possíveis. */
function QuemOcupou({ a }: { a: AfastamentoDetalhado }) {
  const certos = a.suplentes.filter((s) => s.certeza !== "possivel");
  const possiveis = a.suplentes.filter((s) => s.certeza === "possivel");
  const unicos = [...new Map(certos.map((s) => [s.nome, s])).values()];
  if (unicos.length > 0)
    return (
      <>
        Suplente na vaga:{" "}
        {unicos.map((s, i) => (
          <span key={s.nome}>
            {i > 0 && (i === unicos.length - 1 ? " e depois " : ", ")}
            <NomeSuplente s={s} />
          </span>
        ))}
      </>
    );
  if (possiveis.length === 1)
    return (
      <>
        Provável suplente na vaga (a Câmara não informa o vínculo): <NomeSuplente s={possiveis[0]} />
      </>
    );
  if (possiveis.length > 0)
    return (
      <>
        Um destes suplentes ocupou a vaga (a Câmara não informa qual):{" "}
        {possiveis.map((s, i) => (
          <span key={s.nome}>
            {i > 0 && ", "}
            <NomeSuplente s={s} />
          </span>
        ))}
      </>
    );
  return <>Nenhum suplente assumiu a vaga.</>;
}

/**
 * Aviso no topo do perfil: o titular eleito está fora e outra pessoa vota no lugar dele, ou este
 * parlamentar é suplente ocupando a vaga de alguém.
 */
export function AvisoMandato({ afastamentos, vagas }: { afastamentos: AfastamentoDetalhado[]; vagas: VagaOcupada[] }) {
  const atual = afastamentos.find((a) => a.fim == null);
  const vagaAtual = vagas.find((v) => v.fim == null);
  if (atual)
    return (
      <div role="status" className="rounded-2xl border border-alerta/40 bg-alerta/10 p-4 text-sm">
        <p className="font-semibold">
          {atual.definitivo ? "Deixou o mandato" : "Afastado do mandato"} desde {formatarData(atual.inicio)}
          <span className="font-normal"> · {atual.motivo}</span>
        </p>
        <p className="mt-1">
          <QuemOcupou a={atual} />
        </p>
        {!atual.definitivo && (
          <p className="mt-1 text-suave">
            Enquanto o titular está afastado, quem vota e usa a cota parlamentar é o suplente. Afastado há{" "}
            {formatarDuracao(atual.inicio, null)}.
          </p>
        )}
      </div>
    );
  if (vagaAtual)
    return (
      <div role="status" className="rounded-2xl border border-destaque/40 bg-destaque-suave p-4 text-sm">
        <p className="font-semibold">
          Suplente em exercício desde {formatarData(vagaAtual.inicio)}, na vaga de{" "}
          <Link href={urlParlamentar(vagaAtual.titular)} className="underline">
            {vagaAtual.titular.nome}
          </Link>
        </p>
        <p className="mt-1 text-suave">Motivo do afastamento do titular: {vagaAtual.motivo}.</p>
      </div>
    );
  const anteriores = afastamentos.filter((a) => a.fim != null);
  if (anteriores.length > 0)
    return (
      <p className="text-sm text-suave">
        Esteve afastado {anteriores.length} {anteriores.length === 1 ? "vez" : "vezes"}, com suplente no lugar. Veja o
        histórico na aba Presença.
      </p>
    );
  return null;
}

/** Histórico na aba Presença, com os retornos curtos entre um afastamento e outro. */
export function HistoricoAfastamentos({
  afastamentos,
  vagas,
}: {
  afastamentos: AfastamentoDetalhado[];
  vagas: VagaOcupada[];
}) {
  if (afastamentos.length === 0 && vagas.length === 0) return null;
  const retornosCurtos = afastamentos.filter((a, i) => {
    const posterior = afastamentos[i - 1]; // lista vem do mais recente para o mais antigo
    return posterior && a.fim && posterior.inicio.getTime() - a.fim.getTime() <= 30 * 86_400_000;
  }).length;
  return (
    <Secao titulo="Afastamentos e suplentes">
      {afastamentos.length > 0 && (
        <p className="text-sm">
          {afastamentos.length} {afastamentos.length === 1 ? "afastamento" : "afastamentos"} do mandato
          {retornosCurtos > 0 &&
            `, com ${retornosCurtos} ${retornosCurtos === 1 ? "retorno curto" : "retornos curtos"} (até 30 dias) entre eles`}
          .
        </p>
      )}
      <ol className="flex flex-col gap-3 text-sm">
        {afastamentos.map((a, i) => {
          const posterior = afastamentos[i - 1];
          const retorno = posterior && a.fim ? { de: a.fim, ate: posterior.inicio } : null;
          return (
            <li key={a.inicio.toISOString()} className="flex flex-col gap-2">
              {retorno && (
                <p className="rounded-lg bg-fundo px-3 py-1 text-xs text-suave">
                  Voltou ao mandato por {formatarDuracao(retorno.de, retorno.ate)} ({formatarData(retorno.de)} a{" "}
                  {formatarData(retorno.ate)})
                </p>
              )}
              <div className="border-l-2 border-alerta/60 pl-3">
                <p className="font-medium">
                  {formatarData(a.inicio)} a {a.fim ? formatarData(a.fim) : a.definitivo ? "—" : "hoje"}
                  {!a.definitivo && (
                    <span className="font-normal text-suave"> · {formatarDuracao(a.inicio, a.fim)}</span>
                  )}
                </p>
                <p className="text-suave">{a.definitivo ? `Saída definitiva: ${a.motivo}` : a.motivo}</p>
                <p>
                  <QuemOcupou a={a} />
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {vagas.length > 0 && (
        <>
          <h3 className="text-sm font-medium">Vagas que ocupou como suplente</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {vagas.map((v) => (
              <li key={v.inicio.toISOString()}>
                {formatarData(v.inicio)} a {v.fim ? formatarData(v.fim) : "hoje"}: vaga de{" "}
                <Link href={urlParlamentar(v.titular)} className="underline">
                  {v.titular.nome}
                </Link>{" "}
                <span className="text-suave">({v.motivo})</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <ComoCalculamos>
        <p>
          Afastamentos e motivos vêm do histórico oficial de cada casa: na Câmara, `/deputados/{"{id}"}/historico`; no
          Senado, os exercícios do mandato. Durante um afastamento o titular eleito não vota; a vaga é ocupada por um
          suplente, que passa a votar e a usar a cota parlamentar.
        </p>
        <p>
          No Senado, a própria fonte informa os suplentes de cada mandato. A Câmara não informa qual suplente ocupou
          cada vaga: identificamos pelo estado, pelo partido ou federação e pelas datas de posse e saída. Quando mais de
          um suplente se encaixa, mostramos todos como possíveis.
        </p>
        <p>
          As sessões em que o titular estava afastado não contam na presença dele (nem como presença, nem como falta).
        </p>
      </ComoCalculamos>
    </Secao>
  );
}
