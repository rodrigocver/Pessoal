const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Nomes por extenso que as casas usam no lugar da sigla.
const APELIDOS: Record<string, string[]> = {
  pp: ["progressistas"],
  pode: ["podemos"],
  republicanos: ["republicanos"],
  solidariedade: ["solidariedade"],
};

// Abreviações usadas nos nomes de blocos da Câmara ("Bl UniPpFdrPsdbCid...") -> sigla normalizada.
const ABREVIACOES_BLOCO: Record<string, string> = {
  uni: "uniao",
  rep: "republicanos",
  cid: "cidadania",
  avan: "avante",
  solid: "solidariedade",
};

/** Federações a partir dos nomes de bancada "Fdr PT-PCdoB-PV": partido -> todos os membros. */
export function federacoesDasBancadas(bancadas: string[]): Map<string, string[]> {
  const r = new Map<string, string[]>();
  for (const b of bancadas) {
    if (!b.startsWith("Fdr ")) continue;
    const membros = b.slice(4).split("-").map(norm).filter(Boolean);
    for (const m of membros) r.set(m, membros);
  }
  return r;
}

/**
 * Partidos de um bloco a partir do nome abreviado. "Bl MdbPsdRepPode" -> mdb, psd, republicanos, pode.
 * "Fdr" seguido de um partido inclui toda a federação dele. Partidos escondidos pelo corte ("...") ficam de
 * fora: preferimos não atribuir orientação a atribuir errado.
 */
export function partidosDoBloco(bancada: string, federacoes: Map<string, string[]>): Set<string> {
  const nome = bancada
    .replace(/^Bl\s+/, "")
    .replace(/\.\.\.$/, "")
    .trim();
  const tokens = nome.match(/[A-Z][a-z]+|[A-Z]+(?![a-z])/g) ?? [];
  const partidos = new Set<string>();
  let federacaoAseguir = false;
  for (const t of tokens) {
    const n = norm(t);
    if (n === "fdr") {
      federacaoAseguir = true;
      continue;
    }
    const sigla = ABREVIACOES_BLOCO[n] ?? n;
    partidos.add(sigla);
    if (federacaoAseguir) for (const m of federacoes.get(sigla) ?? []) partidos.add(m);
    federacaoAseguir = false;
  }
  return partidos;
}

/**
 * Diz se a orientação de `bancada` vale para um parlamentar do `partido`.
 * 1 = do próprio partido; 2 = da federação que ele integra; 3 = do bloco que o partido integra; null = não se aplica.
 */
export function prioridadeOrientacao(
  bancada: string,
  partido: string,
  federacoes: Map<string, string[]> = new Map(),
): 1 | 2 | 3 | null {
  const b = norm(bancada);
  const p = norm(partido);
  if (!b || !p) return null;
  if (bancada.startsWith("Fdr ")) {
    return bancada
      .slice(4)
      .split("-")
      .some((parte) => norm(parte) === p)
      ? 2
      : null;
  }
  if (bancada.startsWith("Bl ")) return partidosDoBloco(bancada, federacoes).has(p) ? 3 : null;
  if (bancada.startsWith("Bloco")) return null; // nome genérico, sem composição
  if (b === p) return 1;
  const nomes = [p, ...(APELIDOS[p] ?? [])];
  // A Câmara corta nomes longos ("Republican", "Solidaried"): aceitamos prefixo com 8+ letras.
  if (nomes.some((n) => n === b || (b.length >= 8 && n.startsWith(b)))) return 1;
  return null;
}

export const BANCADA_GOVERNO = "Governo";
