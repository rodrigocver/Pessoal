import type { Indicadores } from "@/lib/consultas";

type Linha = { rotulo: string; valor: number | null; destaque?: boolean };

/** Parlamentar x média do partido x média da casa, em barras na mesma escala. */
export function Comparacao({
  linhas,
  formatar,
  maximo,
}: {
  linhas: Linha[];
  formatar: (v: number) => string;
  maximo?: number;
}) {
  const max = maximo ?? Math.max(...linhas.map((l) => l.valor ?? 0), 1);
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {linhas.map((l) => (
        <li key={l.rotulo} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
          <span className={`truncate ${l.destaque ? "font-medium" : "text-suave"}`}>{l.rotulo}</span>
          <div aria-hidden className="h-2 rounded-full bg-fundo">
            {l.valor != null && (
              <div
                className={`h-2 rounded-full ${l.destaque ? "bg-destaque" : "bg-suave/50"}`}
                style={{ width: `${Math.min(l.valor / max, 1) * 100}%` }}
              />
            )}
          </div>
          <span className={`w-16 text-right tabular-nums ${l.destaque ? "font-medium" : "text-suave"}`}>
            {l.valor == null ? "—" : formatar(l.valor)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function linhasComparacao(
  nome: string,
  partido: string | null,
  casa: string,
  dados: { proprio: Indicadores | null; partido: Indicadores & { n: number }; casa: Indicadores & { n: number } },
  campo: keyof Indicadores,
): Linha[] {
  return [
    { rotulo: nome, valor: dados.proprio?.[campo] ?? null, destaque: true },
    ...(partido && dados.partido.n > 1 ? [{ rotulo: `Média ${partido}`, valor: dados.partido[campo] }] : []),
    { rotulo: `Média ${casa}`, valor: dados.casa[campo] },
  ];
}
