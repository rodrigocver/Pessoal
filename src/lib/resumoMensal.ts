import { gastos, presenca, proposicoes, votos, type Parlamentar } from "./consultas";
import { periodoDoMes } from "./periodo";

export interface ResumoParlamentar {
  p: Parlamentar;
  presenca: { total: number; presentes: number; percentual: number | null };
  votos: {
    total: number;
    destaques: { proposicao: string | null; ementa: string | null; voto: string; aprovada: boolean | null }[];
  };
  proposicoes: { rotulo: string; ementa: string | null }[];
  gastos: { total: number; principalCategoria: string | null };
}

const TIPOS_DESTAQUE = /^(PEC|PLP|PL|MPV|PDL)\b/;

/** O que cada parlamentar fez no mês. Reaproveita as mesmas consultas das páginas de perfil. */
export async function resumoDoMes(p: Parlamentar, mes: string): Promise<ResumoParlamentar> {
  const periodo = periodoDoMes(mes);
  const [pr, vt, pp, gs] = await Promise.all([
    presenca(p, periodo),
    votos(p, periodo, 1, 200),
    proposicoes(p, periodo),
    gastos(p, periodo),
  ]);
  // Destaques: uma votação por matéria relevante (a mais recente), até 5.
  const vistas = new Set<string>();
  const destaques = vt.lista
    .filter((v) => v.proposicao && TIPOS_DESTAQUE.test(v.proposicao))
    .filter((v) => !vistas.has(v.proposicao!) && vistas.add(v.proposicao!))
    .slice(0, 5)
    .map((v) => ({ proposicao: v.proposicao, ementa: v.ementa, voto: v.voto, aprovada: v.aprovada }));
  return {
    p,
    presenca: { total: pr.total, presentes: pr.presentes, percentual: pr.percentual },
    votos: { total: vt.total, destaques },
    proposicoes: pp.lista.slice(0, 5).map((x) => ({ rotulo: x.rotulo, ementa: x.ementa })),
    gastos: { total: gs.total, principalCategoria: gs.categorias[0]?.categoria ?? null },
  };
}
