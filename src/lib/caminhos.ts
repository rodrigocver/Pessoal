// Endereços das páginas públicas. Os filtros ficam no caminho (/parlamentar/camara/1/votacoes/2025), não em
// "?aba=...": cada combinação vira uma página estática guardada na CDN (ISR), o que não acontece com parâmetros
// de consulta. O middleware redireciona os endereços antigos com "?".

import { slugDaCasa } from "./formato";

export interface FiltrosPerfil {
  aba?: string;
  periodo?: string;
  pagina?: string;
  tema?: string;
}

/** Ordem dos segmentos e valor usado quando um segmento do meio falta. */
const ORDEM_PERFIL: { chave: keyof FiltrosPerfil; padrao: (f: FiltrosPerfil, periodoPadrao: string) => string }[] = [
  { chave: "aba", padrao: () => "presenca" },
  { chave: "periodo", padrao: (_, pp) => pp },
  { chave: "pagina", padrao: () => "1" },
  { chave: "tema", padrao: () => "" },
];

const seg = (s: string) => encodeURIComponent(s);
const lerSeg = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** `/parlamentar/camara/204534[/aba[/periodo[/pagina[/tema]]]]`, sem segmentos finais vazios. */
export function caminhoPerfil(
  p: { casa: "CD" | "SF"; idExterno: string },
  f: FiltrosPerfil = {},
  periodoPadrao = "",
): string {
  const ultimo = ORDEM_PERFIL.findLastIndex((o) => f[o.chave]);
  const partes = ORDEM_PERFIL.slice(0, ultimo + 1).map((o) => f[o.chave] || o.padrao(f, periodoPadrao));
  return [`/parlamentar/${slugDaCasa(p.casa)}/${p.idExterno}`, ...partes.map(seg)].join("/");
}

/** Inverso de `caminhoPerfil` (segmentos depois do id). `null` se houver segmentos demais. */
export function lerFiltrosPerfil(segs: string[] | undefined): FiltrosPerfil | null {
  const s = (segs ?? []).map(lerSeg);
  if (s.length > ORDEM_PERFIL.length) return null;
  return Object.fromEntries(ORDEM_PERFIL.flatMap((o, i) => (s[i] ? [[o.chave, s[i]]] : [])));
}

/** `/comparar[/casa/id[/casa/id[/periodo]]]`; `a` e `b` no formato "camara/204534". */
export function caminhoComparar(a?: string, b?: string, periodo?: string): string {
  return ["/comparar", a, a && b, a && b && periodo].filter(Boolean).join("/");
}

/** Inverso de `caminhoComparar`. `null` se o caminho não tiver o formato esperado. */
export function lerComparar(segs: string[] | undefined): { a?: string; b?: string; periodo?: string } | null {
  const s = (segs ?? []).map(lerSeg);
  if (![0, 2, 4, 5].includes(s.length)) return null;
  return {
    a: s.length >= 2 ? `${s[0]}/${s[1]}` : undefined,
    b: s.length >= 4 ? `${s[2]}/${s[3]}` : undefined,
    periodo: s[4],
  };
}
