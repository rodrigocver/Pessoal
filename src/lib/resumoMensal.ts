import {
  afastamentosDe,
  comissoesDe,
  gastos,
  presenca,
  proposicoes,
  relatoriasDe,
  votos,
  type ComissaoDoParlamentar,
  type Parlamentar,
  type RelatoriaDetalhada,
} from "./consultas";
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
  /** Câmara: presença nas reuniões de comissão; Senado: relatorias recebidas. `null` se não houve nada no mês. */
  comissoes: string | null;
}

/** Frase sobre comissões no mês. Mesma definição do perfil (aba Comissões); sem "0 de 0". */
export function linhaComissoes(
  casa: Parlamentar["casa"],
  comissoes: Pick<ComissaoDoParlamentar, "reunioes" | "presencas">[],
  relatorias: Pick<RelatoriaDetalhada, "designacao">[],
  inicioMes: Date,
): string | null {
  if (casa === "CD") {
    const reunioes = comissoes.reduce((s, c) => s + c.reunioes, 0);
    const presencas = comissoes.reduce((s, c) => s + c.presencas, 0);
    if (reunioes === 0) return null;
    return `Comissões: esteve em ${presencas} de ${reunioes} ${reunioes === 1 ? "reunião deliberativa" : "reuniões deliberativas"} das comissões em que é titular.`;
  }
  // O Senado não publica presença em comissões; contam as relatorias designadas no mês.
  const novas = relatorias.filter((r) => r.designacao >= inicioMes).length;
  if (novas === 0) return null;
  return `Comissões: recebeu a relatoria de ${novas} ${novas === 1 ? "matéria" : "matérias"}.`;
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
  const [pr, vt, pp, gs, afs, cms, rls] = await Promise.all([
    presenca(p, periodo),
    votos(p, periodo, 1, 200),
    proposicoes(p, periodo),
    gastos(p, periodo),
    afastamentosDe(p),
    p.casa === "CD" ? comissoesDe(p, periodo) : Promise.resolve([]),
    p.casa === "SF" ? relatoriasDe(p, periodo) : Promise.resolve([]),
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
    comissoes: linhaComissoes(p.casa, cms, rls, periodo.inicio),
  };
}
