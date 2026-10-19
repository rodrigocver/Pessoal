const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Nomes por extenso que as casas usam no lugar da sigla.
const APELIDOS: Record<string, string[]> = {
  pp: ["progressistas"],
  pode: ["podemos"],
  republicanos: ["republicanos"],
  solidariedade: ["solidariedade"],
};

/**
 * Diz se a orientação de `bancada` vale para um parlamentar do `partido`.
 * 1 = orientação do próprio partido; 2 = da federação que ele integra; null = não se aplica.
 * Blocos ("Bl MdbPsdRep...") são ignorados: a fonte abrevia e corta os nomes, e não dá para saber com segurança
 * quais partidos estão dentro.
 */
export function prioridadeOrientacao(bancada: string, partido: string): 1 | 2 | null {
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
  if (bancada.startsWith("Bl ") || bancada.startsWith("Bloco")) return null;
  if (b === p) return 1;
  const nomes = [p, ...(APELIDOS[p] ?? [])];
  // A Câmara corta nomes longos ("Republican", "Solidaried"): aceitamos prefixo com 8+ letras.
  if (nomes.some((n) => n === b || (b.length >= 8 && n.startsWith(b)))) return 1;
  return null;
}

export const BANCADA_GOVERNO = "Governo";
