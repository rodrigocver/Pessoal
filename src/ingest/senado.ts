import { and, eq, inArray, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { SENADO_API } from "./fontes";
import { getJson } from "./http";
import { lotes } from "./util";

const CEAPS_API = "https://adm.senado.gov.br/adm-dadosabertos/api/v1/senadores/despesas_ceaps";

async function mapaSenadores(): Promise<Map<string, number>> {
  const linhas = await db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, "SF"));
  if (linhas.length === 0) throw new Error("Nenhum senador no banco. Rode antes: npm run ingest -- senadores");
  return new Map(linhas.map((l) => [l.ext, l.id]));
}

/** Janelas mensais do ano (respostas menores falham menos), sem passar de hoje. */
export function meses(ano: number, hoje = new Date()): [string, string][] {
  const r: [string, string][] = [];
  for (let m = 1; m <= 12; m++) {
    const ini = `${ano}-${String(m).padStart(2, "0")}-01`;
    if (new Date(ini) > hoje) break;
    const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
    r.push([ini, `${ano}-${String(m).padStart(2, "0")}-${ultimo}`]);
  }
  return r;
}

// ---------- Votações e comparecimento ----------

export interface VotacaoSenadoApi {
  codigoSessao: number;
  codigoSessaoVotacao: number;
  sequencialVotacao: number;
  idProcesso: number | null;
  numeroSessao: number;
  dataSessao: string;
  descricaoVotacao: string;
  identificacao: string | null;
  ementa: string | null;
  resultadoVotacao: string | null;
  votacaoSecreta: string;
  votos: { codigoParlamentar: number; siglaVotoParlamentar: string; siglaPartidoParlamentar?: string | null }[];
}

/**
 * O Senado não publica lista de presença. Usamos o comparecimento às votações nominais:
 * cada voto traz o código de comparecimento do senador. Estes indicam que ele estava no plenário.
 */
export const CODIGOS_PRESENTE = new Set([
  "Sim",
  "Não",
  "Abstenção",
  "Votou",
  "Obstrução",
  "P-NRV",
  "Presidente (art. 51 RISF)",
]);

const ROTULOS_VOTO: Record<string, string> = {
  Votou: "Votou (secreto)",
  "P-NRV": "Presente, sem voto",
  "Presidente (art. 51 RISF)": "Presidente da sessão",
  AP: "Ausente: atividade parlamentar",
  MIS: "Ausente: missão oficial",
  LS: "Ausente: licença saúde",
  LP: "Ausente: licença particular",
  LAP: "Ausente: licença particular",
  NCom: "Não compareceu",
  NA: "Ausente",
};
export const rotuloVotoSenado = (codigo: string) => ROTULOS_VOTO[codigo] ?? codigo;

export async function ingerirVotacoesSenado(ano: number): Promise<number> {
  const senadores = await mapaSenadores();
  const porId = new Map<number, VotacaoSenadoApi>();
  const orientacoesPorSequencial = new Map<number, { partido: string | null; voto: string | null }[]>();
  for (const [ini, fim] of meses(ano)) {
    const [votacoes, orientacoes] = await Promise.all([
      getJson<VotacaoSenadoApi[]>(`${SENADO_API}/votacao?dataInicio=${ini}&dataFim=${fim}`),
      getJson<{
        votacoes: {
          sequencialVotacao: number;
          orientacoesLideranca: { partido: string | null; voto: string | null }[];
        }[];
      }>(`${SENADO_API}/plenario/votacao/orientacaoBancada/${ini.replaceAll("-", "")}/${fim.replaceAll("-", "")}.json`),
    ]);
    for (const v of votacoes) porId.set(v.codigoSessaoVotacao, v);
    for (const o of orientacoes.votacoes) orientacoesPorSequencial.set(o.sequencialVotacao, o.orientacoesLideranca);
  }
  const votacoes = [...porId.values()];
  if (votacoes.length === 0) return 0;
  const data = (v: VotacaoSenadoApi) => new Date(`${v.dataSessao}T12:00:00-03:00`); // a fonte só traz o dia

  return db.transaction(async (tx) => {
    // Sessões = sessões que tiveram ao menos uma votação nominal.
    const sessoesUnicas = new Map(votacoes.map((v) => [v.codigoSessao, v]));
    const sessoes = await tx
      .insert(schema.sessao)
      .values(
        [...sessoesUnicas.values()].map((v) => ({
          casa: "SF" as const,
          idExterno: String(v.codigoSessao),
          inicio: data(v),
          tipo: "Sessão Deliberativa",
          descricao: `${v.numeroSessao}ª sessão deliberativa`,
          fonteUrl: `${SENADO_API}/votacao?codigoSessao=${v.codigoSessao}`,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.sessao.casa, schema.sessao.idExterno],
        set: { inicio: dsql`excluded.inicio`, atualizadoEm: dsql`now()` },
      })
      .returning({ id: schema.sessao.id, ext: schema.sessao.idExterno });
    const sessaoPorExt = new Map(sessoes.map((s) => [s.ext, s.id]));

    const salvas: { id: number; ext: string }[] = [];
    for (const lote of lotes(votacoes, 500)) {
      const r = await tx
        .insert(schema.votacao)
        .values(
          lote.map((v) => ({
            casa: "SF" as const,
            idExterno: String(v.codigoSessaoVotacao),
            data: data(v),
            descricao: v.descricaoVotacao + (v.votacaoSecreta === "S" ? " (votação secreta)" : ""),
            proposicao: v.identificacao,
            proposicaoRef: v.idProcesso ? String(v.idProcesso) : null,
            ementa: v.ementa,
            aprovada: v.resultadoVotacao === "A" ? true : v.resultadoVotacao === "R" ? false : null,
            fonteUrl: `${SENADO_API}/votacao?codigoSessao=${v.codigoSessao}`,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.votacao.casa, schema.votacao.idExterno],
          set: {
            descricao: dsql`excluded.descricao`,
            proposicao: dsql`excluded.proposicao`,
            proposicaoRef: dsql`excluded.proposicao_ref`,
            ementa: dsql`excluded.ementa`,
            aprovada: dsql`excluded.aprovada`,
            atualizadoEm: dsql`now()`,
          },
        })
        .returning({ id: schema.votacao.id, ext: schema.votacao.idExterno });
      salvas.push(...r);
    }
    const votacaoPorExt = new Map(salvas.map((s) => [s.ext, s.id]));

    const votos: (typeof schema.voto.$inferInsert)[] = [];
    const presencas = new Map<string, { sessaoId: number; parlamentarId: number }>();
    const orientacoes: (typeof schema.orientacao.$inferInsert)[] = [];
    for (const v of votacoes) {
      const votacaoId = votacaoPorExt.get(String(v.codigoSessaoVotacao))!;
      const sessaoId = sessaoPorExt.get(String(v.codigoSessao))!;
      for (const voto of v.votos) {
        const parlamentarId = senadores.get(String(voto.codigoParlamentar));
        if (!parlamentarId) continue;
        votos.push({
          votacaoId,
          parlamentarId,
          voto: rotuloVotoSenado(voto.siglaVotoParlamentar),
          partido: voto.siglaPartidoParlamentar ?? null,
        });
        if (CODIGOS_PRESENTE.has(voto.siglaVotoParlamentar))
          presencas.set(`${sessaoId}-${parlamentarId}`, { sessaoId, parlamentarId });
      }
      for (const o of orientacoesPorSequencial.get(v.sequencialVotacao) ?? [])
        if (o.voto && o.partido)
          orientacoes.push({ votacaoId, bancada: o.partido, orientacao: normalizarOrientacao(o.voto) });
    }

    for (const ids of lotes([...votacaoPorExt.values()], 5000)) {
      await tx.delete(schema.voto).where(inArray(schema.voto.votacaoId, ids));
      await tx.delete(schema.orientacao).where(inArray(schema.orientacao.votacaoId, ids));
    }
    for (const ids of lotes([...sessaoPorExt.values()], 5000))
      await tx.delete(schema.presenca).where(inArray(schema.presenca.sessaoId, ids));
    for (const lote of lotes(votos, 5000)) await tx.insert(schema.voto).values(lote).onConflictDoNothing();
    for (const lote of lotes([...presencas.values()], 5000))
      await tx.insert(schema.presenca).values(lote).onConflictDoNothing();
    for (const lote of lotes(orientacoes, 5000)) await tx.insert(schema.orientacao).values(lote).onConflictDoNothing();
    return votos.length;
  });
}

const ORIENTACOES: Record<string, string> = {
  SIM: "Sim",
  NÃO: "Não",
  NAO: "Não",
  ABSTENÇÃO: "Abstenção",
  ABSTENCAO: "Abstenção",
  OBSTRUÇÃO: "Obstrução",
  OBSTRUCAO: "Obstrução",
  // "Livre" no Senado = "Liberado" na Câmara: a bancada não orientou.
  LIVRE: "Liberado",
  LIBERADO: "Liberado",
};

/** Padroniza a orientação no vocabulário da Câmara (Sim, Não, Abstenção, Obstrução, Liberado). */
export const normalizarOrientacao = (v: string) => ORIENTACOES[v.trim().toUpperCase()] ?? v.trim();

// ---------- Proposições de autoria ----------

export const TIPOS_PROPOSICAO_SENADO = new Set(["PEC", "PL", "PLP", "PDL", "PRS"]);

interface ProcessoApi {
  id: number;
  identificacao: string; // "PL 123/2025"
  ementa: string | null;
  dataApresentacao: string | null;
  situacaoAtual: string | null;
}

export function parseIdentificacao(id: string): { siglaTipo: string; numero: number; ano: number } | null {
  const m = /^(\S+)\s+(\d+)\/(\d{4})$/.exec(id.trim());
  return m ? { siglaTipo: m[1], numero: Number(m[2]), ano: Number(m[3]) } : null;
}

export async function ingerirProposicoesSenado(ano: number): Promise<number> {
  // Consultamos por autor: só quem esteve em exercício (marcados agora ou com votos registrados).
  const autores = await db.execute<{ id: number; ext: string }>(dsql`
    select p.id, p.id_externo as ext from parlamentar p
    where p.casa = 'SF' and (p.em_exercicio or exists (select 1 from voto v where v.parlamentar_id = p.id))`);
  const hoje = new Date().toISOString().slice(0, 10);
  const fim = `${ano}-12-31` < hoje ? `${ano}-12-31` : hoje;
  let total = 0;

  // Algumas consultas em paralelo; o servidor do Senado não aguenta muitas.
  const fila = [...autores];
  const trabalhar = async () => {
    for (let a = fila.shift(); a; a = fila.shift()) {
      const processos = await getJson<ProcessoApi[]>(
        `${SENADO_API}/processo?codigoParlamentarAutor=${a.ext}&dataInicioApresentacao=${ano}-01-01&dataFimApresentacao=${fim}`,
      );
      const validos = processos.flatMap((p) => {
        const ident = parseIdentificacao(p.identificacao);
        return ident && TIPOS_PROPOSICAO_SENADO.has(ident.siglaTipo) ? [{ p, ident }] : [];
      });
      if (validos.length === 0) continue;
      const salvas = await db
        .insert(schema.proposicao)
        .values(
          validos.map(({ p, ident }) => ({
            casa: "SF" as const,
            idExterno: String(p.id),
            ...ident,
            ementa: p.ementa,
            apresentadaEm: p.dataApresentacao,
            situacao: p.situacaoAtual,
            fonteUrl: `${SENADO_API}/processo/${p.id}`,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.proposicao.casa, schema.proposicao.idExterno],
          set: { ementa: dsql`excluded.ementa`, situacao: dsql`excluded.situacao`, atualizadoEm: dsql`now()` },
        })
        .returning({ id: schema.proposicao.id });
      await db
        .insert(schema.autoria)
        .values(salvas.map((s) => ({ proposicaoId: s.id, parlamentarId: a.id })))
        .onConflictDoNothing();
      total += salvas.length;
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabalhar));
  return total;
}

// ---------- Cota (CEAPS) ----------

interface DespesaSenadoApi {
  id: number;
  ano: number;
  mes: number;
  codSenador: number;
  tipoDespesa: string | null;
  cpfCnpj: string | null;
  fornecedor: string | null;
  data: string | null;
  valorReembolsado: number;
}

// Os nomes de categoria do Senado são frases longas; encurtamos os conhecidos.
const CATEGORIAS_SENADO: [RegExp, string][] = [
  [/^Locomoção/i, "Locomoção, hospedagem, alimentação e combustíveis"],
  [/^Aluguel de imóveis/i, "Aluguel de escritório político"],
  [/^Passagens aéreas/i, "Passagens aéreas, aquáticas e terrestres"],
  [/^Contratação de consultorias/i, "Consultorias e assessorias"],
  [/^Aquisição de material de consumo/i, "Material de consumo e escritório"],
  [/^Divulgação/i, "Divulgação da atividade parlamentar"],
  [/^Serviços de Segurança/i, "Segurança privada"],
];
export const categoriaSenado = (t: string | null) =>
  !t ? "Não informada" : (CATEGORIAS_SENADO.find(([re]) => re.test(t))?.[1] ?? t.trim().replace(/\.$/, ""));

export async function ingerirDespesasSenado(ano: number): Promise<number> {
  const senadores = await mapaSenadores();
  const itens = await getJson<DespesaSenadoApi[]>(`${CEAPS_API}/${ano}`, { timeoutMs: 600_000 });
  const despesas = itens.flatMap((d) => {
    const parlamentarId = senadores.get(String(d.codSenador));
    if (!parlamentarId) return [];
    return [
      {
        casa: "SF" as const,
        chave: String(d.id),
        parlamentarId,
        ano: d.ano,
        mes: d.mes,
        data: d.data,
        categoria: categoriaSenado(d.tipoDespesa),
        fornecedor: d.fornecedor,
        cnpjCpf: d.cpfCnpj,
        valor: d.valorReembolsado.toFixed(2),
        documentoUrl: null,
        fonteUrl: `${CEAPS_API}/${ano}`,
      },
    ];
  });
  return db.transaction(async (tx) => {
    await tx.delete(schema.despesa).where(and(eq(schema.despesa.casa, "SF"), eq(schema.despesa.ano, ano)));
    for (const lote of lotes(despesas, 2000)) await tx.insert(schema.despesa).values(lote).onConflictDoNothing();
    return despesas.length;
  });
}
