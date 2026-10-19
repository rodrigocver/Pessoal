import { eq, inArray, sql as dsql } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API, SENADO_API, legislaturasComDados } from "./fontes";
import { getJson } from "./http";
import { comoLista } from "./parlamentares";
import { baixarJson, lotes } from "./util";

const ARQUIVOS = "https://dadosabertos.camara.leg.br/arquivos";

/** Órgãos da Câmara cuja presença em reuniões entra na métrica de comissões. */
export const TIPOS_COMISSAO_CAMARA = new Set([
  "Comissão Permanente",
  "Comissão Especial",
  "Comissão Parlamentar de Inquérito",
]);

/** Reuniões em que há deliberação (votação de matérias); audiências e seminários não entram. */
export const TIPOS_REUNIAO_DELIBERATIVA = new Set(["Reunião Deliberativa", "Audiência Pública e Deliberação"]);

/** Titular é qualquer cargo de membro que não seja suplente (Presidente, Vice, Relator também são titulares). */
export const ehTitular = (cargo: string) => cargo !== "Suplente";

const idDaUri = (uri: string) => uri.slice(uri.lastIndexOf("/") + 1);
const dataOuNulo = (d: string | null | undefined) => (d ? d.slice(0, 10) : null);

// ---------- Câmara: órgãos e membros ----------

interface OrgaoCamaraApi {
  uri: string;
  sigla: string;
  nome: string;
  apelido?: string;
  tipoOrgao: string;
}

interface MembroCamaraApi {
  uriOrgao: string;
  uriDeputado: string;
  cargo: string;
  dataInicio: string;
  dataFim: string;
}

export function mapMembrosCamara(linhas: MembroCamaraApi[]) {
  return linhas
    .filter((m) => m.dataInicio)
    .map((m) => ({
      orgaoRef: idDaUri(m.uriOrgao),
      deputadoRef: idDaUri(m.uriDeputado),
      cargo: m.cargo.trim(),
      inicio: m.dataInicio.slice(0, 10),
      fim: dataOuNulo(m.dataFim),
    }));
}

async function salvarOrgaos(
  casa: "CD" | "SF",
  orgaos: { idExterno: string; sigla: string; nome: string; tipo: string | null; fonteUrl: string }[],
) {
  const r = new Map<string, number>();
  for (const lote of lotes(orgaos, 1000)) {
    const salvos = await db
      .insert(schema.orgao)
      .values(lote.map((o) => ({ casa, ...o })))
      .onConflictDoUpdate({
        target: [schema.orgao.casa, schema.orgao.idExterno],
        set: {
          sigla: dsql`excluded.sigla`,
          nome: dsql`excluded.nome`,
          tipo: dsql`coalesce(excluded.tipo, ${schema.orgao.tipo})`,
          atualizadoEm: dsql`now()`,
        },
      })
      .returning({ id: schema.orgao.id, ext: schema.orgao.idExterno });
    for (const s of salvos) r.set(s.ext, s.id);
  }
  return r;
}

async function mapaParlamentares(casa: "CD" | "SF") {
  const linhas = await db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, casa));
  return new Map(linhas.map((l) => [l.ext, l.id]));
}

/** Membros das comissões nas legislaturas com dados (arquivo orgaosDeputados-L{n}). */
export async function ingerirComissoesCamara(): Promise<number> {
  const { dados: orgaos } = await baixarJson<{ dados: OrgaoCamaraApi[] }>(`${ARQUIVOS}/orgaos/json/orgaos.json`);
  const orgaoPorExt = await salvarOrgaos(
    "CD",
    orgaos.map((o) => ({
      idExterno: idDaUri(o.uri),
      sigla: o.sigla,
      nome: o.nome,
      tipo: o.tipoOrgao || null,
      fonteUrl: `${CAMARA_API}/orgaos/${idDaUri(o.uri)}`,
    })),
  );
  const deputados = await mapaParlamentares("CD");
  const membros = (
    await Promise.all(
      legislaturasComDados().map((n) =>
        baixarJson<{ dados: MembroCamaraApi[] }>(`${ARQUIVOS}/orgaosDeputados/json/orgaosDeputados-L${n}.json`).then(
          (r) => mapMembrosCamara(r.dados),
        ),
      ),
    )
  ).flat();
  const linhas = membros.flatMap((m) => {
    const parlamentarId = deputados.get(m.deputadoRef);
    const orgaoId = orgaoPorExt.get(m.orgaoRef);
    return parlamentarId && orgaoId ? [{ parlamentarId, orgaoId, cargo: m.cargo, inicio: m.inicio, fim: m.fim }] : [];
  });
  await db.transaction(async (tx) => {
    await tx.execute(
      dsql`delete from membro_orgao where parlamentar_id in (select id from parlamentar where casa = 'CD')`,
    );
    for (const lote of lotes(linhas, 5000)) await tx.insert(schema.membroOrgao).values(lote).onConflictDoNothing();
  });
  return linhas.length;
}

// ---------- Câmara: reuniões de comissão e presença ----------

interface EventoApi {
  id: number;
  dataHoraInicio: string;
  descricaoTipo: string;
  descricao: string;
  situacao: string;
}

/** Reuniões deliberativas realizadas, ligadas às comissões que entram na métrica. */
export function reunioesDeliberativas(
  eventos: EventoApi[],
  eventoOrgaos: { idEvento: number; idOrgao: number }[],
  tipoDoOrgao: (orgaoRef: string) => string | null | undefined,
) {
  const orgaosPorEvento = new Map<number, string[]>();
  for (const eo of eventoOrgaos) {
    const lista = orgaosPorEvento.get(eo.idEvento) ?? [];
    lista.push(String(eo.idOrgao));
    orgaosPorEvento.set(eo.idEvento, lista);
  }
  return eventos
    .filter((e) => TIPOS_REUNIAO_DELIBERATIVA.has(e.descricaoTipo) && !e.situacao.startsWith("Cancelada"))
    .flatMap((e) =>
      // Reunião conjunta de duas comissões conta para os membros de cada uma.
      (orgaosPorEvento.get(e.id) ?? [])
        .filter((o) => TIPOS_COMISSAO_CAMARA.has(tipoDoOrgao(o) ?? ""))
        .map((orgaoRef) => ({
          eventoRef: String(e.id),
          orgaoRef,
          inicio: e.dataHoraInicio,
          tipo: e.descricaoTipo,
          descricao: e.descricao,
        })),
    );
}

export async function ingerirReunioesCamara(ano: number): Promise<number> {
  const deputados = await mapaParlamentares("CD");
  const orgaos = await db
    .select({ id: schema.orgao.id, ext: schema.orgao.idExterno, tipo: schema.orgao.tipo })
    .from(schema.orgao)
    .where(eq(schema.orgao.casa, "CD"));
  if (orgaos.length === 0) throw new Error("Nenhum órgão no banco. Rode antes: npm run ingest -- camara:comissoes");
  const orgaoPorExt = new Map(orgaos.map((o) => [o.ext, o]));
  const [{ dados: eventos }, { dados: eventoOrgaos }, { dados: presencas }] = await Promise.all([
    baixarJson<{ dados: EventoApi[] }>(`${ARQUIVOS}/eventos/json/eventos-${ano}.json`),
    baixarJson<{ dados: { idEvento: number; idOrgao: number }[] }>(
      `${ARQUIVOS}/eventosOrgaos/json/eventosOrgaos-${ano}.json`,
    ),
    baixarJson<{ dados: { idEvento: number; idDeputado: number }[] }>(
      `${ARQUIVOS}/eventosPresencaDeputados/json/eventosPresencaDeputados-${ano}.json`,
    ),
  ]);
  const reunioes = reunioesDeliberativas(eventos, eventoOrgaos, (o) => orgaoPorExt.get(o)?.tipo);
  if (reunioes.length === 0) return 0;

  return db.transaction(async (tx) => {
    const salvas: { id: number; ext: string; orgaoId: number }[] = [];
    for (const lote of lotes(reunioes, 1000)) {
      const r = await tx
        .insert(schema.reuniao)
        .values(
          lote.map((x) => ({
            casa: "CD" as const,
            idExterno: x.eventoRef,
            orgaoId: orgaoPorExt.get(x.orgaoRef)!.id,
            inicio: new Date(`${x.inicio}-03:00`),
            tipo: x.tipo,
            descricao: x.descricao,
            fonteUrl: `${CAMARA_API}/eventos/${x.eventoRef}`,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.reuniao.casa, schema.reuniao.idExterno, schema.reuniao.orgaoId],
          set: {
            inicio: dsql`excluded.inicio`,
            tipo: dsql`excluded.tipo`,
            descricao: dsql`excluded.descricao`,
            atualizadoEm: dsql`now()`,
          },
        })
        .returning({ id: schema.reuniao.id, ext: schema.reuniao.idExterno, orgaoId: schema.reuniao.orgaoId });
      salvas.push(...r);
    }
    const reunioesPorEvento = new Map<string, number[]>();
    for (const s of salvas) reunioesPorEvento.set(s.ext, [...(reunioesPorEvento.get(s.ext) ?? []), s.id]);
    const linhas = presencas.flatMap((p) => {
      const parlamentarId = deputados.get(String(p.idDeputado));
      return parlamentarId
        ? (reunioesPorEvento.get(String(p.idEvento)) ?? []).map((reuniaoId) => ({ reuniaoId, parlamentarId }))
        : [];
    });
    for (const ids of lotes(
      salvas.map((s) => s.id),
      5000,
    ))
      await tx.delete(schema.presencaReuniao).where(inArray(schema.presencaReuniao.reuniaoId, ids));
    for (const lote of lotes(linhas, 5000)) await tx.insert(schema.presencaReuniao).values(lote).onConflictDoNothing();
    return linhas.length;
  });
}

// ---------- Senado: comissões e relatorias ----------

interface ComissaoSenadoApi {
  IdentificacaoComissao: {
    CodigoComissao: string;
    SiglaComissao: string;
    NomeComissao: string;
    SiglaCasaComissao: string;
  };
  DescricaoParticipacao: string;
  DataInicio?: string;
  DataFim?: string;
}

/** Grupos parlamentares (de amizade com outros países) não são comissões. */
export const tipoColegiadoSenado = (nome: string) => (/^Grupo Parlamentar/i.test(nome) ? "Grupo Parlamentar" : null);

export function mapComissoesSenado(lista: ComissaoSenadoApi[]) {
  return lista
    .filter((c) => c.DataInicio)
    .map((c) => ({
      orgao: {
        idExterno: c.IdentificacaoComissao.CodigoComissao,
        sigla: c.IdentificacaoComissao.SiglaComissao,
        nome: c.IdentificacaoComissao.NomeComissao,
        tipo: tipoColegiadoSenado(c.IdentificacaoComissao.NomeComissao),
      },
      cargo: c.DescricaoParticipacao.trim(),
      inicio: c.DataInicio!.slice(0, 10),
      fim: dataOuNulo(c.DataFim),
    }));
}

export async function ingerirComissoesSenado(): Promise<number> {
  const senadores = await db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, "SF"));
  const participacoes: { parlamentarId: number; m: ReturnType<typeof mapComissoesSenado>[number] }[] = [];
  const fila = [...senadores];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let s = fila.shift(); s; s = fila.shift()) {
        const r = await getJson<{
          MembroComissaoParlamentar: {
            Parlamentar: { MembroComissoes?: { Comissao?: ComissaoSenadoApi | ComissaoSenadoApi[] } };
          };
        }>(`${SENADO_API}/senador/${s.ext}/comissoes.json`);
        for (const m of mapComissoesSenado(
          comoLista(r.MembroComissaoParlamentar.Parlamentar.MembroComissoes?.Comissao),
        ))
          participacoes.push({ parlamentarId: s.id, m });
      }
    }),
  );
  const orgaosUnicos = new Map(participacoes.map((p) => [p.m.orgao.idExterno, p.m.orgao]));
  const orgaoPorExt = await salvarOrgaos(
    "SF",
    [...orgaosUnicos.values()].map((o) => ({ ...o, fonteUrl: `${SENADO_API}/comissao/${o.idExterno}` })),
  );
  const linhas = participacoes.map((p) => ({
    parlamentarId: p.parlamentarId,
    orgaoId: orgaoPorExt.get(p.m.orgao.idExterno)!,
    cargo: p.m.cargo,
    inicio: p.m.inicio,
    fim: p.m.fim,
  }));
  await db.transaction(async (tx) => {
    await tx.execute(
      dsql`delete from membro_orgao where parlamentar_id in (select id from parlamentar where casa = 'SF')`,
    );
    for (const lote of lotes(linhas, 5000)) await tx.insert(schema.membroOrgao).values(lote).onConflictDoNothing();
  });
  return linhas.length;
}

interface RelatoriaSenadoApi {
  idProcesso: number;
  identificacaoProcesso: string;
  ementaProcesso: string | null;
  siglaColegiado: string;
  descricaoTipoRelator: string | null;
  dataDesignacao: string;
  dataDestituicao: string | null;
  descricaoTipoEncerramento: string | null;
}

const horaSenado = (s: string) => new Date(`${s.replace(" ", "T")}-03:00`);

/** A API às vezes repete a mesma relatoria na resposta: fica uma por processo, colegiado e designação. */
export function mapRelatoriasSenado(lista: RelatoriaSenadoApi[]) {
  const vistas = new Set<string>();
  return lista
    .filter((r) => r.dataDesignacao && r.identificacaoProcesso)
    .filter((r) => {
      const chave = `${r.idProcesso}|${r.siglaColegiado}|${r.dataDesignacao}`;
      return !vistas.has(chave) && !!vistas.add(chave);
    })
    .map((r) => ({
      proposicao: r.identificacaoProcesso,
      proposicaoRef: String(r.idProcesso),
      ementa: r.ementaProcesso,
      colegiado: r.siglaColegiado,
      tipoRelator: r.descricaoTipoRelator,
      designacao: horaSenado(r.dataDesignacao),
      destituicao: r.dataDestituicao ? horaSenado(r.dataDestituicao) : null,
      motivoFim: r.descricaoTipoEncerramento,
    }));
}

/** Relatorias designadas no ano, para quem esteve em exercício (o serviço limita a consulta a um ano). */
export async function ingerirRelatoriasSenado(ano: number): Promise<number> {
  const senadores = await db.execute<{ id: number; ext: string }>(dsql`
    select p.id, p.id_externo as ext from parlamentar p
    where p.casa = 'SF' and (p.em_exercicio or exists (select 1 from exercicio e where e.parlamentar_id = p.id))`);
  const hoje = new Date().toISOString().slice(0, 10);
  const fim = `${ano}-12-31` < hoje ? `${ano}-12-31` : hoje;
  let total = 0;
  const fila = [...senadores];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let s = fila.shift(); s; s = fila.shift()) {
        const url = `${SENADO_API}/processo/relatoria?codigoParlamentar=${s.ext}&dataInicio=${ano}-01-01&dataFim=${fim}`;
        const rel = mapRelatoriasSenado(await getJson<RelatoriaSenadoApi[]>(url));
        if (rel.length === 0) continue;
        await db
          .insert(schema.relatoria)
          .values(rel.map((r) => ({ casa: "SF" as const, parlamentarId: s.id, ...r, fonteUrl: url })))
          .onConflictDoUpdate({
            target: [
              schema.relatoria.casa,
              schema.relatoria.parlamentarId,
              schema.relatoria.proposicaoRef,
              schema.relatoria.colegiado,
              schema.relatoria.designacao,
            ],
            set: {
              destituicao: dsql`excluded.destituicao`,
              motivoFim: dsql`excluded.motivo_fim`,
              ementa: dsql`excluded.ementa`,
              atualizadoEm: dsql`now()`,
            },
          });
        total += rel.length;
      }
    }),
  );
  return total;
}
