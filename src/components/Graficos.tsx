import { rotuloMes } from "@/lib/formato";

/** Barras verticais por mês. Feito em CSS puro: leve e legível no celular. */
export function BarrasMensais({
  dados,
  formatar,
  maximo,
}: {
  dados: { mes: string; valor: number; dica: string }[];
  formatar?: (v: number) => string;
  maximo?: number;
}) {
  if (dados.length === 0) return <p className="text-sm text-suave">Sem dados no período.</p>;
  const max = maximo ?? Math.max(...dados.map((d) => d.valor), 1);
  return (
    <div className="overflow-x-auto">
      <div className="flex h-40 min-w-full items-end gap-1" style={{ width: Math.max(dados.length * 28, 0) }}>
        {dados.map((d) => (
          <div key={d.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={d.dica}>
            {formatar && <span className="text-[10px] tabular-nums text-suave">{formatar(d.valor)}</span>}
            <div className="w-full rounded-t bg-destaque" style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor ? 2 : 0 }} />
            <span className="text-[10px] text-suave">{rotuloMes(d.mes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Barras horizontais com rótulo — para categorias e fornecedores. */
export function BarrasHorizontais({ dados }: { dados: { rotulo: string; valor: number; texto: string }[] }) {
  const max = Math.max(...dados.map((d) => d.valor), 1);
  return (
    <ul className="flex flex-col gap-3">
      {dados.map((d) => (
        <li key={d.rotulo} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate">{d.rotulo}</span>
            <span className="shrink-0 tabular-nums text-suave">{d.texto}</span>
          </div>
          <div className="h-2 rounded-full bg-fundo">
            <div className="h-2 rounded-full bg-destaque" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
