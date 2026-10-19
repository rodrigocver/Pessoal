import Link from "next/link";
import type { Parlamentar } from "@/lib/consultas";
import { CASAS, formatarData, formatarPct, formatarReais, slugDaCasa, urlParlamentar } from "@/lib/formato";
import { Foto } from "./Foto";
import { BotaoSeguir } from "./BotaoSeguir";

export function Identificacao({ p }: { p: Parlamentar }) {
  return (
    <span className="text-sm text-suave">
      {CASAS[slugDaCasa(p.casa)].nome} · {p.partido ?? "sem partido"}-{p.uf}
      {!p.emExercicio && " · fora de exercício"}
    </span>
  );
}

export function CartaoParlamentar({
  p,
  resumo,
  seguindo,
  logado,
  caminho,
  afastado,
}: {
  p: Parlamentar;
  resumo?: { presenca: number | null; votos: number; gastos: number };
  seguindo: boolean;
  logado: boolean;
  caminho: string;
  afastado?: { desde: Date; motivo: string; definitivo: boolean };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-4">
      <div className="flex items-center gap-3">
        <Foto url={p.fotoUrl} nome={p.nome} />
        <div className="min-w-0 flex-1">
          <Link href={urlParlamentar(p)} className="block truncate font-semibold hover:underline">
            {p.nome}
          </Link>
          <Identificacao p={p} />
        </div>
      </div>
      {afastado && (
        <p className="rounded-lg bg-alerta/10 px-3 py-2 text-xs">
          <span className="font-semibold">
            {afastado.definitivo ? "Deixou o mandato" : "Afastado · suplente no lugar"}
          </span>{" "}
          desde {formatarData(afastado.desde)} ({afastado.motivo})
        </p>
      )}
      {resumo && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          <Numero rotulo="presença" valor={formatarPct(resumo.presenca)} />
          <Numero rotulo="votos" valor={String(resumo.votos)} />
          <Numero rotulo="gastos" valor={formatarReais(resumo.gastos, true)} />
        </dl>
      )}
      <div className="flex items-center justify-between">
        <Link href={urlParlamentar(p)} className="text-sm text-destaque hover:underline">
          Ver atuação →
        </Link>
        <BotaoSeguir parlamentarId={p.id} seguindo={seguindo} logado={logado} caminho={caminho} />
      </div>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-fundo px-2 py-2">
      <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
      <dt className="text-xs text-suave">{rotulo}</dt>
    </div>
  );
}
