import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/client";
import { CAMARA_API } from "./fontes";
import { getJson } from "./http";
import { baixarArquivo, lotes } from "./util";
import { lerEntradaZip, listarZip } from "./zipRemoto";

const TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele";

/** Cargos das eleições gerais que levam ao Congresso. */
export const CARGOS_CONGRESSO = new Set(["DEPUTADO FEDERAL", "SENADOR", "1º SUPLENTE", "2º SUPLENTE"]);

/** Origens de doadores institucionais, que aparecem pelo nome. Pessoas físicas ficam agregadas. Empresas podiam
 *  doar até 2014 (pessoas jurídicas, não cidadãos); comitês financeiros existiam até 2014. */
const ORIGENS_INSTITUCIONAIS = new Set([
  "Recursos de partido político",
  "Recursos de outros candidatos",
  "Recursos de outros candidatos/comitês",
  "Recursos de pessoas jurídicas",
]);

type Linha = Record<string, string>;

/** CSVs do TSE: latin1, separados por ";", com aspas. */
export const lerCsvTse = (buf: Buffer | Uint8Array): Linha[] =>
  parse(Buffer.from(buf).toString("latin1"), {
    delimiter: ";",
    // Arquivos de 2010 trazem espaços sobrando no fim do cabeçalho.
    columns: (cab: string[]) => cab.map((c) => c.trim()),
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

/** Até 2010 o TSE gravava "1º SUPLENTE SENADOR" e "MÉDIA" (eleito por média); converte para os nomes atuais. */
export function normalizarCandidato(l: Linha): Linha {
  const cargo = l.DS_CARGO?.replace(/^(\d)º SUPLENTE SENADOR$/, "$1º SUPLENTE");
  const sit = l.DS_SIT_TOT_TURNO === "MÉDIA" ? "ELEITO POR MÉDIA" : l.DS_SIT_TOT_TURNO;
  return cargo === l.DS_CARGO && sit === l.DS_SIT_TOT_TURNO ? l : { ...l, DS_CARGO: cargo, DS_SIT_TOT_TURNO: sit };
}

/** "RECURSOS DE PARTIDO POLÍTICO" (2010) -> "Recursos de partido político". */
const frase = (s: string) => (s === s.toUpperCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);

/** Receitas de 2014 e 2010 têm cabeçalhos por extenso ("Sequencial Candidato"); converte para os nomes atuais. */
export function normalizarReceita(l: Linha): Linha {
  if (l.SQ_CANDIDATO) return l;
  return {
    SQ_CANDIDATO: l["Sequencial Candidato"],
    DS_ORIGEM_RECEITA: frase(l["Tipo receita"] ?? ""),
    NM_DOADOR: l["Nome do doador"],
    NM_DOADOR_RFB: l["Nome do doador (Receita Federal)"] ?? "",
    NR_CPF_CNPJ_DOADOR: l["CPF/CNPJ do doador"],
    VR_RECEITA: l["Valor receita"],
  };
}

/** "20000,00" -> 20000. Campos nulos do TSE ("#NULO", "-1") viram 0. */
export const valorTse = (v: string | undefined) => {
  const n = Number((v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export interface Candidatura {
  parlamentarId: number;
  ano: number;
  eleicao: string | null;
  dataEleicao: string | null;
  cargo: string;
  uf: string;
  partido: string | null;
  numero: string | null;
  nomeUrna: string | null;
  situacao: string | null;
  sqCandidato: string;
}

/**
 * Liga candidatos do TSE a parlamentares. Deputados: pelo CPF (a Câmara publica o CPF de cada deputado),
 * ligação exata. Senadores: o Senado não publica CPF, então pelo nome completo e estado — e só quando todos
 * os candidatos com esse nome no estado naquela eleição são a mesma pessoa (mesmo CPF no TSE).
 */
export function casarCandidaturas(
  ano: number,
  candidatos: Linha[],
  deputados: { id: number; cpf: string }[],
  senadores: { id: number; nomeCompleto: string; uf: string }[],
): Candidatura[] {
  const doCongresso = candidatos.map(normalizarCandidato).filter((c) => CARGOS_CONGRESSO.has(c.DS_CARGO));
  const porCpf = new Map(deputados.filter((d) => d.cpf).map((d) => [d.cpf, d.id]));
  const porNome = new Map<string, Linha[]>();
  for (const c of doCongresso) {
    const k = `${norm(c.NM_CANDIDATO)}|${c.SG_UF}`;
    porNome.set(k, [...(porNome.get(k) ?? []), c]);
  }
  const para = (c: Linha, parlamentarId: number): Candidatura => ({
    parlamentarId,
    ano,
    eleicao: c.DS_ELEICAO || null,
    dataEleicao: /^\d{2}\/\d{2}\/\d{4}$/.test(c.DT_ELEICAO ?? "") ? c.DT_ELEICAO.split("/").reverse().join("-") : null,
    cargo: c.DS_CARGO,
    uf: c.SG_UF,
    partido: c.SG_PARTIDO || null,
    numero: c.NR_CANDIDATO || null,
    nomeUrna: c.NM_URNA_CANDIDATO || null,
    situacao:
      c.DS_SIT_TOT_TURNO && c.DS_SIT_TOT_TURNO !== "#NULO" ? c.DS_SIT_TOT_TURNO : c.DS_SITUACAO_CANDIDATURA || null,
    sqCandidato: c.SQ_CANDIDATO,
  });
  // O TSE repete candidaturas (registro anulado "#NULO#" + o válido; eleição suplementar no mesmo
  // arquivo). Por pessoa e cargo, fica o melhor registro: eleito > válido > anulado.
  const peso = (c: Linha) => (/^ELEITO/.test(c.DS_SIT_TOT_TURNO) ? 3 : /NULO/.test(c.DS_SIT_TOT_TURNO) ? 1 : 2);
  const melhor = new Map<string, { c: Linha; id: number }>();
  const considerar = (c: Linha, id: number) => {
    const k = `${id}|${c.DS_CARGO}`;
    const atual = melhor.get(k);
    if (!atual || peso(c) > peso(atual.c)) melhor.set(k, { c, id });
  };
  for (const c of doCongresso) {
    const id = porCpf.get(c.NR_CPF_CANDIDATO);
    if (id) considerar(c, id);
  }
  const deputadosLigados = new Set([...melhor.values()].map((x) => x.id));
  for (const s of senadores) {
    if (deputadosLigados.has(s.id)) continue;
    const candidatos = porNome.get(`${norm(s.nomeCompleto)}|${s.uf}`) ?? [];
    // Mesmo nome no estado: aceito só se todos os registros forem da mesma pessoa (mesmo CPF). O TSE às
    // vezes mascara o CPF ("-4"); esses registros não contam na comparação.
    const cpfs = new Set(candidatos.map((c) => c.NR_CPF_CANDIDATO).filter((cpf) => /^\d{11}$/.test(cpf)));
    if (candidatos.length > 0 && cpfs.size <= 1) for (const c of candidatos) considerar(c, s.id);
  }
  // Registro anulado só fica se for a única candidatura da pessoa naquele ano (ex.: inscrita como suplente e
  // depois candidata a senadora: vale a candidatura a senadora).
  const valida = new Set([...melhor.values()].filter((x) => peso(x.c) > 1).map((x) => x.id));
  return [...melhor.values()].filter((x) => peso(x.c) > 1 || !valida.has(x.id)).map(({ c, id }) => para(c, id));
}

export function bensPorCandidato(linhas: Linha[], sqs: Set<string>) {
  const r = new Map<string, { ordem: number; tipo: string; valor: number }[]>();
  for (const l of linhas) {
    if (!sqs.has(l.SQ_CANDIDATO)) continue;
    const lista = r.get(l.SQ_CANDIDATO) ?? [];
    lista.push({
      ordem: Number(l.NR_ORDEM_BEM_CANDIDATO ?? l.NR_ORDEM_CANDIDATO) || lista.length + 1, // 2010: NR_ORDEM_CANDIDATO
      tipo: l.DS_TIPO_BEM_CANDIDATO || "Outros",
      valor: valorTse(l.VR_BEM_CANDIDATO),
    });
    r.set(l.SQ_CANDIDATO, lista);
  }
  return r;
}

const PESSOAS_FISICAS = "Recursos de pessoas físicas";
/** Pessoas físicas: só os maiores doadores de cada candidatura aparecem pelo nome; os demais ficam somados. */
export const MAIORES_DOADORES_COM_NOME = 3;

/**
 * Pessoas físicas: os 3 maiores doadores (pela soma das doações) aparecem pelo nome, como no TSE; os demais
 * ficam somados, sem nome (decisão do projeto, issue #30). O CPF só identifica o doador na memória.
 */
function destacarMaioresDoadores(linhas: Linha[]): Linha[] {
  const porDoador = new Map<string, { total: number; nome: string }>();
  for (const l of linhas) {
    if (l.DS_ORIGEM_RECEITA !== PESSOAS_FISICAS) continue;
    const id = l.NR_CPF_CNPJ_DOADOR || l.NM_DOADOR;
    const d = porDoador.get(id) ?? { total: 0, nome: (l.NM_DOADOR_RFB || l.NM_DOADOR || "").trim() };
    d.total += valorTse(l.VR_RECEITA);
    porDoador.set(id, d);
  }
  const maiores = new Map(
    [...porDoador]
      .filter(([, d]) => d.nome && d.total > 0)
      .sort((a, b) => b[1].total - a[1].total || a[1].nome.localeCompare(b[1].nome))
      .slice(0, MAIORES_DOADORES_COM_NOME)
      .map(([id, d]) => [id, d.nome]),
  );
  return linhas.map((l) => {
    const nome = l.DS_ORIGEM_RECEITA === PESSOAS_FISICAS && maiores.get(l.NR_CPF_CNPJ_DOADOR || l.NM_DOADOR);
    return nome ? { ...l, NOME_EXIBIDO: nome } : l;
  });
}

export function receitasPorCandidato(linhas: Linha[], sqs: Set<string>) {
  // origem|doador -> totais; doadores distintos contados pelo CPF/CNPJ só na memória.
  const r = new Map<
    string,
    Map<string, { origem: string; doador: string; total: number; doacoes: number; ids: Set<string> }>
  >();
  const porCandidato = new Map<string, Linha[]>();
  for (const bruta of linhas) {
    const l = normalizarReceita(bruta);
    if (!sqs.has(l.SQ_CANDIDATO)) continue;
    if (!l.DS_ORIGEM_RECEITA || l.DS_ORIGEM_RECEITA === "#NULO") l.DS_ORIGEM_RECEITA = "Origem não informada";
    porCandidato.set(l.SQ_CANDIDATO, [...(porCandidato.get(l.SQ_CANDIDATO) ?? []), l]);
  }
  for (const l of [...porCandidato.values()].flatMap(destacarMaioresDoadores)) {
    const origem = l.DS_ORIGEM_RECEITA;
    const doador = ORIGENS_INSTITUCIONAIS.has(origem)
      ? (l.NM_DOADOR_RFB || l.NM_DOADOR || "").trim()
      : (l.NOME_EXIBIDO ?? "");
    const doCand = r.get(l.SQ_CANDIDATO) ?? new Map();
    const k = `${origem}|${doador}`;
    const g = doCand.get(k) ?? { origem, doador, total: 0, doacoes: 0, ids: new Set<string>() };
    g.total += valorTse(l.VR_RECEITA);
    g.doacoes += 1;
    g.ids.add(l.NR_CPF_CNPJ_DOADOR || `${l.NM_DOADOR}`);
    doCand.set(k, g);
    r.set(l.SQ_CANDIDATO, doCand);
  }
  return new Map(
    [...r].map(([sq, grupos]) => [
      sq,
      [...grupos.values()].map(({ ids, ...g }) => ({
        ...g,
        total: Math.round(g.total * 100) / 100,
        doadores: ids.size,
      })),
    ]),
  );
}

/** Eleições gerais de 2010 em diante (evolução do patrimônio de quem tem carreira longa). */
export function eleicoesComDados(hoje = new Date()): number[] {
  const r: number[] = [];
  for (let ano = 2010; ano <= hoje.getFullYear(); ano += 4) r.push(ano);
  return r;
}

/** Onde estão as receitas de cada eleição: o arquivo e o nome do formato mudaram ao longo dos anos. */
export function arquivoReceitas(ano: number): { url: string; doEstado: (nome: string, uf: string) => boolean } {
  const base = `${TSE}/prestacao_contas`;
  if (ano === 2010)
    return {
      url: `${base}/prestacao_contas_2010.zip`,
      doEstado: (n, uf) => n === `candidato/${uf}/ReceitasCandidatos.txt`,
    };
  if (ano === 2014)
    return { url: `${base}/prestacao_final_2014.zip`, doEstado: (n, uf) => n === `receitas_candidatos_2014_${uf}.txt` };
  return {
    url: `${base}/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`,
    doEstado: (n, uf) => n === `receitas_candidatos_${ano}_${uf}.csv`,
  };
}

async function lerZipInteiro(url: string, prefixo: string): Promise<Linha[]> {
  const arquivos = unzipSync(new Uint8Array(await baixarArquivo(url)));
  return Object.entries(arquivos)
    .filter(([nome]) => nome.startsWith(prefixo) && nome.endsWith(".csv") && !/_BR(ASIL)?\.csv$/.test(nome))
    .flatMap(([, conteudo]) => lerCsvTse(conteudo));
}

async function cpfsDosDeputados() {
  const deputados = await db
    .select({ id: schema.parlamentar.id, ext: schema.parlamentar.idExterno })
    .from(schema.parlamentar)
    .where(eq(schema.parlamentar.casa, "CD"));
  const r: { id: number; cpf: string }[] = [];
  const fila = [...deputados];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let d = fila.shift(); d; d = fila.shift()) {
        const { dados } = await getJson<{ dados: { cpf?: string } }>(`${CAMARA_API}/deputados/${d.ext}`);
        if (dados.cpf) r.push({ id: d.id, cpf: dados.cpf.replace(/\D/g, "") });
      }
    }),
  );
  return r;
}

export async function ingerirTse(): Promise<number> {
  const deputados = await cpfsDosDeputados();
  const senadores = (
    await db
      .select({ id: schema.parlamentar.id, nomeCompleto: schema.parlamentar.nomeCompleto, uf: schema.parlamentar.uf })
      .from(schema.parlamentar)
      .where(eq(schema.parlamentar.casa, "SF"))
  ).flatMap((s) => (s.nomeCompleto && s.uf ? [{ id: s.id, nomeCompleto: s.nomeCompleto, uf: s.uf }] : []));

  let total = 0;
  for (const ano of eleicoesComDados()) {
    const candidatos = await lerZipInteiro(`${TSE}/consulta_cand/consulta_cand_${ano}.zip`, `consulta_cand_${ano}_`);
    const candidaturas = casarCandidaturas(ano, candidatos, deputados, senadores);
    const sqs = new Set(candidaturas.map((c) => c.sqCandidato));
    const bens = bensPorCandidato(
      await lerZipInteiro(`${TSE}/bem_candidato/bem_candidato_${ano}.zip`, `bem_candidato_${ano}_`),
      sqs,
    );

    // Receitas: só os arquivos dos estados que interessam, lidos de dentro do zip remoto.
    const contas = arquivoReceitas(ano);
    const entradas = await listarZip(contas.url);
    const ufs = new Set(candidaturas.map((c) => c.uf));
    const linhasReceita: Linha[] = [];
    for (const e of entradas.filter((e) => [...ufs].some((uf) => contas.doEstado(e.nome, uf))))
      linhasReceita.push(
        ...lerCsvTse(await lerEntradaZip(contas.url, e))
          .map(normalizarReceita)
          .filter((l) => sqs.has(l.SQ_CANDIDATO)),
      );
    const receitas = receitasPorCandidato(linhasReceita, sqs);

    await db.transaction(async (tx) => {
      await tx.delete(schema.candidatura).where(eq(schema.candidatura.ano, ano));
      for (const lote of lotes(candidaturas, 500)) {
        const salvas = await tx
          .insert(schema.candidatura)
          .values(
            lote.map((c) => ({
              ...c,
              patrimonio: (bens.get(c.sqCandidato) ?? []).reduce((s, b) => s + b.valor, 0).toFixed(2),
              receitaTotal: (receitas.get(c.sqCandidato) ?? []).reduce((s, r) => s + r.total, 0).toFixed(2),
              fonteUrl: `${TSE}/consulta_cand/consulta_cand_${ano}.zip`,
            })),
          )
          .onConflictDoNothing()
          .returning({ id: schema.candidatura.id, sq: schema.candidatura.sqCandidato });
        const bensLinhas = salvas.flatMap((s) =>
          (bens.get(s.sq) ?? []).map((b, i) => ({
            candidaturaId: s.id,
            ordem: b.ordem || i + 1,
            tipo: b.tipo,
            valor: b.valor.toFixed(2),
          })),
        );
        const receitasLinhas = salvas.flatMap((s) =>
          (receitas.get(s.sq) ?? []).map((r) => ({ candidaturaId: s.id, ...r, total: r.total.toFixed(2) })),
        );
        for (const l of lotes(bensLinhas, 2000)) await tx.insert(schema.candidaturaBem).values(l).onConflictDoNothing();
        for (const l of lotes(receitasLinhas, 2000))
          await tx.insert(schema.candidaturaReceita).values(l).onConflictDoNothing();
      }
    });
    total += candidaturas.length;
    console.log(`  TSE ${ano}: ${candidaturas.length} candidaturas ligadas a parlamentares`);
  }
  return total;
}
