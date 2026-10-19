import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  comparativo,
  gastos,
  idsSeguidos,
  obterParlamentar,
  presenca,
  proposicoes,
  votos,
  type Parlamentar,
} from "@/lib/consultas";
import { periodosDisponiveis, resolverPeriodo, type Periodo } from "@/lib/periodo";
import { CASAS, formatarData, formatarPct, formatarReais, type SlugCasa } from "@/lib/formato";
import { Foto } from "@/components/Foto";
import { BotaoSeguir } from "@/components/BotaoSeguir";
import { Identificacao } from "@/components/CartaoParlamentar";
import { BarrasHorizontais, BarrasMensais } from "@/components/Graficos";
import { ComoCalculamos, Secao } from "@/components/ComoCalculamos";
import { Comparacao, linhasComparacao } from "@/components/Comparacao";

type Props = {
  params: Promise<{ casa: string; id: string }>;
  searchParams: Promise<{ aba?: string; periodo?: string; pagina?: string }>;
};

const ABAS = {
  presenca: "Presença",
  votacoes: "Votações",
  proposicoes: "Projetos",
  gastos: "Gastos",
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

export default async function Perfil({ params, searchParams }: Props) {
  const { p, slug } = await carregar(params);
  const sp = await searchParams;
  const aba: Aba = sp.aba && sp.aba in ABAS ? (sp.aba as Aba) : "presenca";
  const periodo = resolverPeriodo(sp.periodo);
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const sessao = await auth();
  const seguidos = await idsSeguidos(sessao?.user?.id);
  const caminho = `/parlamentar/${slug}/${p.idExterno}`;
  const link = (mudancas: Record<string, string>) =>
    `${caminho}?${new URLSearchParams({ aba, periodo: periodo.valor, ...mudancas })}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <Foto url={p.fotoUrl} nome={p.nome} tamanho={80} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">{p.nome}</h1>
          <p className="text-sm text-suave">{CASAS[slug].cargo}</p>
          <Identificacao p={p} />
        </div>
        <BotaoSeguir parlamentarId={p.id} seguindo={seguidos.has(p.id)} logado={!!sessao?.user} caminho={caminho} />
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4" aria-label="Seções">
        {(Object.keys(ABAS) as Aba[]).map((a) => (
          <Link
            key={a}
            href={`${caminho}?${new URLSearchParams({ aba: a, periodo: periodo.valor })}`}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${a === aba ? "bg-texto font-medium text-fundo" : "text-suave hover:bg-superficie"}`}
          >
            {ABAS[a]}
          </Link>
        ))}
      </nav>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 text-sm" aria-label="Período">
        {periodosDisponiveis().map((per) => (
          <Link
            key={per.valor}
            href={link({ periodo: per.valor })}
            className={`shrink-0 rounded-lg border px-3 py-1 ${per.valor === periodo.valor ? "border-destaque text-destaque" : "border-borda text-suave"}`}
          >
            {per.rotulo}
          </Link>
        ))}
      </div>

      {aba === "presenca" && <AbaPresenca p={p} periodo={periodo} />}
      {aba === "votacoes" && <AbaVotacoes p={p} periodo={periodo} pagina={pagina} link={link} />}
      {aba === "proposicoes" && <AbaProposicoes p={p} periodo={periodo} />}
      {aba === "gastos" && <AbaGastos p={p} periodo={periodo} />}
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

async function AbaPresenca({ p, periodo }: { p: Parlamentar; periodo: Periodo }) {
  const [d, comp] = await Promise.all([presenca(p, periodo), comparativo(p, periodo)]);
  return (
    <>
      <Secao titulo="Presença em plenário">
        <Destaque
          valor={formatarPct(d.percentual)}
          legenda={`${d.presentes} de ${d.total} sessões ${p.casa === "SF" ? "com votação nominal" : "deliberativas"} em ${periodo.rotulo.toLowerCase()}`}
        />
        <BarrasMensais
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
            A fonte não informa licenças. Por isso consideramos o período entre a primeira e a última atividade
            registrada (presença ou voto) — ou até hoje, se ele segue em exercício. Faltas justificadas contam como
            ausência.
          </p>
        </ComoCalculamos>
      </Secao>
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

const COR_VOTO: Record<string, string> = {
  Sim: "text-bom",
  Não: "text-ruim",
  Obstrução: "text-alerta",
  Abstenção: "text-alerta",
};
const corVoto = (v: string) =>
  COR_VOTO[v] ?? (v.startsWith("Ausente") || v === "Não compareceu" ? "text-suave line-through" : "text-suave");

async function AbaVotacoes({
  p,
  periodo,
  pagina,
  link,
}: {
  p: Parlamentar;
  periodo: Periodo;
  pagina: number;
  link: (m: Record<string, string>) => string;
}) {
  const POR_PAGINA = 30;
  const [d, comp] = await Promise.all([votos(p, periodo, pagina, POR_PAGINA), comparativo(p, periodo)]);
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
            Usamos o partido do parlamentar na data de cada voto. Se o partido não orientou, mas a federação dele sim,
            vale a da federação. Orientações de blocos não são usadas: a fonte abrevia os nomes e não informa a
            composição.
            {p.casa === "SF" &&
              " No Senado, a orientação de bancada raramente é publicada, então o número pode se basear em poucas votações."}
          </p>
        </ComoCalculamos>
      </Secao>
      <Secao titulo={`Votações nominais (${d.total})`}>
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
                <details className="mt-1 text-suave">
                  <summary className="cursor-pointer text-xs">O que foi votado</summary>
                  <p className="mt-1">{v.descricao}</p>
                  <a href={v.fonteUrl} className="text-xs underline">
                    Fonte oficial
                  </a>
                </details>
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
          {p.casa === "CD" ? (
            <p>&quot;Artigo 17&quot; é o voto do presidente da sessão, que pelo regimento não vota.</p>
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
        <BarrasHorizontais
          dados={d.fornecedores.map((f) => ({
            rotulo: f.fornecedor,
            valor: f.total,
            texto: `${formatarReais(f.total)} · ${f.n}x`,
          }))}
        />
      </Secao>
    </>
  );
}
