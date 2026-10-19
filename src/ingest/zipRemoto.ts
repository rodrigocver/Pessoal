import { inflateRawSync } from "node:zlib";
import { fetchComRetry } from "./http";

/**
 * Lê arquivos de dentro de um .zip grande na internet sem baixá-lo inteiro: busca o índice (diretório
 * central, no fim do arquivo) e depois só os bytes de cada arquivo pedido, com requisições parciais (Range).
 * Usado para as prestações de contas do TSE (centenas de MB, das quais precisamos de poucos MB).
 */
export interface EntradaZip {
  nome: string;
  metodo: number; // 0 = sem compressão, 8 = deflate
  tamanhoComprimido: number;
  tamanho: number;
  deslocamento: number;
}

const parcial = async (url: string, inicio: number, fim: number) => {
  const res = await fetchComRetry(url, {
    timeoutMs: 600_000,
    accept: "*/*",
    headers: { Range: `bytes=${inicio}-${fim}` },
  });
  if (res.status !== 206) throw new Error(`O servidor não aceitou leitura parcial de ${url} (HTTP ${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

/** Lê as entradas do diretório central a partir de um buffer com o fim do arquivo. */
export function lerDiretorioCentral(fim: Buffer): EntradaZip[] {
  const eocd = fim.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("Fim do diretório central não encontrado (zip64 não suportado)");
  const total = fim.readUInt16LE(eocd + 10);
  const tamanhoDir = fim.readUInt32LE(eocd + 12);
  let p = eocd - tamanhoDir;
  if (p < 0) throw new Error("Diretório central maior que o trecho lido");
  const r: EntradaZip[] = [];
  for (let i = 0; i < total; i++) {
    if (fim.readUInt32LE(p) !== 0x02014b50) throw new Error("Diretório central corrompido");
    const metodo = fim.readUInt16LE(p + 10);
    const tamanhoComprimido = fim.readUInt32LE(p + 20);
    const tamanho = fim.readUInt32LE(p + 24);
    const nl = fim.readUInt16LE(p + 28);
    const el = fim.readUInt16LE(p + 30);
    const cl = fim.readUInt16LE(p + 32);
    const deslocamento = fim.readUInt32LE(p + 42);
    r.push({
      nome: fim.subarray(p + 46, p + 46 + nl).toString("latin1"),
      metodo,
      tamanhoComprimido,
      tamanho,
      deslocamento,
    });
    p += 46 + nl + el + cl;
  }
  return r;
}

export async function listarZip(url: string): Promise<EntradaZip[]> {
  const cabeca = await fetchComRetry(url, { accept: "*/*", headers: { Range: "bytes=0-0" } });
  const tamanho = Number(cabeca.headers.get("content-range")?.split("/")[1]);
  await cabeca.arrayBuffer();
  if (!tamanho) throw new Error(`Tamanho desconhecido para ${url}`);
  // 1 MB do fim cobre o diretório central dos arquivos do TSE (dezenas de entradas).
  const inicio = Math.max(0, tamanho - 1_000_000);
  return lerDiretorioCentral(await parcial(url, inicio, tamanho - 1));
}

export async function lerEntradaZip(url: string, e: EntradaZip): Promise<Buffer> {
  const cab = await parcial(url, e.deslocamento, e.deslocamento + 29);
  const inicioDados = e.deslocamento + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  const dados = await parcial(url, inicioDados, inicioDados + e.tamanhoComprimido - 1);
  if (e.metodo === 0) return dados;
  if (e.metodo === 8) return inflateRawSync(dados);
  throw new Error(`Método de compressão ${e.metodo} não suportado (${e.nome})`);
}
