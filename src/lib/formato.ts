const TZ = "America/Sao_Paulo";

export const formatarData = (d: Date | string) =>
  new Date(d).toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });

export const formatarDataHora = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const formatarReais = (v: number, compacto = false) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    ...(compacto ? { notation: "compact", maximumFractionDigits: 1 } : { maximumFractionDigits: 0 }),
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
export const urlParlamentar = (p: { casa: "CD" | "SF"; idExterno: string }) => `/parlamentar/${slugDaCasa(p.casa)}/${p.idExterno}`;
