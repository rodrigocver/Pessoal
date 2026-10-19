import type { ResumoParlamentar } from "@/lib/resumoMensal";
import { formatarPct, formatarReais, urlParlamentar } from "@/lib/formato";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
export const nomeDoMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const corta = (s: string | null, n = 140) => (!s ? "" : s.length > n ? `${s.slice(0, n - 1)}…` : s);

function linhaPresenca(r: ResumoParlamentar) {
  if (r.presenca.total === 0)
    return r.p.emExercicio ? "Não houve sessões com registro de presença no mês." : "Fora de exercício no mês.";
  return `Presença: ${formatarPct(r.presenca.percentual)} (${r.presenca.presentes} de ${r.presenca.total} sessões)`;
}

/** E-mail simples, com estilos inline (clientes de e-mail ignoram CSS externo). Texto neutro, só fatos. */
export function renderResumoMensal({
  mes,
  resumos,
  baseUrl,
  urlDescadastro,
}: {
  mes: string;
  resumos: ResumoParlamentar[];
  baseUrl: string;
  urlDescadastro: string;
}) {
  const assunto = `Seus parlamentares em ${nomeDoMes(mes)}`;

  const blocos = resumos.map((r) => {
    const link = `${baseUrl}${urlParlamentar(r.p)}`;
    const votos = r.votos.destaques
      .map(
        (v) =>
          `<li style="margin:0 0 6px"><b>${esc(v.voto)}</b> — ${esc(v.proposicao ?? "")}${v.aprovada == null ? "" : v.aprovada ? " (aprovada)" : " (rejeitada)"}<br><span style="color:#5f5f5a">${esc(corta(v.ementa))}</span></li>`,
      )
      .join("");
    const props = r.proposicoes
      .map(
        (x) =>
          `<li style="margin:0 0 6px"><b>${esc(x.rotulo)}</b><br><span style="color:#5f5f5a">${esc(corta(x.ementa))}</span></li>`,
      )
      .join("");
    return `
<tr><td style="padding:20px 0;border-top:1px solid #e3e3de">
  <a href="${link}" style="font-size:18px;font-weight:600;color:#1c1c1a;text-decoration:none">${esc(r.p.nome)}</a>
  <div style="color:#5f5f5a;font-size:14px">${esc(r.p.partido ?? "")}-${esc(r.p.uf ?? "")}</div>
  ${r.mandato.map((m) => `<p style="margin:12px 0 0;padding:8px 12px;background:#fdf3e4;border-radius:8px;font-size:14px"><b>${esc(m)}</b></p>`).join("")}
  <p style="margin:12px 0 4px">${linhaPresenca(r)}</p>
  ${r.comissoes ? `<p style="margin:4px 0">${esc(r.comissoes)}</p>` : ""}
  <p style="margin:4px 0">Votações nominais: ${r.votos.total}</p>
  ${votos ? `<ul style="padding-left:18px;margin:8px 0">${votos}</ul>` : ""}
  <p style="margin:4px 0">Projetos apresentados: ${r.proposicoes.length}</p>
  ${props ? `<ul style="padding-left:18px;margin:8px 0">${props}</ul>` : ""}
  <p style="margin:4px 0">Gastos da cota: ${formatarReais(r.gastos.total)}${r.gastos.principalCategoria ? ` — maior parte em ${esc(r.gastos.principalCategoria.toLowerCase())}` : ""}</p>
  <p style="margin:12px 0 0"><a href="${link}" style="color:#0f6e6a">Ver detalhes →</a></p>
</td></tr>`;
  });

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(assunto)}</title></head>
<body style="margin:0;background:#f7f7f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1c1a;line-height:1.45">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;padding:24px">
<tr><td>
  <div style="font-weight:600;color:#0f6e6a">Fiscaliza</div>
  <h1 style="font-size:22px;margin:8px 0 4px">${esc(assunto)}</h1>
  <p style="color:#5f5f5a;margin:0">O que os parlamentares que você acompanha fizeram no mês, segundo os dados oficiais da Câmara e do Senado.</p>
</td></tr>
${blocos.join("")}
<tr><td style="padding-top:20px;border-top:1px solid #e3e3de;font-size:12px;color:#5f5f5a">
  Você recebe este e-mail porque ativou o resumo mensal no Fiscaliza.
  <a href="${urlDescadastro}" style="color:#5f5f5a">Não quero mais receber</a> ·
  <a href="${baseUrl}/minha-lista" style="color:#5f5f5a">Minha lista</a>
</td></tr>
</table></td></tr></table></body></html>`;

  const texto = [
    assunto,
    "",
    ...resumos.flatMap((r) => [
      `${r.p.nome} (${r.p.partido}-${r.p.uf})`,
      ...r.mandato.map((m) => `  ! ${m}`),
      `  ${linhaPresenca(r)}`,
      ...(r.comissoes ? [`  ${r.comissoes}`] : []),
      `  Votações nominais: ${r.votos.total}`,
      ...r.votos.destaques.map((v) => `    - ${v.voto}: ${v.proposicao}`),
      `  Projetos apresentados: ${r.proposicoes.length}`,
      `  Gastos da cota: ${formatarReais(r.gastos.total)}`,
      `  ${baseUrl}${urlParlamentar(r.p)}`,
      "",
    ]),
    `Não quero mais receber: ${urlDescadastro}`,
  ].join("\n");

  return { assunto, html, texto };
}
