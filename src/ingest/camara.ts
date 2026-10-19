import { and, eq, inArray, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API } from "./fontes";
import { baixarCsv, baixarJson, hash, lotes } from "./util";

const ARQUIVOS = "https://dadosabertos.camara.leg.br/arquivos";
const arquivoJson = (nome: string, ano: number) => `${ARQUIVOS}/${nome}/json/${nome}-${ano}.json`;

// Tipos de proposição exibidos no perfil. Requerimentos comuns e emendas ficam de fora (volume alto, pouco informativos).
export const TIPOS_PROPOSICAO = new Set(["PEC", "PLP", "PL", "PDL", "PRC", "MPV", "RIC", "INC"]);

/** id externo (Câmara) -> id interno de todos os deputados conhecidos. */
async function mapaDeputados(): Promise<Map<string, number>> {
  const linhas = await db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, "CD"));
  if (linhas.length === 0) throw new Error("Nenhum deputado no banco. Rode antes: npm run ingest -- deputados");
  return new Map(linhas.map((l) => [l.ext, l.id]));
}

// ---------- Presença em plenário ----------

export interface EventoApi {
  id: number;
  dataHoraInicio: string;
  descricaoTipo: string;
  descricao: string;
  situacao: string;
}

export const ehSessaoDeliberativa = (e: EventoApi) =>
  e.descricaoTipo === "Sessão Deliberativa" && !e.situacao.startsWith("Cancelada");

export async function ingerirPresencas(ano: number): Promise<number> {
  const deputados = await mapaDeputados();
  const [{ dados: eventos }, { dados: presencas }] = await Promise.all([
    baixarJson<{ dados: EventoApi[] }>(arquivoJson("eventos", ano)),
    baixarJson<{ dados: { idEvento: number; idDeputado: number }[] }>(arquivoJson("eventosPresencaDeputados", ano)),
  ]);
  const sessoes = eventos.filter(ehSessaoDeliberativa);
  if (sessoes.length === 0) return 0;

  return db.transaction(async (tx) => {
    const salvas = await tx
      .insert(schema.sessao)
      .values(
        sessoes.map((e) => ({
          casa: "CD" as const,
          idExterno: String(e.id),
          inicio: new Date(`${e.dataHoraInicio}-03:00`),
          tipo: e.descricaoTipo,
          descricao: e.descricao,
          fonteUrl: `${CAMARA_API}/eventos/${e.id}`,
        })),
      )
      .onConflictDoUpdate({
        target: [schema.sessao.casa, schema.sessao.idExterno],
        set: { inicio: dsql`excluded.inicio`, descricao: dsql`excluded.descricao`, atualizadoEm: dsql`now()` },
      })
      .returning({ id: schema.sessao.id, ext: schema.sessao.idExterno });
    const sessaoPorExt = new Map(salvas.map((s) => [s.ext, s.id]));

    const linhas = presencas.flatMap((p) => {
      const sessaoId = sessaoPorExt.get(String(p.idEvento));
      const parlamentarId = deputados.get(String(p.idDeputado));
      return sessaoId && parlamentarId ? [{ sessaoId, parlamentarId }] : [];
    });

    // Recarrega as presenças das sessões do ano (a fonte pode corrigir registros).
    for (const ids of lotes([...sessaoPorExt.values()], 5000))
      await tx.delete(schema.presenca).where(inArray(schema.presenca.sessaoId, ids));
    for (const lote of lotes(linhas, 5000)) await tx.insert(schema.presenca).values(lote).onConflictDoNothing();
    return linhas.length;
  });
}

// ---------- Votações nominais de plenário ----------

export interface VotacaoApi {
  id: string;
  dataHoraRegistro: string;
  siglaOrgao: string;
  aprovacao: number | null;
  votosSim: number | null;
  votosNao: number | null;
  votosOutros: number | null;
  descricao: string;
}

// votacoesProposicoes liga cada votação à matéria principal (PL, PEC, MPV...). O arquivo
// votacoesObjetos, ao contrário, lista sobretudo peças acessórias (pareceres, emendas).
interface ProposicaoVotadaApi {
  idVotacao: string;
  proposicao_: { id: number; siglaTipo: string; numero: number; ano: number | null; ementa: string };
}

/** Só votações de plenário com voto individual registrado (nominais). As simbólicas não dizem como cada um votou. */
export const ehNominalDePlenario = (v: VotacaoApi) =>
  v.siglaOrgao === "PLEN" && (v.votosSim ?? 0) + (v.votosNao ?? 0) + (v.votosOutros ?? 0) > 0;

/** O id da votação começa com o id da proposição votada ("1029018-80"); usamos isso para desempatar. */
export function proposicaoPrincipal(v: Pick<VotacaoApi, "id">, proposicoes: ProposicaoVotadaApi["proposicao_"][]) {
  const idDaVotacao = Number(v.id.split("-")[0]);
  return proposicoes.find((p) => p.id === idDaVotacao) ?? proposicoes[0];
}

export const rotuloProposicao = (p: { siglaTipo: string; numero: number; ano: number | null }) =>
  p.ano ? `${p.siglaTipo} ${p.numero}/${p.ano}` : `${p.siglaTipo} ${p.numero}`;

export async function ingerirVotacoes(ano: number): Promise<number> {
  const deputados = await mapaDeputados();
  const [{ dados: votacoes }, { dados: votadas }, { dados: votos }, { dados: orientacoes }] = await Promise.all([
    baixarJson<{ dados: VotacaoApi[] }>(arquivoJson("votacoes", ano)),
    baixarJson<{ dados: ProposicaoVotadaApi[] }>(arquivoJson("votacoesProposicoes", ano)),
    baixarJson<{ dados: { idVotacao: string; voto: string; deputado_: { id: string | number } }[] }>(
      arquivoJson("votacoesVotos", ano),
    ),
    baixarJson<{ dados: { idVotacao: string; siglaBancada: string; orientacao: string }[] }>(
      arquivoJson("votacoesOrientacoes", ano),
    ),
  ]);
  const nominais = votacoes.filter(ehNominalDePlenario);
  if (nominais.length === 0) return 0;

  const proposicoesPorVotacao = new Map<string, ProposicaoVotadaApi["proposicao_"][]>();
  for (const o of votadas) {
    const lista = proposicoesPorVotacao.get(o.idVotacao) ?? [];
    lista.push(o.proposicao_);
    proposicoesPorVotacao.set(o.idVotacao, lista);
  }

  return db.transaction(async (tx) => {
    const salvas: { id: number; ext: string }[] = [];
    for (const lote of lotes(nominais, 500)) {
      const r = await tx
        .insert(schema.votacao)
        .values(
          lote.map((v) => {
            const obj = proposicaoPrincipal(v, proposicoesPorVotacao.get(v.id) ?? []);
            return {
              casa: "CD" as const,
              idExterno: v.id,
              data: new Date(`${v.dataHoraRegistro}-03:00`),
              descricao: v.descricao,
              proposicao: obj ? rotuloProposicao(obj) : null,
              ementa: obj?.ementa ?? null,
              aprovada: v.aprovacao == null ? null : v.aprovacao === 1,
              fonteUrl: `${CAMARA_API}/votacoes/${v.id}`,
            };
          }),
        )
        .onConflictDoUpdate({
          target: [schema.votacao.casa, schema.votacao.idExterno],
          set: {
            descricao: dsql`excluded.descricao`,
            proposicao: dsql`excluded.proposicao`,
            ementa: dsql`excluded.ementa`,
            aprovada: dsql`excluded.aprovada`,
            atualizadoEm: dsql`now()`,
          },
        })
        .returning({ id: schema.votacao.id, ext: schema.votacao.idExterno });
      salvas.push(...r);
    }
    const votacaoPorExt = new Map(salvas.map((s) => [s.ext, s.id]));

    const linhasVoto = votos.flatMap((v) => {
      const votacaoId = votacaoPorExt.get(v.idVotacao);
      const parlamentarId = deputados.get(String(v.deputado_.id));
      return votacaoId && parlamentarId ? [{ votacaoId, parlamentarId, voto: v.voto || "Não informado" }] : [];
    });
    const linhasOrientacao = orientacoes.flatMap((o) => {
      const votacaoId = votacaoPorExt.get(o.idVotacao);
      return votacaoId && o.orientacao ? [{ votacaoId, bancada: o.siglaBancada, orientacao: o.orientacao }] : [];
    });

    for (const ids of lotes([...votacaoPorExt.values()], 5000)) {
      await tx.delete(schema.voto).where(inArray(schema.voto.votacaoId, ids));
      await tx.delete(schema.orientacao).where(inArray(schema.orientacao.votacaoId, ids));
    }
    for (const lote of lotes(linhasVoto, 5000)) await tx.insert(schema.voto).values(lote).onConflictDoNothing();
    for (const lote of lotes(linhasOrientacao, 5000))
      await tx.insert(schema.orientacao).values(lote).onConflictDoNothing();
    return linhasVoto.length;
  });
}

// ---------- Proposições de autoria ----------

interface AutorApi {
  idProposicao: number;
  idDeputadoAutor?: number;
  codTipoAutor: number;
  proponente: string;
}

interface ProposicaoApi {
  id: number;
  siglaTipo: string;
  numero: number;
  ano: number;
  ementa: string;
  dataApresentacao: string;
  ultimoStatus?: { descricaoSituacao?: string };
}

const COD_TIPO_AUTOR_DEPUTADO = 10000;

export async function ingerirProposicoes(ano: number): Promise<number> {
  const deputados = await mapaDeputados();
  const [proposicoes, { dados: autores }] = await Promise.all([
    // O CSV tem aspas malformadas em algumas ementas; o JSON é confiável.
    baixarJson<{ dados: ProposicaoApi[] }>(arquivoJson("proposicoes", ano)).then((r) => r.dados),
    baixarJson<{ dados: AutorApi[] }>(arquivoJson("proposicoesAutores", ano)),
  ]);

  const autoresPorProposicao = new Map<string, number[]>();
  for (const a of autores) {
    if (a.codTipoAutor !== COD_TIPO_AUTOR_DEPUTADO || a.proponente !== "1" || !a.idDeputadoAutor) continue;
    const parlamentarId = deputados.get(String(a.idDeputadoAutor));
    if (!parlamentarId) continue;
    const lista = autoresPorProposicao.get(String(a.idProposicao)) ?? [];
    lista.push(parlamentarId);
    autoresPorProposicao.set(String(a.idProposicao), lista);
  }

  const relevantes = proposicoes.filter((p) => TIPOS_PROPOSICAO.has(p.siglaTipo) && autoresPorProposicao.has(String(p.id)));
  if (relevantes.length === 0) return 0;

  return db.transaction(async (tx) => {
    const salvas: { id: number; ext: string }[] = [];
    for (const lote of lotes(relevantes, 1000)) {
      const r = await tx
        .insert(schema.proposicao)
        .values(
          lote.map((p) => ({
            casa: "CD" as const,
            idExterno: String(p.id),
            siglaTipo: p.siglaTipo,
            numero: p.numero,
            ano: p.ano,
            ementa: p.ementa || null,
            apresentadaEm: p.dataApresentacao ? p.dataApresentacao.slice(0, 10) : null,
            situacao: p.ultimoStatus?.descricaoSituacao || null,
            fonteUrl: `${CAMARA_API}/proposicoes/${p.id}`,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.proposicao.casa, schema.proposicao.idExterno],
          set: {
            ementa: dsql`excluded.ementa`,
            situacao: dsql`excluded.situacao`,
            atualizadoEm: dsql`now()`,
          },
        })
        .returning({ id: schema.proposicao.id, ext: schema.proposicao.idExterno });
      salvas.push(...r);
    }
    const linhas = salvas.flatMap((s) =>
      (autoresPorProposicao.get(s.ext) ?? []).map((parlamentarId) => ({ proposicaoId: s.id, parlamentarId })),
    );
    for (const lote of lotes(linhas, 5000)) await tx.insert(schema.autoria).values(lote).onConflictDoNothing();
    return salvas.length;
  });
}

// ---------- Cota parlamentar (CEAP) ----------

/**
 * Converte as linhas do CSV da cota em despesas. A fonte não tem id único por linha
 * (há parcelas e lançamentos repetidos), então a chave é o hash da linha + nº da ocorrência.
 */
export function mapDespesas(linhas: Record<string, string>[], deputados: Map<string, number>) {
  const ocorrencias = new Map<string, number>();
  return linhas.flatMap((l) => {
    const parlamentarId = deputados.get(l.ideCadastro);
    if (!parlamentarId) return []; // lideranças partidárias e deputados de outras legislaturas
    const base = hash(l.ideCadastro, l.ideDocumento, l.numParcela, l.txtNumero, l.datEmissao, l.vlrLiquido, l.txtCNPJCPF, l.numMes);
    const n = (ocorrencias.get(base) ?? 0) + 1;
    ocorrencias.set(base, n);
    return [
      {
        casa: "CD" as const,
        chave: `${base}-${n}`,
        parlamentarId,
        ano: Number(l.numAno),
        mes: Number(l.numMes),
        data: l.datEmissao ? l.datEmissao.slice(0, 10) : null,
        categoria: l.txtDescricao.replace(/[.\s]+$/, ""),
        fornecedor: l.txtFornecedor || null,
        cnpjCpf: l.txtCNPJCPF || null,
        valor: (Number(l.vlrLiquido.replace(",", ".")) || 0).toFixed(2),
        documentoUrl: l.urlDocumento || null,
        fonteUrl: `https://www.camara.leg.br/cotas/Ano-${l.numAno}.csv.zip`,
      },
    ];
  });
}

export async function ingerirDespesas(ano: number): Promise<number> {
  const deputados = await mapaDeputados();
  const linhas = await baixarCsv(`https://www.camara.leg.br/cotas/Ano-${ano}.csv.zip`, { zip: true });
  const despesas = mapDespesas(linhas, deputados);
  return db.transaction(async (tx) => {
    // O arquivo anual é a verdade: substitui o ano inteiro (lançamentos podem ser estornados).
    await tx.delete(schema.despesa).where(and(eq(schema.despesa.casa, "CD"), eq(schema.despesa.ano, ano)));
    for (const lote of lotes(despesas, 2000)) await tx.insert(schema.despesa).values(lote).onConflictDoNothing();
    return despesas.length;
  });
}
