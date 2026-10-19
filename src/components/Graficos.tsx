import { rotuloMes } from "@/lib/formato";

const MESES_EXTENSO = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const mesExtenso = (m: string) => `${MESES_EXTENSO[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;

/**
 * Barras verticais por mês. Feito em CSS puro: leve e legível no celular.
 * O desenho fica escondido de leitores de tela, que leem a tabela equivalente.
 */
export function BarrasMensais({
  titulo,
  dados,
  formatar,
  maximo,
}: {
  titulo: string; // nome do gráfico, lido por leitores de tela
  dados: { mes: string; valor: number; dica: string }[];
  formatar?: (v: number) => string;
  maximo?: number;
}) {
  if (dados.length === 0) return <p className="text-sm text-suave">Sem dados no período.</p>;
  const max = maximo ?? Math.max(...dados.map((d) => d.valor), 1);
  return (
    <figure>
      {/* Rola na horizontal quando há muitos meses: focável para rolar pelo teclado. */}
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`${titulo} (role para ver todos os meses)`}
      >
        <div
          aria-hidden
          className="flex h-40 min-w-full items-end gap-1"
          style={{ width: Math.max(dados.length * 28, 0) }}
        >
          {dados.map((d) => (
            <div key={d.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={d.dica}>
              {formatar && <span className="text-[10px] tabular-nums text-suave">{formatar(d.valor)}</span>}
              <div
                className="w-full rounded-t bg-destaque"
                style={{ height: `${(d.valor / max) * 100}%`, minHeight: d.valor ? 2 : 0 }}
              />
              <span className="text-[10px] text-suave">{rotuloMes(d.mes)}</span>
            </div>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.mes}>
              <th scope="row">{mesExtenso(d.mes)}</th>
              <td>{d.dica}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
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
            <span className="min-w-0 truncate" title={d.rotulo}>
              {d.rotulo}
            </span>
            <span className="shrink-0 tabular-nums text-suave">{d.texto}</span>
          </div>
          <div aria-hidden className="h-2 rounded-full bg-fundo">
            <div className="h-2 rounded-full bg-destaque" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
