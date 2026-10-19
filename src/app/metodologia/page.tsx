import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";
import { marked } from "marked";

export const metadata: Metadata = {
  title: "Metodologia",
  description: "Como o Fiscaliza calcula presença, votações, alinhamento, projetos, gastos e afastamentos.",
};

// Gerada no build a partir de docs/METRICAS.md: o mesmo texto serve ao site e a quem contribui.
export const dynamic = "force-static";

const FONTES = [
  ["Dados Abertos da Câmara dos Deputados", "https://dadosabertos.camara.leg.br"],
  ["Dados Abertos do Senado Federal", "https://legis.senado.leg.br/dadosabertos"],
  ["Cota parlamentar do Senado (CEAPS)", "https://adm.senado.gov.br/adm-dadosabertos"],
] as const;

export default function Metodologia() {
  const md = readFileSync(path.join(process.cwd(), "docs/METRICAS.md"), "utf8").replace(/^# .*\n/, "");
  const html = marked.parse(md, { async: false });
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Metodologia</h1>
      <article className="prosa max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} />
      <section className="max-w-3xl rounded-2xl border border-borda bg-superficie p-4 text-sm">
        <h2 className="font-semibold">Fontes</h2>
        <ul className="mt-2 list-disc pl-5">
          {FONTES.map(([nome, url]) => (
            <li key={url}>
              <a href={url} className="underline">
                {nome}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-suave">
          Achou um número diferente da fonte oficial? Abra uma issue &quot;Dado divergente&quot; no repositório do
          projeto.
        </p>
      </section>
    </div>
  );
}
