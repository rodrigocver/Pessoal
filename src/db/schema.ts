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
  (t) => [uniqueIndex("parlamentar_casa_id_externo").on(t.casa, t.idExterno), index("parlamentar_nome").on(t.nome)],
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
    sessaoId: integer("sessao_id")
      .notNull()
      .references(() => sessao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
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
    ementa: text("ementa"), // ementa da matéria votada
    aprovada: boolean("aprovada"),
    ...origem,
  },
  (t) => [uniqueIndex("votacao_casa_id_externo").on(t.casa, t.idExterno), index("votacao_data").on(t.data)],
);

export const voto = pgTable(
  "voto",
  {
    votacaoId: integer("votacao_id")
      .notNull()
      .references(() => votacao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
    voto: text("voto").notNull(), // Sim, Não, Abstenção, Obstrução, Artigo 17...
    partido: text("partido"), // partido na data do voto — base do alinhamento partidário
  },
  (t) => [primaryKey({ columns: [t.votacaoId, t.parlamentarId] }), index("voto_parlamentar").on(t.parlamentarId)],
);

// Orientação de bancada por votação (partidos, blocos e "Governo") — usada em PROF-04.
export const orientacao = pgTable(
  "orientacao",
  {
    votacaoId: integer("votacao_id")
      .notNull()
      .references(() => votacao.id, { onDelete: "cascade" }),
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
    proposicaoId: integer("proposicao_id")
      .notNull()
      .references(() => proposicao.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
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
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
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

/**
 * Métricas pré-calculadas por parlamentar e período ("2025", "legislatura"), recalculadas após a ingestão.
 * Permitem comparar com a média da casa e do partido sem varrer tudo a cada página.
 */
export const estatistica = pgTable(
  "estatistica",
  {
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
    periodo: text("periodo").notNull(),
    sessoes: integer("sessoes").notNull(),
    presencas: integer("presencas").notNull(),
    votos: integer("votos").notNull(),
    gastos: numeric("gastos", { precision: 14, scale: 2 }).notNull(),
    proposicoes: integer("proposicoes").notNull(),
    alinhPartidoIguais: integer("alinh_partido_iguais").notNull(),
    alinhPartidoTotal: integer("alinh_partido_total").notNull(),
    alinhGovernoIguais: integer("alinh_governo_iguais").notNull(),
    alinhGovernoTotal: integer("alinh_governo_total").notNull(),
    calculadoEm: timestamp("calculado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.parlamentarId, t.periodo] })],
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

// ---------- Usuários (tabelas no formato do Auth.js) ----------

export const usuario = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // Resumo mensal por e-mail (MAIL-02). O token permite descadastrar sem login.
  resumoMensal: boolean("resumo_mensal").notNull().default(true),
  tokenDescadastro: text("token_descadastro")
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const conta = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessaoUsuario = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const tokenVerificacao = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** Parlamentares que cada usuário acompanha (LIST-02). */
export const seguindo = pgTable(
  "seguindo",
  {
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    parlamentarId: integer("parlamentar_id")
      .notNull()
      .references(() => parlamentar.id, { onDelete: "cascade" }),
    desde: timestamp("desde", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.parlamentarId] })],
);

/** Resumos mensais já enviados — impede envio duplicado se o job rodar de novo. */
export const envioResumo = pgTable(
  "envio_resumo",
  {
    usuarioId: text("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    mes: text("mes").notNull(), // "2026-09"
    enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.usuarioId, t.mes] })],
);
