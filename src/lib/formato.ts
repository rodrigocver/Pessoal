const TZ = "America/Sao_Paulo";

export const formatarData = (d: Date | string) => {
  // Data pura ("2020-11-15") não tem fuso: lida como UTC, viraria o dia anterior em Brasília.
  const pura = typeof d === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (pura) return `${pura[3]}/${pura[2]}/${pura[1]}`;
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
};

export const formatarDataHora = (d: Date) =>
  d.toLocaleString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Compacto ("R$ 1,2 mil") só a partir de mil; abaixo disso "R$ 7,7" pareceria abreviado.
export const formatarReais = (v: number, compacto = false) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(compacto && Math.abs(v) >= 1000
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { maximumFractionDigits: compacto ? 2 : 0 }),
  });

export const formatarPct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
/** "2025-03" -> "mar/25" */
export const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

export const CASAS = {
  camara: { casa: "CD", nome: "Câmara", cargo: "Deputado(a) federal" },
  senado: { casa: "SF", nome: "Senado", cargo: "Senador(a)" },
} as const;
export type SlugCasa = keyof typeof CASAS;
export const slugDaCasa = (casa: "CD" | "SF"): SlugCasa => (casa === "CD" ? "camara" : "senado");
export const urlParlamentar = (p: { casa: "CD" | "SF"; idExterno: string }) =>
  `/parlamentar/${slugDaCasa(p.casa)}/${p.idExterno}`;
/** Página do parlamentar no site oficial da casa. */
export const urlPerfilOficial = (p: { casa: "CD" | "SF"; idExterno: string }) =>
  p.casa === "CD"
    ? `https://www.camara.leg.br/deputados/${p.idExterno}`
    : `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${p.idExterno}`;

const DIA_MS = 86_400_000;

/** Duração legível entre duas datas (fim nulo = até hoje): "3 dias", "5 meses", "1 ano e 2 meses". */
export function formatarDuracao(inicio: Date, fim: Date | null, hoje = new Date()): string {
  const dias = Math.max(1, Math.round(((fim ?? hoje).getTime() - inicio.getTime()) / DIA_MS));
  if (dias < 45) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.round(dias / 30.44);
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const a = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return resto ? `${a} e ${resto} ${resto === 1 ? "mês" : "meses"}` : a;
}
