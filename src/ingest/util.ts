import { createHash } from "node:crypto";
import { parse } from "csv-parse";
import { unzipSync } from "fflate";
import { fetchComRetry } from "./http";

/** Divide em lotes para não estourar o limite de parâmetros do Postgres. */
export function* lotes<T>(itens: T[], tamanho = 1000): Generator<T[]> {
  for (let i = 0; i < itens.length; i += tamanho) yield itens.slice(i, i + tamanho);
}

export function hash(...partes: unknown[]): string {
  return createHash("sha1")
    .update(partes.map((p) => String(p ?? "")).join("|"))
    .digest("hex");
}

/** Anos de `desde` até o ano corrente. */
export function anosDesde(desde: number, ate = new Date().getFullYear()): number[] {
  return Array.from({ length: ate - desde + 1 }, (_, i) => desde + i);
}

/**
 * Baixa um arquivo grande inteiro. Transferências às vezes terminam no meio sem erro,
 * então conferimos o tamanho com o Content-Length e tentamos de novo se faltar algo.
 */
export async function baixarArquivo(url: string, tentativas = 4): Promise<Buffer> {
  for (let i = 1; ; i++) {
    const res = await fetchComRetry(url, { timeoutMs: 900_000, accept: "*/*" });
    const esperado = Number(res.headers.get("content-length")) || null;
    try {
      const buf = Buffer.from(await res.arrayBuffer());
      if (esperado == null || buf.length === esperado) return buf;
      if (i >= tentativas) throw new Error(`Download incompleto de ${url}: ${buf.length} de ${esperado} bytes`);
    } catch (e) {
      if (i >= tentativas) throw e;
    }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** i));
  }
}

/**
 * A Câmara regenera os arquivos de madrugada; quem baixa durante a escrita recebe um JSON cortado.
 * Nesse caso esperamos e baixamos de novo.
 */
export async function baixarJson<T>(url: string, tentativas = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return JSON.parse((await baixarArquivo(url)).toString("utf8")) as T;
    } catch (e) {
      if (!(e instanceof SyntaxError) || i >= tentativas) throw new Error(`JSON inválido em ${url}: ${e}`);
      await new Promise((r) => setTimeout(r, 60_000 * i));
    }
  }
}

/** Baixa um CSV (opcionalmente dentro de um .zip) separado por ";" e devolve as linhas como objetos. */
export async function baixarCsv(url: string, { zip = false } = {}): Promise<Record<string, string>[]> {
  let buf = await baixarArquivo(url);
  if (zip) {
    const arquivos = unzipSync(buf);
    const nome = Object.keys(arquivos).find((n) => n.endsWith(".csv"));
    if (!nome) throw new Error(`Nenhum CSV dentro de ${url}`);
    buf = Buffer.from(arquivos[nome]);
  }
  const linhas: Record<string, string>[] = [];
  const parser = parse(buf, { delimiter: ";", columns: true, bom: true, relax_quotes: true, relax_column_count: true });
  for await (const linha of parser) linhas.push(linha);
  return linhas;
}
