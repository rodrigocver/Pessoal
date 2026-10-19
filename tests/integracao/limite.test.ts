import { beforeAll, describe, expect, it } from "vitest";
import { db, schema, sql } from "@/db/client";
import { dentroDoLimite, normalizarEmail } from "@/lib/limite";
import { prepararBanco } from "./dados";

beforeAll(async () => {
  await prepararBanco();
  await db.delete(schema.tentativaLogin);
  return () => sql.end();
});

describe("limite de pedidos de login", () => {
  it("permite até o máximo e recusa o seguinte", async () => {
    const limite = { maximo: 3, minutos: 15 };
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await dentroDoLimite("email:a@b.com", limite));
    expect(r).toEqual([true, true, true, false]);
    // Outro e-mail não é afetado.
    expect(await dentroDoLimite("email:c@d.com", limite)).toBe(true);
  });

  it("libera quando as tentativas saem da janela", async () => {
    await db.insert(schema.tentativaLogin).values([
      { chave: "ip:9.9.9.9", criadoEm: new Date(Date.now() - 20 * 60_000) },
      { chave: "ip:9.9.9.9", criadoEm: new Date(Date.now() - 20 * 60_000) },
    ]);
    expect(await dentroDoLimite("ip:9.9.9.9", { maximo: 2, minutos: 15 })).toBe(true);
  });

  it("normaliza o e-mail", () => {
    expect(normalizarEmail("  Fulano@Exemplo.COM ")).toBe("fulano@exemplo.com");
  });
});
