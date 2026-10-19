import { INICIO_LEGISLATURA } from "@/ingest/fontes";

export interface Periodo {
  rotulo: string;
  valor: string; // como aparece na URL: "2025" ou "legislatura"
  inicio: Date;
  fim: Date;
}

const ANO_INICIO = Number(INICIO_LEGISLATURA.slice(0, 4));

export function periodosDisponiveis(hoje = new Date()): Periodo[] {
  const anos: Periodo[] = [];
  for (let ano = hoje.getFullYear(); ano >= ANO_INICIO; ano--) {
    anos.push({
      rotulo: String(ano),
      valor: String(ano),
      inicio: new Date(`${ano}-01-01T00:00:00-03:00`),
      fim: new Date(`${ano + 1}-01-01T00:00:00-03:00`),
    });
  }
  return [
    ...anos,
    {
      rotulo: "Legislatura inteira",
      valor: "legislatura",
      inicio: new Date(`${INICIO_LEGISLATURA}T00:00:00-03:00`),
      fim: new Date(`${hoje.getFullYear() + 1}-01-01T00:00:00-03:00`),
    },
  ];
}

export function resolverPeriodo(valor: string | undefined, hoje = new Date()): Periodo {
  const lista = periodosDisponiveis(hoje);
  return lista.find((p) => p.valor === valor) ?? lista[0];
}

/** Um mês ("2026-09") como período, para o resumo mensal. */
export function periodoDoMes(mes: string): Periodo {
  const [ano, m] = mes.split("-").map(Number);
  const proximo = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, "0")}`;
  return {
    rotulo: mes,
    valor: mes,
    inicio: new Date(`${mes}-01T00:00:00-03:00`),
    fim: new Date(`${proximo}-01T00:00:00-03:00`),
  };
}

/** Mês anterior ao de `hoje`, no formato "AAAA-MM". */
export function mesAnterior(hoje = new Date()): string {
  const d = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
