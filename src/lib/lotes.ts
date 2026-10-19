/** Divide uma lista em lotes de até `tamanho` itens. */
export function emLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}

/** "--parte 2/4" → { indice: 1, total: 4 } (partes contadas de 1). Sem valor: parte única. */
export function lerParte(valor: string | undefined): { indice: number; total: number } {
  if (!valor) return { indice: 0, total: 1 };
  const m = /^(\d+)\/(\d+)$/.exec(valor);
  const k = Number(m?.[1]);
  const n = Number(m?.[2]);
  if (!m || n < 1 || k < 1 || k > n) throw new Error(`--parte inválida: ${valor} (use k/n, ex.: 1/4)`);
  return { indice: k - 1, total: n };
}

/** Executa `fn` lembrando o resultado por chave (a mesma promessa para chamadas repetidas). */
export function memorizar<K, V>(fn: (k: K) => Promise<V>, chave: (k: K) => unknown = (k) => k) {
  const cache = new Map<unknown, Promise<V>>();
  return (k: K) => {
    const c = chave(k);
    if (!cache.has(c)) cache.set(c, fn(k));
    return cache.get(c)!;
  };
}
