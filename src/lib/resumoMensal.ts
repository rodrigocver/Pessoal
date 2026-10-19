import { afastamentosDe, gastos, presenca, proposicoes, votos, type Parlamentar } from "./consultas";
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
  /** Saídas e voltas do mandato no mês, com quem ocupou a vaga. */
  mandato: string[];
}

/** Frases sobre afastamentos que tocam o mês: saiu, voltou ou ficou fora o mês inteiro. */
export function eventosDoMandato(
  afastamentos: Awaited<ReturnType<typeof afastamentosDe>>,
  inicioMes: Date,
  fimMes: Date,
): string[] {
  const data = (d: Date) =>
    d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
  const quem = (a: (typeof afastamentos)[number]) => {
    const certos = [...new Set(a.suplentes.filter((s) => s.certeza !== "possivel").map((s) => s.nome))];
    if (certos.length) return `suplente na vaga: ${certos.join(", ")}`;
    const possiveis = [...new Set(a.suplentes.map((s) => s.nome))];
    if (possiveis.length === 1) return `suplente na vaga: provavelmente ${possiveis[0]}`;
    return possiveis.length ? `suplente na vaga: um entre ${possiveis.join(", ")}` : "nenhum suplente assumiu";
  };
  const r: string[] = [];
  for (const a of [...afastamentos].reverse()) {
    const fim = a.fim ?? new Date(8.64e15);
    if (a.inicio >= fimMes || fim <= inicioMes) continue;
    if (a.inicio >= inicioMes)
      r.push(
        `${a.definitivo ? "Deixou o mandato" : "Afastou-se do mandato"} em ${data(a.inicio)} (${a.motivo}); ${quem(a)}.`,
      );
    else if (fim >= fimMes) r.push(`Esteve afastado o mês inteiro (${a.motivo}); ${quem(a)}.`);
    if (a.fim && a.fim >= inicioMes && a.fim < fimMes) r.push(`Voltou ao mandato em ${data(a.fim)}.`);
  }
  return r;
}

const TIPOS_DESTAQUE = /^(PEC|PLP|PL|MPV|PDL)\b/;

/** O que cada parlamentar fez no mês. Reaproveita as mesmas consultas das páginas de perfil. */
export async function resumoDoMes(p: Parlamentar, mes: string): Promise<ResumoParlamentar> {
  const periodo = periodoDoMes(mes);
  const [pr, vt, pp, gs, afs] = await Promise.all([
    presenca(p, periodo),
    votos(p, periodo, 1, 200),
    proposicoes(p, periodo),
    gastos(p, periodo),
    afastamentosDe(p),
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
    mandato: eventosDoMandato(afs, periodo.inicio, periodo.fim),
  };
}
