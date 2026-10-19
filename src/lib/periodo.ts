import { PRIMEIRA_LEGISLATURA, fimLegislatura, inicioLegislatura, legislaturasComDados } from "@/ingest/fontes";

export interface Periodo {
  rotulo: string;
  valor: string; // como aparece na URL: "2025" ou "leg57"
  inicio: Date;
  fim: Date;
}

export function periodoDaLegislatura(n: number): Periodo {
  const inicio = inicioLegislatura(n);
  const fim = fimLegislatura(n);
  return { rotulo: `Legislatura ${inicio.getFullYear()}–${fim.getFullYear()}`, valor: `leg${n}`, inicio, fim };
}

/** Anos (do atual para trás) e depois as legislaturas (da atual para trás). */
export function periodosDisponiveis(hoje = new Date()): Periodo[] {
  const anos: Periodo[] = [];
  for (let ano = hoje.getFullYear(); ano >= inicioLegislatura(PRIMEIRA_LEGISLATURA).getFullYear(); ano--) {
    anos.push({
      rotulo: String(ano),
      valor: String(ano),
      inicio: new Date(`${ano}-01-01T00:00:00-03:00`),
      fim: new Date(`${ano + 1}-01-01T00:00:00-03:00`),
    });
  }
  const legislaturas = legislaturasComDados(hoje).reverse().map(periodoDaLegislatura);
  return [...anos, ...legislaturas];
}

export function resolverPeriodo(valor: string | undefined, hoje = new Date()): Periodo {
  const lista = periodosDisponiveis(hoje);
  // "legislatura" era o valor antigo (uma só legislatura); links compartilhados apontam para a atual.
  const alvo = valor === "legislatura" ? `leg${legislaturasComDados(hoje).at(-1)}` : valor;
  return lista.find((p) => p.valor === alvo) ?? lista[0];
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
