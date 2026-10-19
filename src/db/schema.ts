import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  primaryKey,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// CD = Câmara dos Deputados, SF = Senado Federal
export const casaEnum = pgEnum("casa", ["CD", "SF"]);

// Colunas presentes em todo dado vindo de fonte oficial (DATA-07).
const origem = {
  fonteUrl: text("fonte_url").notNull(),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
};

export const parlamentar = pgTable(
  "parlamentar",
  {
    id: serial("id").primaryKey(),
    casa: casaEnum("casa").notNull(),
    idExterno: text("id_externo").notNull(),
    nome: text("nome").notNull(),
    nomeCompleto: text("nome_completo"),
    partido: text("partido"),
    uf: text("uf"),
    fotoUrl: text("foto_url"),
    email: text("email"),
    emExercicio: boolean("em_exercicio").notNull().default(false),
    ...origem,
  },
  (t) => [
    uniqueIndex("parlamentar_casa_id_externo").on(t.casa, t.idExterno),
    index("parlamentar_nome").on(t.nome),
  ],
);

export const sessao = pgTable(
  "sessao",
  {
    id: serial("id").primaryKey(),
    casa: casaEnum("casa").notNull(),
    idExterno: text("id_externo").notNull(),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    tipo: text("tipo"),
    descricao: text("descricao"),
    ...origem,
  },
  (t) => [uniqueIndex("sessao_casa_id_externo").on(t.casa, t.idExterno), index("sessao_inicio").on(t.inicio)],
);

export const presenca = pgTable(
  "presenca",
  {
    sessaoId: integer("sessao_id").notNull().references(() => sessao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.sessaoId, t.parlamentarId] }), index("presenca_parlamentar").on(t.parlamentarId)],
);

export const votacao = pgTable(
  "votacao",
  {
    id: serial("id").primaryKey(),
    casa: casaEnum("casa").notNull(),
    idExterno: text("id_externo").notNull(),
    data: timestamp("data", { withTimezone: true }).notNull(),
    descricao: text("descricao"),
    proposicao: text("proposicao"), // rótulo legível, ex.: "PL 2552/2019"
    aprovada: boolean("aprovada"),
    ...origem,
  },
  (t) => [uniqueIndex("votacao_casa_id_externo").on(t.casa, t.idExterno), index("votacao_data").on(t.data)],
);

export const voto = pgTable(
  "voto",
  {
    votacaoId: integer("votacao_id").notNull().references(() => votacao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
    voto: text("voto").notNull(), // Sim, Não, Abstenção, Obstrução, Artigo 17...
  },
  (t) => [primaryKey({ columns: [t.votacaoId, t.parlamentarId] }), index("voto_parlamentar").on(t.parlamentarId)],
);

// Orientação de bancada por votação (partidos, blocos e "Governo") — usada em PROF-04.
export const orientacao = pgTable(
  "orientacao",
  {
    votacaoId: integer("votacao_id").notNull().references(() => votacao.id, { onDelete: "cascade" }),
    bancada: text("bancada").notNull(),
    orientacao: text("orientacao").notNull(),
  },
  (t) => [primaryKey({ columns: [t.votacaoId, t.bancada] })],
);

export const proposicao = pgTable(
  "proposicao",
  {
    id: serial("id").primaryKey(),
    casa: casaEnum("casa").notNull(),
    idExterno: text("id_externo").notNull(),
    siglaTipo: text("sigla_tipo").notNull(),
    numero: integer("numero").notNull(),
    ano: integer("ano").notNull(),
    ementa: text("ementa"),
    apresentadaEm: date("apresentada_em"),
    situacao: text("situacao"),
    ...origem,
  },
  (t) => [uniqueIndex("proposicao_casa_id_externo").on(t.casa, t.idExterno)],
);

export const autoria = pgTable(
  "autoria",
  {
    proposicaoId: integer("proposicao_id").notNull().references(() => proposicao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.proposicaoId, t.parlamentarId] }), index("autoria_parlamentar").on(t.parlamentarId)],
);

export const despesa = pgTable(
  "despesa",
  {
    id: serial("id").primaryKey(),
    casa: casaEnum("casa").notNull(),
    // As fontes não têm um id estável para todo registro; usamos um hash dos campos.
    chave: text("chave").notNull(),
    parlamentarId: integer("parlamentar_id").notNull().references(() => parlamentar.id, { onDelete: "cascade" }),
    ano: integer("ano").notNull(),
    mes: integer("mes").notNull(),
    data: date("data"),
    categoria: text("categoria").notNull(),
    fornecedor: text("fornecedor"),
    cnpjCpf: text("cnpj_cpf"),
    valor: numeric("valor", { precision: 12, scale: 2 }).notNull(),
    documentoUrl: text("documento_url"),
    ...origem,
  },
  (t) => [
    uniqueIndex("despesa_casa_chave").on(t.casa, t.chave),
    index("despesa_parlamentar_ano_mes").on(t.parlamentarId, t.ano, t.mes),
  ],
);

export const ingestaoLog = pgTable("ingestao_log", {
  id: serial("id").primaryKey(),
  tarefa: text("tarefa").notNull(),
  iniciadoEm: timestamp("iniciado_em", { withTimezone: true }).notNull().defaultNow(),
  finalizadoEm: timestamp("finalizado_em", { withTimezone: true }),
  status: text("status").notNull(), // ok | erro
  registros: integer("registros"),
  erro: text("erro"),
});
