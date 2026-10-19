// As APIs oficiais são lentas e falham com frequência: timeout + retentativas com backoff.
export async function fetchComRetry(
  url: string,
  { tentativas = 4, timeoutMs = 60_000, accept = "application/json", headers = {} as Record<string, string> } = {},
): Promise<Response> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, { headers: { Accept: accept, ...headers }, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return res;
      // 4xx (exceto 429) não melhora tentando de novo.
      if (res.status < 500 && res.status !== 429) throw new ErroHttp(url, res.status, false);
      ultimoErro = new ErroHttp(url, res.status, true);
    } catch (e) {
      if (e instanceof ErroHttp && !e.retentavel) throw e;
      ultimoErro = e;
    }
    if (i < tentativas - 1) await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
  }
  throw ultimoErro;
}

export async function getJson<T>(url: string, opts?: Parameters<typeof fetchComRetry>[1]): Promise<T> {
  return (await fetchComRetry(url, opts)).json() as Promise<T>;
}

export class ErroHttp extends Error {
  constructor(
    public url: string,
    public status: number,
    public retentavel: boolean,
  ) {
    super(`HTTP ${status} em ${url}`);
  }
}
