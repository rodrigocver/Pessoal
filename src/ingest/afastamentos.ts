import type { EventoHistoricoApi, MandatoApi } from "./exercicio";
import { comoLista } from "./parlamentares";
import { inicioLegislatura } from "./fontes";

/** Período em que o titular eleito esteve fora do mandato. */
export interface Afastamento {
  inicio: Date;
  fim: Date | null; // nulo = ainda afastado (ou saída definitiva)
  motivo: string;
  definitivo: boolean; // renúncia, perda de mandato, falecimento: o titular não volta
}

/** Quem ocupou a vaga durante o afastamento e com que grau de certeza. */
export interface Substituicao {
  suplenteRef: string; // id do suplente na fonte (Câmara: deputado; Senado: senador)
  suplenteNome: string;
  inicio: Date;
  fim: Date | null;
  // oficial: a fonte liga titular e suplente (Senado)
  // datas: um único suplente compatível pelas datas, estado e partido (Câmara)
  // possivel: mais de um suplente compatível; a fonte não diz qual ocupou esta vaga
  certeza: "oficial" | "datas" | "possivel";
}

const DEFINITIVO = /Afastamento definitivo|Renúncia|Falecimento|Perda de Mandato|Cassação|Vacância/i;
const DIA = 86_400_000;

// ---------- Câmara ----------

type Evento = EventoHistoricoApi & { condicaoEleitoral?: string | null; siglaUf?: string; siglaPartido?: string };

const quando = (e: Evento) => new Date(`${e.dataHora}-03:00`);
const ordenar = (eventos: Evento[], legislaturaMinima: number) =>
  eventos
    .filter((e) => e.idLegislatura >= legislaturaMinima && e.descricaoStatus)
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
const ehEntrada = (e: Evento) => /(^|\/\s*)Entrada\b/.test(e.descricaoStatus!);
const ehSaida = (e: Evento) => /^Saída\b/.test(e.descricaoStatus!);

/**
 * Afastamentos do titular: cada "Saída" enquanto titular abre um afastamento, que termina na próxima
 * "Entrada" (reassunção). Saídas repetidas sem entrada no meio (ex.: renovação de licença) são o mesmo
 * afastamento. O fim da legislatura não é afastamento.
 */
export function afastamentosCamara(
  eventos: Evento[],
  legislaturaMinima = 57,
): (Afastamento & { uf: string | null; partido: string | null })[] {
  const r: (Afastamento & { uf: string | null; partido: string | null })[] = [];
  let aberto: (Afastamento & { uf: string | null; partido: string | null }) | null = null;
  for (const e of ordenar(eventos, legislaturaMinima)) {
    const desc = e.descricaoStatus!;
    if (ehSaida(e) && e.condicaoEleitoral === "Titular" && !/Término da Legislatura/.test(desc)) {
      const motivo = desc.split(" - ").at(-1)!.trim();
      if (!aberto) {
        aberto = {
          inicio: quando(e),
          fim: null,
          motivo,
          definitivo: DEFINITIVO.test(desc),
          uf: e.siglaUf ?? null,
          partido: e.siglaPartido ?? null,
        };
        r.push(aberto);
      } else {
        // Renovação sem volta no meio: mesmo afastamento, guardando todos os motivos informados.
        if (!aberto.motivo.split("; ").includes(motivo)) aberto.motivo += `; ${motivo}`;
        // Afastado que depois perde o mandato ou renuncia: o afastamento passa a ser definitivo.
        if (DEFINITIVO.test(desc)) aberto.definitivo = true;
      }
    } else if (ehEntrada(e) && aberto) {
      aberto.fim = quando(e);
      aberto = null;
    }
  }
  return r.filter((a) => a.fim == null || a.fim > a.inicio);
}

export interface EntradaSuplente {
  inicio: Date;
  fim: Date | null;
  uf: string | null;
  partido: string | null;
}

/** Períodos em que o parlamentar exerceu o mandato como suplente. */
export function entradasSuplenteCamara(eventos: Evento[], legislaturaMinima = 57): EntradaSuplente[] {
  const r: EntradaSuplente[] = [];
  let aberta: EntradaSuplente | null = null;
  for (const e of ordenar(eventos, legislaturaMinima)) {
    const comoSuplente = e.condicaoEleitoral === "Suplente" || /Posse de Suplente/.test(e.descricaoStatus!);
    if (ehEntrada(e) && comoSuplente && !aberta) {
      aberta = { inicio: quando(e), fim: null, uf: e.siglaUf ?? null, partido: e.siglaPartido ?? null };
      r.push(aberta);
    } else if (ehSaida(e) && aberta) {
      aberta.fim = quando(e);
      aberta = null;
    }
  }
  return r;
}

// Federações 2022–2026: suplentes vêm da lista do partido ou da federação.
const FEDERACOES: Record<string, string> = {
  PT: "Fe Brasil",
  PCdoB: "Fe Brasil",
  PV: "Fe Brasil",
  PSDB: "PSDB Cidadania",
  CIDADANIA: "PSDB Cidadania",
  PSOL: "PSOL Rede",
  REDE: "PSOL Rede",
};
const grupo = (partido: string | null) => (partido ? (FEDERACOES[partido] ?? partido) : null);

export interface AfastamentoComTitular extends Afastamento {
  titularRef: string;
  uf: string | null;
  partido: string | null;
}
export interface EntradaComSuplente extends EntradaSuplente {
  suplenteRef: string;
  suplenteNome: string;
}

/**
 * A Câmara não informa qual suplente ocupou a vaga de qual titular. Casamos pelas datas:
 * mesmo estado, mesmo partido ou federação, posse do suplente até 15 dias depois da saída do titular
 * (45 para saídas definitivas) e, quando houver, saída do suplente até 2 dias da volta do titular.
 * Uma posse de suplente só preenche uma vaga. Quando sobra mais de um candidato, vale o suplente já
 * identificado em outro afastamento do mesmo titular; se nem assim, todos são listados como "possível".
 */
export function casarSuplentesCamara(
  afastamentos: AfastamentoComTitular[],
  entradas: EntradaComSuplente[],
): Map<AfastamentoComTitular, Substituicao[]> {
  const compativeis = (a: AfastamentoComTitular) =>
    entradas.filter((e) => {
      const atraso = e.inicio.getTime() - a.inicio.getTime();
      return (
        e.uf === a.uf &&
        grupo(e.partido) === grupo(a.partido) &&
        atraso >= -DIA &&
        atraso <= (a.definitivo ? 45 : 15) * DIA
      );
    });
  const alinhada = (a: AfastamentoComTitular, e: EntradaComSuplente) =>
    a.fim == null || e.fim == null
      ? a.fim == null && e.fim == null
      : Math.abs(e.fim.getTime() - a.fim.getTime()) <= 2 * DIA;

  // Candidatos de cada afastamento: os alinhados, se houver; senão todos os compatíveis.
  const candidatos = new Map<AfastamentoComTitular, EntradaComSuplente[]>();
  for (const a of afastamentos) {
    const c = compativeis(a);
    const al = c.filter((e) => alinhada(a, e));
    candidatos.set(a, al.length ? al : c);
  }

  // Atribuição, repetida até não mudar nada:
  // 1. quem tem um único candidato livre fica com ele;
  // 2. continuidade: se o suplente já identificado em outro afastamento do mesmo titular está entre os
  //    candidatos, é ele (o suplente costuma ser o mesmo a cada saída).
  const usadas = new Set<EntradaComSuplente>();
  const resolvidos = new Map<AfastamentoComTitular, EntradaComSuplente>();
  const suplentesDoTitular = (titular: string) =>
    new Set([...resolvidos].filter(([a]) => a.titularRef === titular).map(([, e]) => e.suplenteRef));
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const [a, c] of candidatos) {
      if (resolvidos.has(a)) continue;
      const livres = c.filter((e) => !usadas.has(e));
      const conhecidos = suplentesDoTitular(a.titularRef);
      const doMesmo = livres.filter((e) => conhecidos.has(e.suplenteRef));
      const escolhido = livres.length === 1 ? livres[0] : doMesmo.length === 1 ? doMesmo[0] : null;
      if (escolhido) {
        resolvidos.set(a, escolhido);
        usadas.add(escolhido);
        mudou = true;
      }
    }
  }

  const r = new Map<AfastamentoComTitular, Substituicao[]>();
  for (const [a, c] of candidatos) {
    const certo = resolvidos.get(a);
    const alinhado = certo ? alinhada(a, certo) : false;
    const lista = certo ? [certo] : c.filter((e) => !usadas.has(e));
    r.set(
      a,
      lista.map((e) => ({
        suplenteRef: e.suplenteRef,
        suplenteNome: e.suplenteNome,
        inicio: e.inicio,
        fim: e.fim,
        // Único e alinhado com a volta do titular: "datas". Qualquer outra situação: "possível".
        certeza: certo && alinhado ? "datas" : "possivel",
      })),
    );
  }
  return r;
}

// ---------- Senado ----------

interface ExercicioSenado {
  DataInicio?: string;
  DataFim?: string;
  SiglaCausaAfastamento?: string;
  DescricaoCausaAfastamento?: string;
}
interface MandatoSenado extends MandatoApi {
  DescricaoParticipacao?: string;
  PrimeiraLegislaturaDoMandato?: { NumeroLegislatura?: string };
  SegundaLegislaturaDoMandato?: { NumeroLegislatura?: string };
  Suplentes?: {
    Suplente?:
      { CodigoParlamentar: string; NomeParlamentar: string } | { CodigoParlamentar: string; NomeParlamentar: string }[];
  };
  Exercicios?: { Exercicio?: ExercicioSenado | ExercicioSenado[] };
}

const diaSenado = (d: string) => new Date(`${d}T00:00:00-03:00`);
const diaSeguinte = (d: string) => new Date(diaSenado(d).getTime() + DIA);

const alcancaLegislatura = (m: MandatoSenado, minima: number) =>
  Number(m.PrimeiraLegislaturaDoMandato?.NumeroLegislatura) >= minima ||
  Number(m.SegundaLegislaturaDoMandato?.NumeroLegislatura) >= minima;

/**
 * Afastamentos do senador titular: intervalos entre os exercícios do mandato. O motivo é o informado
 * no fim do exercício anterior ("Afastamento do exercício", "Licença com convocação de suplente"...).
 */
export function afastamentosSenado(
  mandatos: MandatoSenado[],
  legislaturaMinima = 57,
): (Afastamento & { suplentes: { codigo: string; nome: string }[] })[] {
  const r: (Afastamento & { suplentes: { codigo: string; nome: string }[] })[] = [];
  for (const m of mandatos) {
    if (m.DescricaoParticipacao !== "Titular" || !alcancaLegislatura(m, legislaturaMinima)) continue;
    const suplentes = comoLista(m.Suplentes?.Suplente).map((s) => ({
      codigo: s.CodigoParlamentar,
      nome: s.NomeParlamentar,
    }));
    const ex = comoLista(m.Exercicios?.Exercicio)
      .filter((e) => e.DataInicio)
      .sort((a, b) => a.DataInicio!.localeCompare(b.DataInicio!));
    ex.forEach((e, i) => {
      if (!e.DataFim || e.SiglaCausaAfastamento === "TER") return; // fim do mandato não é afastamento
      const proximo = ex[i + 1];
      const motivo = e.DescricaoCausaAfastamento?.trim() || "Afastamento";
      r.push({
        inicio: diaSeguinte(e.DataFim),
        fim: proximo?.DataInicio ? diaSenado(proximo.DataInicio) : null,
        motivo,
        definitivo: !proximo && DEFINITIVO.test(motivo),
        suplentes,
      });
    });
  }
  // Mandatos de senador duram duas legislaturas: descartamos o que terminou antes da primeira com dados,
  // saídas definitivas anteriores a ela e intervalos vazios (volta no mesmo dia).
  const corte = inicioLegislatura(legislaturaMinima);
  return r.filter(
    (a) =>
      (a.fim == null || a.fim > a.inicio) && (a.inicio >= corte || (a.fim != null ? a.fim > corte : !a.definitivo)),
  );
}

/** No Senado o mandato lista os suplentes: quem esteve em exercício durante o afastamento ocupou a vaga. */
export function substituicoesSenado(
  a: Afastamento & { suplentes: { codigo: string; nome: string }[] },
  exerciciosPorSuplente: Map<string, { inicio: Date; fim: Date | null }[]>,
): Substituicao[] {
  const fimA = a.fim?.getTime() ?? Infinity;
  return a.suplentes.flatMap((s) =>
    (exerciciosPorSuplente.get(s.codigo) ?? [])
      .filter((e) => e.inicio.getTime() < fimA && (e.fim?.getTime() ?? Infinity) > a.inicio.getTime())
      .map((e) => ({
        suplenteRef: s.codigo,
        suplenteNome: s.nome,
        inicio: e.inicio,
        fim: e.fim,
        certeza: "oficial" as const,
      })),
  );
}
