import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, schema } from "@/db/client";

const t = (s: string) => new Date(`${s}-03:00`);
const fonteUrl = "teste";

/** Cria as tabelas (migrações reais do projeto) e zera os dados. */
export async function prepararBanco() {
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.execute(sql`
    truncate parlamentar, sessao, votacao, proposicao, despesa, estatistica, ingestao_log, "user" restart identity cascade`);
}

/**
 * Cenário pequeno e conhecido, em 2025:
 * - Ana (CD, PT, titular o ano todo), Beto (CD, PL, suplente em exercício só de 01/03 a 31/05),
 *   Carla (SF, MDB, sem histórico de exercício: usa a aproximação pela atividade).
 * - 5 sessões da Câmara: 3 com presença publicada, 1 do Congresso sem presença, 1 futura.
 */
export async function criarCenario() {
  const [ana, beto, carla] = await db
    .insert(schema.parlamentar)
    .values([
      {
        casa: "CD",
        idExterno: "1",
        nome: "Ana Souza",
        nomeCompleto: "Ana Maria Souza",
        partido: "PT",
        uf: "SP",
        emExercicio: true,
        fonteUrl,
      },
      {
        casa: "CD",
        idExterno: "2",
        nome: "Beto Lima",
        nomeCompleto: "José Roberto Lima",
        partido: "PL",
        uf: "RJ",
        emExercicio: false,
        fonteUrl,
      },
      { casa: "SF", idExterno: "3", nome: "Carla Dias", partido: "MDB", uf: "MG", emExercicio: true, fonteUrl },
    ])
    .returning();

  await db.insert(schema.exercicio).values([
    { parlamentarId: ana.id, inicio: t("2023-02-01T12:00:00"), fim: null, fonteUrl },
    { parlamentarId: beto.id, inicio: t("2025-03-01T00:00:00"), fim: t("2025-06-01T00:00:00"), fonteUrl },
  ]);

  const sessoes = await db
    .insert(schema.sessao)
    .values([
      { casa: "CD", idExterno: "s1", inicio: t("2025-02-10T14:00:00"), fonteUrl }, // só Ana em exercício
      { casa: "CD", idExterno: "s2", inicio: t("2025-04-08T14:00:00"), fonteUrl }, // Ana e Beto
      { casa: "CD", idExterno: "s3", inicio: t("2025-05-20T14:00:00"), fonteUrl }, // Ana e Beto
      { casa: "CD", idExterno: "cn", inicio: t("2025-06-17T14:00:00"), descricao: "Sessão do Congresso", fonteUrl },
      { casa: "CD", idExterno: "futura", inicio: t("2099-01-01T14:00:00"), fonteUrl },
      { casa: "SF", idExterno: "f1", inicio: t("2025-03-11T12:00:00"), fonteUrl },
      { casa: "SF", idExterno: "f2", inicio: t("2025-09-02T12:00:00"), fonteUrl },
    ])
    .returning();
  const s = Object.fromEntries(sessoes.map((x) => [x.idExterno, x.id]));

  // Ana: presente em s1 e s3 (falta em s2). Beto: presente em s2 (falta em s3). Carla: f1 e f2.
  await db.insert(schema.presenca).values([
    { sessaoId: s.s1, parlamentarId: ana.id },
    { sessaoId: s.s3, parlamentarId: ana.id },
    { sessaoId: s.s2, parlamentarId: beto.id },
    { sessaoId: s.f1, parlamentarId: carla.id },
    { sessaoId: s.f2, parlamentarId: carla.id },
  ]);

  const [v1, v2] = await db
    .insert(schema.votacao)
    .values([
      { casa: "CD", idExterno: "v1", data: t("2025-04-08T16:00:00"), proposicao: "PL 1/2025", fonteUrl },
      { casa: "CD", idExterno: "v2", data: t("2025-05-20T16:00:00"), proposicao: "PEC 2/2025", fonteUrl },
    ])
    .returning();
  await db.insert(schema.voto).values([
    { votacaoId: v1.id, parlamentarId: ana.id, voto: "Sim", partido: "PT" },
    { votacaoId: v2.id, parlamentarId: ana.id, voto: "Não", partido: "PT" },
    { votacaoId: v1.id, parlamentarId: beto.id, voto: "Não", partido: "PL" },
  ]);
  // v1: PT e Governo Sim, PL Não. v2: federação do PT orienta Sim, Governo Liberado (não conta).
  await db.insert(schema.orientacao).values([
    { votacaoId: v1.id, bancada: "PT", orientacao: "Sim" },
    { votacaoId: v1.id, bancada: "PL", orientacao: "Não" },
    { votacaoId: v1.id, bancada: "Governo", orientacao: "Sim" },
    { votacaoId: v2.id, bancada: "Fdr PT-PCdoB-PV", orientacao: "Sim" },
    { votacaoId: v2.id, bancada: "Governo", orientacao: "Liberado" },
  ]);

  await db.insert(schema.despesa).values([
    {
      casa: "CD",
      chave: "d1",
      parlamentarId: ana.id,
      ano: 2025,
      mes: 3,
      categoria: "TELEFONIA",
      valor: "100.50",
      fonteUrl,
    },
    {
      casa: "CD",
      chave: "d2",
      parlamentarId: ana.id,
      ano: 2025,
      mes: 4,
      categoria: "COMBUSTÍVEIS",
      valor: "200.00",
      fonteUrl,
    },
    {
      casa: "CD",
      chave: "d3",
      parlamentarId: ana.id,
      ano: 2024,
      mes: 12,
      categoria: "TELEFONIA",
      valor: "999.00",
      fonteUrl,
    },
  ]);

  return { ana, beto, carla };
}
