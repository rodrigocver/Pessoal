import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { inflateRawSync } from "node:zlib";
import { lerDiretorioCentral } from "@/ingest/zipRemoto";

describe("lerDiretorioCentral", () => {
  it("lista entradas e permite extrair cada uma pelo deslocamento", () => {
    const zip = Buffer.from(
      zipSync({ "receitas_AC.csv": strToU8("a;b\n1;2\n".repeat(50)), "leiame.pdf": strToU8("x") }, { level: 6 }),
    );
    const entradas = lerDiretorioCentral(zip);
    expect(entradas.map((e) => e.nome)).toEqual(["receitas_AC.csv", "leiame.pdf"]);
    const e = entradas[0];
    const inicio = e.deslocamento + 30 + zip.readUInt16LE(e.deslocamento + 26) + zip.readUInt16LE(e.deslocamento + 28);
    const conteudo = inflateRawSync(zip.subarray(inicio, inicio + e.tamanhoComprimido)).toString();
    expect(conteudo.startsWith("a;b\n1;2\n")).toBe(true);
    expect(conteudo.length).toBe(e.tamanho);
  });
});
