CREATE TYPE "public"."casa" AS ENUM('CD', 'SF');--> statement-breakpoint
CREATE TABLE "autoria" (
	"proposicao_id" integer NOT NULL,
	"parlamentar_id" integer NOT NULL,
	CONSTRAINT "autoria_proposicao_id_parlamentar_id_pk" PRIMARY KEY("proposicao_id","parlamentar_id")
);
--> statement-breakpoint
CREATE TABLE "despesa" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"chave" text NOT NULL,
	"parlamentar_id" integer NOT NULL,
	"ano" integer NOT NULL,
	"mes" integer NOT NULL,
	"data" date,
	"categoria" text NOT NULL,
	"fornecedor" text,
	"cnpj_cpf" text,
	"valor" numeric(12, 2) NOT NULL,
	"documento_url" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestao_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"tarefa" text NOT NULL,
	"iniciado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"finalizado_em" timestamp with time zone,
	"status" text NOT NULL,
	"registros" integer,
	"erro" text
);
--> statement-breakpoint
CREATE TABLE "orientacao" (
	"votacao_id" integer NOT NULL,
	"bancada" text NOT NULL,
	"orientacao" text NOT NULL,
	CONSTRAINT "orientacao_votacao_id_bancada_pk" PRIMARY KEY("votacao_id","bancada")
);
--> statement-breakpoint
CREATE TABLE "parlamentar" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"nome" text NOT NULL,
	"nome_completo" text,
	"partido" text,
	"uf" text,
	"foto_url" text,
	"email" text,
	"em_exercicio" boolean DEFAULT false NOT NULL,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presenca" (
	"sessao_id" integer NOT NULL,
	"parlamentar_id" integer NOT NULL,
	CONSTRAINT "presenca_sessao_id_parlamentar_id_pk" PRIMARY KEY("sessao_id","parlamentar_id")
);
--> statement-breakpoint
CREATE TABLE "proposicao" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"sigla_tipo" text NOT NULL,
	"numero" integer NOT NULL,
	"ano" integer NOT NULL,
	"ementa" text,
	"apresentada_em" date,
	"situacao" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessao" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"tipo" text,
	"descricao" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"data" timestamp with time zone NOT NULL,
	"descricao" text,
	"proposicao" text,
	"aprovada" boolean,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voto" (
	"votacao_id" integer NOT NULL,
	"parlamentar_id" integer NOT NULL,
	"voto" text NOT NULL,
	CONSTRAINT "voto_votacao_id_parlamentar_id_pk" PRIMARY KEY("votacao_id","parlamentar_id")
);
--> statement-breakpoint
ALTER TABLE "autoria" ADD CONSTRAINT "autoria_proposicao_id_proposicao_id_fk" FOREIGN KEY ("proposicao_id") REFERENCES "public"."proposicao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autoria" ADD CONSTRAINT "autoria_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orientacao" ADD CONSTRAINT "orientacao_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_sessao_id_sessao_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voto" ADD CONSTRAINT "voto_votacao_id_votacao_id_fk" FOREIGN KEY ("votacao_id") REFERENCES "public"."votacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voto" ADD CONSTRAINT "voto_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "autoria_parlamentar" ON "autoria" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "despesa_casa_chave" ON "despesa" USING btree ("casa","chave");--> statement-breakpoint
CREATE INDEX "despesa_parlamentar_ano_mes" ON "despesa" USING btree ("parlamentar_id","ano","mes");--> statement-breakpoint
CREATE UNIQUE INDEX "parlamentar_casa_id_externo" ON "parlamentar" USING btree ("casa","id_externo");--> statement-breakpoint
CREATE INDEX "parlamentar_nome" ON "parlamentar" USING btree ("nome");--> statement-breakpoint
CREATE INDEX "presenca_parlamentar" ON "presenca" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proposicao_casa_id_externo" ON "proposicao" USING btree ("casa","id_externo");--> statement-breakpoint
CREATE UNIQUE INDEX "sessao_casa_id_externo" ON "sessao" USING btree ("casa","id_externo");--> statement-breakpoint
CREATE INDEX "sessao_inicio" ON "sessao" USING btree ("inicio");--> statement-breakpoint
CREATE UNIQUE INDEX "votacao_casa_id_externo" ON "votacao" USING btree ("casa","id_externo");--> statement-breakpoint
CREATE INDEX "votacao_data" ON "votacao" USING btree ("data");--> statement-breakpoint
CREATE INDEX "voto_parlamentar" ON "voto" USING btree ("parlamentar_id");