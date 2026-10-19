CREATE TABLE "membro_orgao" (
	"parlamentar_id" integer NOT NULL,
	"orgao_id" integer NOT NULL,
	"cargo" text NOT NULL,
	"inicio" date NOT NULL,
	"fim" date,
	CONSTRAINT "membro_orgao_parlamentar_id_orgao_id_cargo_inicio_pk" PRIMARY KEY("parlamentar_id","orgao_id","cargo","inicio")
);
--> statement-breakpoint
CREATE TABLE "orgao" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"sigla" text NOT NULL,
	"nome" text NOT NULL,
	"tipo" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presenca_reuniao" (
	"reuniao_id" integer NOT NULL,
	"parlamentar_id" integer NOT NULL,
	CONSTRAINT "presenca_reuniao_reuniao_id_parlamentar_id_pk" PRIMARY KEY("reuniao_id","parlamentar_id")
);
--> statement-breakpoint
CREATE TABLE "relatoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"parlamentar_id" integer NOT NULL,
	"proposicao" text NOT NULL,
	"proposicao_ref" text NOT NULL,
	"ementa" text,
	"colegiado" text NOT NULL,
	"tipo_relator" text,
	"designacao" timestamp with time zone NOT NULL,
	"destituicao" timestamp with time zone,
	"motivo_fim" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reuniao" (
	"id" serial PRIMARY KEY NOT NULL,
	"casa" "casa" NOT NULL,
	"id_externo" text NOT NULL,
	"orgao_id" integer NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "estatistica" ADD COLUMN "comissao_reunioes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "estatistica" ADD COLUMN "comissao_presencas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "membro_orgao" ADD CONSTRAINT "membro_orgao_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membro_orgao" ADD CONSTRAINT "membro_orgao_orgao_id_orgao_id_fk" FOREIGN KEY ("orgao_id") REFERENCES "public"."orgao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca_reuniao" ADD CONSTRAINT "presenca_reuniao_reuniao_id_reuniao_id_fk" FOREIGN KEY ("reuniao_id") REFERENCES "public"."reuniao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca_reuniao" ADD CONSTRAINT "presenca_reuniao_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relatoria" ADD CONSTRAINT "relatoria_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reuniao" ADD CONSTRAINT "reuniao_orgao_id_orgao_id_fk" FOREIGN KEY ("orgao_id") REFERENCES "public"."orgao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "membro_orgao_orgao" ON "membro_orgao" USING btree ("orgao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orgao_casa_id_externo" ON "orgao" USING btree ("casa","id_externo");--> statement-breakpoint
CREATE INDEX "presenca_reuniao_parlamentar" ON "presenca_reuniao" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "relatoria_unica" ON "relatoria" USING btree ("casa","parlamentar_id","proposicao_ref","colegiado","designacao");--> statement-breakpoint
CREATE INDEX "relatoria_parlamentar" ON "relatoria" USING btree ("parlamentar_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reuniao_casa_id_externo_orgao" ON "reuniao" USING btree ("casa","id_externo","orgao_id");--> statement-breakpoint
CREATE INDEX "reuniao_orgao_inicio" ON "reuniao" USING btree ("orgao_id","inicio");