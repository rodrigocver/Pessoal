import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  comparativo,
  gastos,
  obterParlamentar,
  presenca,
  proposicoes,
  candidaturasDe,
  comissoesDe,
  relatoriasDe,
  type ComissaoDoParlamentar,
  afastamentosDe,
  vagasOcupadas,
  type AfastamentoDetalhado,
  type VagaOcupada,
  temasDasVotacoes,
  votos,
  type Parlamentar,
} from "@/lib/consultas";
import { periodosDisponiveis, resolverPeriodo, type Periodo } from "@/lib/periodo";
import { caminhoComparar, caminhoCsv, caminhoPerfil, lerFiltrosPerfil } from "@/lib/caminhos";
import { ABAS_CSV } from "@/lib/exportar";
import {
  CASAS,
  urlPerfilOficial,
  formatarData,
  formatarPct,
  formatarReais,
  rotuloMes,
  slugDaCasa,
  type SlugCasa,
} from "@/lib/formato";
import { Foto } from "@/components/Foto";
import { BotaoSeguir } from "@/components/BotaoSeguir";
import { Identificacao } from "@/components/CartaoParlamentar";
import { BarrasHorizontais, BarrasMensais } from "@/components/Graficos";
import { ComoCalculamos, Secao } from "@/components/ComoCalculamos";
import { Comparacao, linhasComparacao } from "@/components/Comparacao";
import { corVoto } from "@/lib/votos";
import { AvisoMandato, HistoricoAfastamentos } from "@/components/Afastamentos";
import { SeloSuplente } from "@/components/SeloSuplente";

type Props = { params: Promise<{ casa: string; id: string; filtros?: string[] }> };

// Cada combinação de aba e filtros (/parlamentar/camara/1/votacoes/2025) é gerada uma vez e servida da CDN.
// A ingestão diária renova o cache (POST /api/revalidar); a hora é só uma rede de segurança.
export const revalidate = 3600;
export const generateStaticParams = () => [];

const ABAS = {
  presenca: "Presença",
  votacoes: "Votações",
  proposicoes: "Projetos",
  comissoes: "Comissões",
  gastos: "Gastos",
  eleicoes: "Eleições",
} as const;
type Aba = keyof typeof ABAS;

async function carregar(params: Props["params"]) {
  const { casa, id } = await params;
  if (!(casa in CASAS)) notFound();
  const p = await obterParlamentar(CASAS[casa as SlugCasa].casa, id);
  if (!p) notFound();
  return { p, slug: casa as SlugCasa };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { p, slug } = await carregar(params);
  return {
    title: p.nome,
    description: `Presença, votações, projetos e gastos de ${p.nome} (${CASAS[slug].cargo}, ${p.partido}-${p.uf}).`,
  };
}

export default async function Perfil({ params }: Props) {
  const { p, slug } = await carregar(params);
  const sp = lerFiltrosPerfil((await params).filtros);
  // Endereços inválidos dão 404 em vez de virar mais uma página no cache.
  if (
    !sp ||
    (sp.aba && !(sp.aba in ABAS)) ||
    (sp.periodo && sp.periodo !== "legislatura" && !periodosDisponiveis().some((x) => x.valor === sp.periodo)) ||
    (sp.pagina && !/^[1-9]\d{0,3}$/.test(sp.pagina)) ||
    (sp.tema && (sp.aba !== "votacoes" || sp.tema.length > 80))
  )
    notFound();
  const aba: Aba = (sp.aba as Aba | undefined) ?? "presenca";
  const periodo = resolverPeriodo(sp.periodo);
  const pagina = Number(sp.pagina ?? 1);
  const tema = sp.tema;
  const [afastamentos, vagas] = await Promise.all([afastamentosDe(p), vagasOcupadas(p)]);
  const link = (mudancas: { periodo?: string; pagina?: string; tema?: string }) =>
    caminhoPerfil(p, { aba, periodo: periodo.valor, tema, ...mudancas }, periodo.valor);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Foto url={p.fotoUrl} nome={p.nome} tamanho={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{p.nome}</h1>
          <p className="text-sm text-suave">{CASAS[slug].cargo}</p>
          <Identificacao p={p} />
        </div>
        <div className="flex flex-col items-end gap-2">
          <BotaoSeguir parlamentarId={p.id} />
          <Link href={caminhoComparar(`${slug}/${p.idExterno}`)} className="text-sm text-destaque">
            Comparar com…
          </Link>
          <a href={urlPerfilOficial(p)} className="text-sm text-suave underline">
            Perfil oficial {slug === "camara" ? "na Câmara" : "no Senado"}
          </a>
        </div>
      </div>

      <AvisoMandato afastamentos={afastamentos} vagas={vagas} />

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4" aria-label="Seções">
        {(Object.keys(ABAS) as Aba[]).map((a) => (
          <Link
            key={a}
            href={caminhoPerfil(p, { aba: a, periodo: periodo.valor })}
            aria-current={a === aba ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${a === aba ? "bg-texto font-medium text-fundo" : "text-suave hover:bg-superficie"}`}
          >
            {ABAS[a]}
          </Link>
        ))}
      </nav>

      {aba !== "eleicoes" && (
        <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm" aria-label="Período">
          {periodosDisponiveis().map((per) => (
            <Link
              key={per.valor}
              href={link({ periodo: per.valor })}
              aria-current={per.valor === periodo.valor ? "page" : undefined}
              className={`shrink-0 rounded-lg border px-3 py-1 ${per.valor === periodo.valor ? "border-destaque text-destaque" : "border-borda text-suave"}`}
            >
              {per.rotulo}
            </Link>
          ))}
        </nav>
      )}

      {aba === "presenca" && <AbaPresenca p={p} periodo={periodo} afastamentos={afastamentos} vagas={vagas} />}
      {aba === "votacoes" && <AbaVotacoes p={p} periodo={periodo} pagina={pagina} tema={tema} link={link} />}
      {aba === "proposicoes" && <AbaProposicoes p={p} periodo={periodo} />}
      {aba === "comissoes" && <AbaComissoes p={p} periodo={periodo} />}
      {aba === "gastos" && <AbaGastos p={p} periodo={periodo} />}
      {aba === "eleicoes" && <AbaEleicoes p={p} />}
      {(ABAS_CSV as readonly string[]).includes(aba) && (
        <p className="text-right text-sm">
          <a href={caminhoCsv(p, aba, periodo.valor)} download className="text-suave underline">
            Baixar os dados desta aba ({periodo.rotulo}) em CSV
          </a>
        </p>
      )}
    </div>
  );
}

const nomeCasa = (p: Parlamentar) => (p.casa === "CD" ? "Câmara" : "Senado");

function Destaque({ valor, legenda }: { valor: string; legenda: string }) {
  return (
    <div>
      <div className="text-4xl font-semibold tabular-nums">{valor}</div>
      <div className="text-sm text-suave">{legenda}</div>
    </div>
  );
}

async function AbaPresenca({
  p,
  periodo,
  afastamentos,
  vagas,
}: {
  p: Parlamentar;
  periodo: Periodo;
  afastamentos: AfastamentoDetalhado[];
  vagas: VagaOcupada[];
}) {
  const [d, comp] = await Promise.all([presenca(p, periodo), comparativo(p, periodo)]);
  return (
    <>
      {d.total === 0 &&
        afastamentos.some((a) => a.inicio < periodo.fim && (a.fim == null || a.fim > periodo.inicio)) && (
          <p className="rounded-xl bg-alerta/10 px-4 py-3 text-sm">
            Esteve afastado do mandato durante todo o período: não há sessões para calcular a presença. Veja abaixo quem
            ocupou a vaga.
          </p>
        )}
      <Secao titulo="Presença em plenário">
        <Destaque
          valor={formatarPct(d.percentual)}
          legenda={`${d.presentes} de ${d.total} sessões ${p.casa === "SF" ? "com votação nominal" : "deliberativas"} em ${periodo.rotulo.toLowerCase()}`}
        />
        <BarrasMensais
          titulo="Presença por mês"
          maximo={1}
          formatar={(v) => `${Math.round(v * 100)}`}
          dados={d.mensal.map((m) => ({
            mes: m.mes,
            valor: m.total ? m.presentes / m.total : 0,
            dica: `${m.presentes} de ${m.total} sessões`,
          }))}
        />
        <Comparacao
          maximo={1}
          formatar={formatarPct}
          linhas={linhasComparacao(p.nome, p.partido, nomeCasa(p), comp, "presenca")}
        />
        <ComoCalculamos>
          {p.casa === "CD" ? (
            <p>
              Presença = sessões deliberativas do plenário em que o parlamentar registrou presença ÷ sessões
              deliberativas realizadas enquanto ele estava em exercício. Sessões solenes e reuniões de comissão não
              entram.
            </p>
          ) : (
            <p>
              O Senado não publica lista de presença. Usamos o comparecimento às sessões que tiveram votação nominal:
              conta como presente quem votou, se absteve, presidiu ou registrou presença sem votar em ao menos uma
              votação da sessão. Licenças, missões e &quot;atividade parlamentar&quot; aparecem como motivo da ausência.
            </p>
          )}
          <p>
            Só contam as sessões em que o parlamentar estava em exercício, segundo o histórico oficial da casa: períodos
            de afastamento ficam de fora.{" "}
            {p.casa === "CD"
              ? "Na Câmara, toda licença registrada (saúde, interesse particular, cargo no Executivo) é afastamento, com ou sem suplente."
              : "No Senado, licenças em que o senador continua em exercício contam como ausência, com o motivo na lista abaixo."}{" "}
            Faltas sem licença contam como ausência, mesmo justificadas.
          </p>
          {p.casa === "CD" && (
            <p>
              Sessões do Congresso Nacional realizadas no plenário da Câmara não entram: a Câmara não publica a lista de
              presença delas. O portal da Câmara mostra outro número: conta dias (não sessões) e separa ausências
              justificadas, cujas justificativas não são publicadas nos dados abertos.
            </p>
          )}
        </ComoCalculamos>
      </Secao>
      <HistoricoAfastamentos afastamentos={afastamentos} vagas={vagas} />
      {d.ausencias.length > 0 && (
        <Secao titulo={`Ausências (${d.total - d.presentes})`}>
          <ul className="flex flex-col divide-y divide-borda text-sm">
            {d.ausencias.map((a, i) => (
              <li key={i} className="py-2">
                <span className="font-medium tabular-nums">{formatarData(a.inicio)}</span>
                {a.descricao && <span className="text-suave"> — {a.descricao}</span>}
                {a.motivo && <div className="text-xs text-alerta">{a.motivo}</div>}
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </>
  );
}

async function AbaVotacoes({
  p,
  periodo,
  pagina,
  tema,
  link,
}: {
  p: Parlamentar;
  periodo: Periodo;
  pagina: number;
  tema: string | undefined;
  link: (m: Record<string, string | undefined>) => string;
}) {
  const POR_PAGINA = 30;
  const slug = slugDaCasa(p.casa);
  const [d, comp, temas] = await Promise.all([
    votos(p, periodo, pagina, POR_PAGINA, tema),
    comparativo(p, periodo),
    temasDasVotacoes(p, periodo),
  ]);
  const paginas = Math.ceil(d.total / POR_PAGINA);
  return (
    <>
      <Secao titulo="Alinhamento">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Votou como o próprio partido orientou</h3>
            <Comparacao
              maximo={1}
              formatar={formatarPct}
              linhas={linhasComparacao(p.nome, p.partido, nomeCasa(p), comp, "alinhPartido")}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Votou como o governo orientou</h3>
            <Comparacao
              maximo={1}
              formatar={formatarPct}
              linhas={linhasComparacao(p.nome, p.partido, nomeCasa(p), comp, "alinhGoverno")}
            />
          </div>
        </div>
        <ComoCalculamos>
          <p>
            Alinhamento = votações em que o voto (Sim, Não, Abstenção ou Obstrução) foi igual à orientação ÷ votações em
            que havia orientação. Orientações &quot;liberado&quot; e ausências não entram.
          </p>
          <p>
            Usamos o partido do parlamentar na data de cada voto. Vale a orientação do partido; se ele não orientou, a
            da federação; se nenhum dos dois orientou, a do bloco parlamentar de que o partido fazia parte naquela
            votação.
            {p.casa === "SF" &&
              " No Senado, a orientação de bancada raramente é publicada, então o número pode se basear em poucas votações."}
          </p>
        </ComoCalculamos>
      </Secao>
      <Secao titulo={`Votações nominais (${d.total})`}>
        {temas.length > 0 && (
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm" aria-label="Filtrar por tema">
            {[{ tema: undefined, n: null }, ...temas].map((t) => (
              <Link
                key={t.tema ?? ""}
                href={link({ tema: t.tema, pagina: undefined })}
                aria-current={t.tema === tema ? "true" : undefined}
                className={`shrink-0 rounded-lg border px-3 py-1 ${t.tema === tema ? "border-destaque text-destaque" : "border-borda text-suave"}`}
              >
                {t.tema ?? "Todos os temas"}
                {t.n != null && <span className="tabular-nums"> {t.n}</span>}
              </Link>
            ))}
          </nav>
        )}
        {d.total === 0 && tema && <p className="text-sm text-suave">Nenhuma votação com este tema no período.</p>}
        <div className="flex flex-wrap gap-2 text-sm">
          {d.porTipo.map((t) => (
            <span key={t.voto} className="rounded-full bg-fundo px-3 py-1">
              <span className={corVoto(t.voto)}>{t.voto}</span> <span className="tabular-nums text-suave">{t.n}</span>
            </span>
          ))}
        </div>
        <ul className="flex flex-col divide-y divide-borda">
          {d.lista.map((v) => (
            <li key={v.id} className="flex gap-3 py-3 text-sm">
              <span className={`w-24 shrink-0 font-semibold ${corVoto(v.voto)}`}>{v.voto}</span>
              <div className="min-w-0">
                <div className="text-suave">
                  {formatarData(v.data)}
                  {v.proposicao && (
                    <>
                      {" "}
                      · <span className="font-medium text-texto">{v.proposicao}</span>
                    </>
                  )}
                  {v.aprovada != null && <> · {v.aprovada ? "aprovada" : "rejeitada"}</>}
                </div>
                {v.ementa && <p className="mt-1 line-clamp-2">{v.ementa}</p>}
                <SeloSuplente suplente={v.suplente} />
                <Link
                  href={`/votacao/${slug}/${encodeURIComponent(v.idExterno)}`}
                  className="mt-1 inline-block text-xs text-destaque"
                >
                  Ver votação completa →
                </Link>
              </div>
            </li>
          ))}
        </ul>
        {paginas > 1 && (
          <div className="flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link href={link({ pagina: String(pagina - 1) })} className="text-destaque">
                ← Anteriores
              </Link>
            ) : (
              <span />
            )}
            <span className="text-suave">
              Página {pagina} de {paginas}
            </span>
            {pagina < paginas ? (
              <Link href={link({ pagina: String(pagina + 1) })} className="text-destaque">
                Próximas →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
        <ComoCalculamos>
          <p>
            Só entram votações nominais do plenário, em que o voto de cada parlamentar fica registrado no painel. A
            maioria das votações é simbólica e não diz como cada um votou.
          </p>
          <p>
            O selo &quot;suplente&quot; marca os votos dados quando o parlamentar exercia o mandato no lugar de um
            titular afastado, com o nome do titular quando ele é conhecido (mesma regra da página de cada votação).
          </p>
          {p.casa === "CD" ? (
            <p>
              &quot;Artigo 17&quot; é o voto do presidente da sessão, que pelo regimento não vota. Em votações secretas
              (escolha de autoridades) só se sabe que o deputado votou, não como.
            </p>
          ) : (
            <p>Em votações secretas (como indicações de autoridades) só se sabe que o senador votou, não como.</p>
          )}
        </ComoCalculamos>
      </Secao>
    </>
  );
}

async function AbaProposicoes({ p, periodo }: { p: Parlamentar; periodo: Periodo }) {
  const d = await proposicoes(p, periodo);
  return (
    <Secao titulo={`Projetos apresentados (${d.lista.length})`}>
      <div className="flex flex-wrap gap-2 text-sm">
        {d.porTipo.map(([tipo, n]) => (
          <span key={tipo} className="rounded-full bg-fundo px-3 py-1">
            {tipo} <span className="tabular-nums text-suave">{n}</span>
          </span>
        ))}
      </div>
      {d.lista.length === 0 && <p className="text-sm text-suave">Nenhum projeto de autoria no período.</p>}
      <ul className="flex flex-col divide-y divide-borda">
        {d.lista.map((pr) => (
          <li key={pr.rotulo} className="py-3 text-sm">
            <div className="flex flex-wrap gap-x-2 text-suave">
              <a href={pr.fonteUrl} className="font-medium text-texto hover:underline">
                {pr.rotulo}
              </a>
              {pr.apresentadaEm && <span>{formatarData(pr.apresentadaEm)}</span>}
            </div>
            {pr.situacao && <div className="text-xs text-suave">{pr.situacao}</div>}
            {pr.ementa && <p className="mt-1 line-clamp-3">{pr.ementa}</p>}
          </li>
        ))}
      </ul>
      <ComoCalculamos>
        <p>
          {p.casa === "CD"
            ? "Proposições em que o parlamentar é autor ou coautor: PEC, PLP, PL, PDL, PRC, requerimentos de informação (RIC) e indicações (INC). Requerimentos de tramitação e emendas ficam de fora."
            : "Proposições em que o senador é autor ou coautor: PEC, PL, PLP, PDL e PRS. Requerimentos ficam de fora."}
        </p>
      </ComoCalculamos>
    </Secao>
  );
}

async function AbaComissoes({ p, periodo }: { p: Parlamentar; periodo: Periodo }) {
  const [comissoes, relatorias, comp] = await Promise.all([
    comissoesDe(p, periodo),
    p.casa === "SF" ? relatoriasDe(p, periodo) : Promise.resolve([]),
    comparativo(p, periodo),
  ]);
  const ehComissao = (c: ComissaoDoParlamentar) => c.tipo !== "Grupo Parlamentar" && !/^Grupo|^Frente/i.test(c.nome);
  const principais = comissoes.filter(ehComissao);
  const outros = comissoes.filter((c) => !ehComissao(c));
  const reunioes = principais.reduce((s, c) => s + c.reunioes, 0);
  const presencas = principais.reduce((s, c) => s + c.presencas, 0);
  const periodoMembro = (c: ComissaoDoParlamentar) =>
    c.cargos
      .map((x) => `${x.cargo} desde ${formatarData(x.inicio)}${x.fim ? ` até ${formatarData(x.fim)}` : ""}`)
      .join("; ");

  return (
    <>
      {p.casa === "CD" && (
        <Secao titulo="Presença em comissões">
          <Destaque
            valor={formatarPct(reunioes ? presencas / reunioes : null)}
            legenda={`${presencas} de ${reunioes} reuniões deliberativas das comissões em que era titular, em ${periodo.rotulo.toLowerCase()}`}
          />
          <Comparacao
            maximo={1}
            formatar={formatarPct}
            linhas={linhasComparacao(p.nome, p.partido, nomeCasa(p), comp, "presencaComissoes")}
          />
          <ComoCalculamos>
            <p>
              Reuniões deliberativas (em que se votam projetos) das comissões permanentes, especiais e CPIs em que o
              deputado era membro titular na data, enquanto estava em exercício. Audiências públicas, seminários e
              comissões em que é suplente não entram.
            </p>
            <p>
              O portal da Câmara mostra outro número: conta todas as reuniões de todas as comissões, inclusive
              audiências e comissões em que o deputado é suplente, e separa ausências justificadas. As justificativas
              não são publicadas nos dados abertos.
            </p>
          </ComoCalculamos>
        </Secao>
      )}

      <Secao titulo={`Comissões (${principais.length})`}>
        {principais.length === 0 && <p className="text-sm text-suave">Não foi membro de comissões no período.</p>}
        <ul className="flex flex-col divide-y divide-borda text-sm">
          {principais.map((c) => (
            <li key={c.orgaoId} className="flex flex-col gap-0.5 py-2">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{c.sigla}</span>
                {p.casa === "CD" && c.reunioes > 0 && (
                  <span className="shrink-0 tabular-nums text-suave">
                    {c.presencas} de {c.reunioes} reuniões
                  </span>
                )}
              </div>
              <span>{c.nome}</span>
              <span className="text-xs text-suave">{periodoMembro(c)}</span>
            </li>
          ))}
        </ul>
        {outros.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-suave">Grupos e frentes parlamentares ({outros.length})</summary>
            <ul className="mt-2 flex flex-col gap-1">
              {outros.map((c) => (
                <li key={c.orgaoId}>
                  {c.nome} <span className="text-xs text-suave">({c.cargos.map((x) => x.cargo).join(", ")})</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Secao>

      {p.casa === "SF" && (
        <Secao titulo={`Relatorias (${relatorias.length})`}>
          <p className="text-sm text-suave">
            Projetos de que foi relator: quem relata estuda a proposta e apresenta o parecer que a comissão vota. O
            Senado não publica a presença nas reuniões de comissão.
          </p>
          <ul className="flex flex-col divide-y divide-borda text-sm">
            {relatorias.map((r, i) => (
              <li key={i} className="py-2">
                <div className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{r.proposicao}</span>
                  <span className="text-suave">
                    {r.colegiado} · desde {formatarData(r.designacao)}
                    {r.destituicao
                      ? ` até ${formatarData(r.destituicao)}${r.motivoFim ? ` (${r.motivoFim.toLowerCase()})` : ""}`
                      : " · em andamento"}
                  </span>
                </div>
                {r.ementa && <p className="line-clamp-2">{r.ementa}</p>}
              </li>
            ))}
          </ul>
          <ComoCalculamos>
            <p>
              Relatorias designadas a partir de 2023 que estiveram ativas no período, segundo o serviço de relatorias do
              Senado. A Câmara não publica o histórico de relatorias nos dados abertos.
            </p>
          </ComoCalculamos>
        </Secao>
      )}
    </>
  );
}

const tituloCase = (s: string) => (s.charAt(0) + s.slice(1).toLowerCase()).replace(/\bqp\b/, "QP");
// O TSE grava alguns tipos de bem em maiúsculas ("OUTROS BENS E DIREITOS") e outros não.
const tipoBem = (s: string) => (s === s.toUpperCase() ? tituloCase(s) : s);

async function AbaEleicoes({ p }: { p: Parlamentar }) {
  const candidaturas = await candidaturasDe(p);
  if (candidaturas.length === 0)
    return (
      <Secao titulo="Eleições">
        <p className="text-sm text-suave">Nenhuma candidatura ao Congresso encontrada nos dados do TSE desde 2010.</p>
      </Secao>
    );
  const comPatrimonio = [...candidaturas].reverse().filter((c) => c.patrimonio > 0);
  return (
    <>
      {comPatrimonio.length > 1 && (
        <Secao titulo="Patrimônio declarado ao TSE">
          <BarrasHorizontais
            dados={comPatrimonio.map((c) => ({
              rotulo: `${c.dataEleicao ? c.dataEleicao.slice(0, 4) : c.ano} · ${tituloCase(c.cargo)}`,
              valor: c.patrimonio,
              texto: formatarReais(c.patrimonio),
            }))}
          />
          <p className="text-xs text-suave">Valores declarados pelo próprio candidato, sem correção pela inflação.</p>
        </Secao>
      )}
      {candidaturas.map((c) => {
        const suplementar = c.eleicao && /suplementar/i.test(c.eleicao);
        return (
          <Secao
            key={`${c.ano}-${c.cargo}`}
            titulo={`${c.dataEleicao ? c.dataEleicao.slice(0, 4) : c.ano} · ${tituloCase(c.cargo)} (${c.uf})`}
          >
            <p className="text-sm">
              {[c.partido, c.numero && `número ${c.numero}`, c.nomeUrna && `nome na urna: ${c.nomeUrna}`]
                .filter(Boolean)
                .join(" · ")}
              {c.situacao && (
                <>
                  {" "}
                  · <span className="font-medium">{tituloCase(c.situacao.replace(/#/g, ""))}</span>
                </>
              )}
            </p>
            {suplementar && (
              <p className="text-xs text-suave">
                {c.eleicao}
                {c.dataEleicao && ` (${formatarData(c.dataEleicao)})`}
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-sm font-medium">Patrimônio declarado: {formatarReais(c.patrimonio)}</h3>
                {c.bensPorTipo.length > 0 ? (
                  <BarrasHorizontais
                    dados={c.bensPorTipo.slice(0, 6).map((b) => ({
                      rotulo: tipoBem(b.tipo),
                      valor: b.total,
                      texto: `${formatarReais(b.total, true)}${b.n > 1 ? ` · ${b.n}` : ""}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-suave">Nenhum bem declarado.</p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <h3 className="text-sm font-medium">Receitas de campanha: {formatarReais(c.receitaTotal)}</h3>
                {c.receitasPorOrigem.length > 0 ? (
                  <BarrasHorizontais
                    dados={c.receitasPorOrigem.map((r) => ({
                      rotulo: r.origem.replace(/^Recursos (de )?/, "").replace(/^./, (x) => x.toUpperCase()),
                      valor: r.total,
                      texto: `${formatarReais(r.total, true)}${r.origem === "Recursos de pessoas físicas" ? ` · ${r.doadores} doadores` : ""}`,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-suave">Sem receitas na prestação de contas.</p>
                )}
              </div>
            </div>
            {c.doadoresInstitucionais.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-suave">
                  Partidos, candidatos, comitês e empresas que doaram
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {c.doadoresInstitucionais.map((d) => (
                    <li key={`${d.doador}-${d.origem}`} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{tituloCase(d.doador)}</span>
                      <span className="shrink-0 tabular-nums text-suave">{formatarReais(d.total)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Secao>
        );
      })}
      <ComoCalculamos>
        <p>
          Dados abertos do Tribunal Superior Eleitoral (TSE): candidaturas ao Congresso, bens declarados e prestação de
          contas, das eleições de 2010 em diante. Até 2014, empresas podiam doar a campanhas. Deputados são
          identificados pelo CPF publicado pela Câmara; senadores, pelo nome completo e estado. O CPF serve só para essa
          ligação e não é guardado.
        </p>
        <p>
          Por privacidade, mostramos o tipo e o valor dos bens, sem a descrição (que pode trazer endereços), e o total
          das doações de pessoas físicas com o número de doadores, sem os nomes. Os detalhes completos estão nos dados
          do TSE. Valores sem correção pela inflação.
        </p>
      </ComoCalculamos>
    </>
  );
}

async function AbaGastos({ p, periodo }: { p: Parlamentar; periodo: Periodo }) {
  const [d, comp] = await Promise.all([gastos(p, periodo), comparativo(p, periodo)]);
  return (
    <>
      <Secao titulo="Cota parlamentar">
        <Destaque
          valor={formatarReais(d.total)}
          legenda={`${d.lancamentos} lançamentos em ${periodo.rotulo.toLowerCase()}`}
        />
        <BarrasMensais
          titulo="Gastos da cota por mês"
          formatar={(v) => formatarReais(v, true).replace("R$", "").trim()}
          dados={d.mensal.map((m) => ({
            mes: m.mes,
            valor: m.total,
            dica: formatarReais(m.total),
          }))}
        />
        <Comparacao
          formatar={(v) => formatarReais(v, true)}
          linhas={linhasComparacao(p.nome, p.partido, nomeCasa(p), comp, "gastos")}
        />
        <ComoCalculamos>
          <p>
            Valor reembolsado pela cota para o exercício da atividade parlamentar (
            {p.casa === "CD" ? "CEAP, Câmara" : "CEAPS, Senado"}), conforme publicado pela casa. Não inclui salário,
            verba de gabinete nem auxílio-moradia pago em dinheiro.
          </p>
        </ComoCalculamos>
      </Secao>
      <Secao titulo="Por categoria">
        <BarrasHorizontais
          dados={d.categorias.map((c) => ({
            rotulo: c.categoria,
            valor: c.total,
            texto: formatarReais(c.total),
          }))}
        />
      </Secao>
      <Secao titulo="Principais fornecedores">
        <ul className="flex flex-col gap-3">
          {d.fornecedores.map((f) => (
            <li key={`${f.fornecedor}|${f.cnpjCpf}`}>
              <details className="group text-sm">
                <summary className="cursor-pointer list-none">
                  <div className="mb-1 flex justify-between gap-3">
                    <span className="truncate">
                      <span
                        aria-hidden
                        className="mr-1 inline-block text-suave transition-transform group-open:rotate-90"
                      >
                        ›
                      </span>
                      {f.fornecedor}
                    </span>
                    <span className="shrink-0 tabular-nums text-suave">
                      {formatarReais(f.total)} · {f.n}x
                    </span>
                  </div>
                  <div aria-hidden className="h-2 rounded-full bg-fundo">
                    <div
                      className="h-2 rounded-full bg-destaque"
                      style={{ width: `${(f.total / Math.max(d.fornecedores[0]?.total ?? 1, 1)) * 100}%` }}
                    />
                  </div>
                </summary>
                {f.cnpjCpf && <p className="mt-2 text-xs text-suave">CNPJ/CPF {f.cnpjCpf}</p>}
                <ul className="mt-2 flex flex-col divide-y divide-borda">
                  {f.lancamentos.map((l, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 py-1.5">
                      <span className="min-w-0">
                        <span className="tabular-nums">{l.data ? formatarData(l.data) : rotuloMes(l.mes)}</span>
                        {l.data && l.data.slice(0, 7) !== l.mes && (
                          <span className="text-xs text-suave"> (lançado em {rotuloMes(l.mes)})</span>
                        )}{" "}
                        <span className="text-suave">{l.categoria.toLowerCase()}</span>
                      </span>
                      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                        {formatarReais(l.valor)}
                        {l.documentoUrl ? (
                          <a
                            href={l.documentoUrl}
                            className="text-xs text-destaque underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            nota
                          </a>
                        ) : (
                          <span className="text-xs text-suave" title="A casa não publicou o documento">
                            sem nota
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
        <ComoCalculamos>
          <p>
            Toque num fornecedor para ver cada lançamento. A Câmara publica o documento fiscal da maior parte das
            despesas; o Senado não publica o link do documento nos dados abertos. Os gastos entram no mês de competência
            informado pela casa, que às vezes difere da data da nota.
          </p>
        </ComoCalculamos>
      </Secao>
    </>
  );
}
